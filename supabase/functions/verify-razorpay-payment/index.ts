const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Verify Razorpay HMAC-SHA256 signature using Web Crypto API (built into Deno).
// rawBody must be the original request body string — do NOT re-serialise JSON.
async function verifySignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const computedHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return computedHex === signature;
}

// Execute a Supabase REST API call with service_role key.
async function supabaseRequest(
  path: string,
  method: string,
  serviceRoleKey: string,
  supabaseUrl: string,
  body?: unknown,
  prefer?: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = {
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers["Prefer"] = prefer;

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { ok: res.ok, status: res.status, data };
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Webhook endpoints only accept POST — no CORS preflight needed
  // (Razorpay calls this server-to-server, not from a browser).
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── 1. Read raw body — MUST happen before any JSON.parse ─────────────────
  // HMAC must be computed on the original raw bytes, not re-serialised JSON.
  const rawBody = await req.text();

  // ── 2. Signature verification — first operation after body read ───────────
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

  if (!signature) {
    console.error("SIGNATURE_MISSING");
    return jsonResponse({ error: "Missing signature" }, 400);
  }

  let signatureValid: boolean;
  try {
    signatureValid = await verifySignature(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("SIGNATURE_VERIFY_ERROR", { error: String(err) });
    return jsonResponse({ error: "Signature verification failed" }, 400);
  }

  if (!signatureValid) {
    console.error("SIGNATURE_MISMATCH");
    return jsonResponse({ error: "Signature mismatch" }, 400);
  }

  // ── 3. Read event-id for idempotency (second layer after UNIQUE constraint) ─
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? SUPABASE_URL;

  // ── 4. Idempotency check — return 200 if event already processed ──────────
  if (eventId) {
    const existing = await supabaseRequest(
      `payments?gateway_response->>razorpay_event_id=eq.${encodeURIComponent(eventId)}&select=id`,
      "GET",
      serviceRoleKey,
      supabaseUrl,
    );
    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0) {
      console.log("EVENT_ALREADY_PROCESSED", { eventId });
      return jsonResponse({ status: "already_processed" }, 200);
    }
  }

  // ── 5. Respond 200 immediately — Razorpay requires response within 5s ─────
  // All DB work runs inside EdgeRuntime.waitUntil() so the response is
  // returned before any DB latency is incurred.
  const immediateResponse = new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  // ── 6. All DB work in waitUntil ───────────────────────────────────────────
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil(
    (async () => {
      try {
        // Parse payload — safe after raw body already captured for HMAC
        let payload: {
          event?: string;
          payload?: {
            payment?: {
              entity?: {
                id?: string;
                order_id?: string;
                error_description?: string;
                error_code?: string;
              };
            };
          };
        };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          console.error("PAYLOAD_PARSE_ERROR", { rawBody: rawBody.slice(0, 200) });
          return;
        }

        const event = payload?.event ?? "";
        const entity = payload?.payload?.payment?.entity;

        // Inject event_id into the stored gateway_response for future idempotency lookups
        const enrichedPayload = { ...payload, razorpay_event_id: eventId };

        console.log("WEBHOOK_EVENT", { event, eventId });

        // ── payment.captured ────────────────────────────────────────────────
        if (event === "payment.captured") {
          const razorpayOrderId = entity?.order_id;
          const razorpayPaymentId = entity?.id;

          if (!razorpayOrderId) {
            console.error("CAPTURED_MISSING_ORDER_ID");
            return;
          }

          console.log("PAYMENT_CAPTURED", { razorpayOrderId, razorpayPaymentId });

          // a. Look up payments row by gateway_reference (= Razorpay order ID)
          const paymentLookup = await supabaseRequest(
            `payments?gateway_reference=eq.${encodeURIComponent(razorpayOrderId)}&select=id,application_id,status`,
            "GET",
            serviceRoleKey,
            supabaseUrl,
          );

          if (!paymentLookup.ok || !Array.isArray(paymentLookup.data) || paymentLookup.data.length === 0) {
            console.warn("CAPTURED_PAYMENT_ROW_NOT_FOUND", { razorpayOrderId });
            return;
          }

          const paymentRow = paymentLookup.data[0] as {
            id: string;
            application_id: string;
            status: string;
          };

          // b. Update payments row — idempotent (AND status != 'success' guard)
          await supabaseRequest(
            `payments?gateway_reference=eq.${encodeURIComponent(razorpayOrderId)}&status=neq.success`,
            "PATCH",
            serviceRoleKey,
            supabaseUrl,
            {
              status: "success",
              paid_at: new Date().toISOString(),
              gateway_response: enrichedPayload,
            },
          );

          console.log("PAYMENT_ROW_UPDATED_SUCCESS", { paymentId: paymentRow.id });

          // c. Validate application status before transitioning
          const appLookup = await supabaseRequest(
            `applications?id=eq.${encodeURIComponent(paymentRow.application_id)}&select=id,status,property_id`,
            "GET",
            serviceRoleKey,
            supabaseUrl,
          );

          if (!appLookup.ok || !Array.isArray(appLookup.data) || appLookup.data.length === 0) {
            console.error("APP_NOT_FOUND", { applicationId: paymentRow.application_id });
            return;
          }

          const appRow = appLookup.data[0] as {
            id: string;
            status: string;
            property_id: string;
          };

          if (appRow.status !== "payment_pending") {
            console.warn("APP_STATUS_SKIP", {
              applicationId: appRow.id,
              status: appRow.status,
              reason: "not payment_pending — skipping transition",
            });
            return;
          }

          // d. Advance application to payment_received — WHERE guard is final safety net
          await supabaseRequest(
            `applications?id=eq.${encodeURIComponent(appRow.id)}&status=eq.payment_pending`,
            "PATCH",
            serviceRoleKey,
            supabaseUrl,
            { status: "payment_received", updated_at: new Date().toISOString() },
          );

          console.log("APP_STATUS_PAYMENT_RECEIVED", { applicationId: appRow.id });

          // e. Put competing payment_pending applications on hold
          await supabaseRequest(
            `applications?property_id=eq.${encodeURIComponent(appRow.property_id)}&status=eq.payment_pending&id=neq.${encodeURIComponent(appRow.id)}`,
            "PATCH",
            serviceRoleKey,
            supabaseUrl,
            { status: "on_hold", updated_at: new Date().toISOString() },
          );

          console.log("COMPETING_APPS_ON_HOLD", { propertyId: appRow.property_id });

        // ── payment.failed ──────────────────────────────────────────────────
        } else if (event === "payment.failed") {
          const razorpayOrderId = entity?.order_id;
          const failureReason = entity?.error_description ?? entity?.error_code ?? "Unknown failure";

          if (!razorpayOrderId) {
            console.error("FAILED_MISSING_ORDER_ID");
            return;
          }

          console.log("PAYMENT_FAILED", { razorpayOrderId, failureReason });

          // a. Look up payments row
          const paymentLookup = await supabaseRequest(
            `payments?gateway_reference=eq.${encodeURIComponent(razorpayOrderId)}&select=id,application_id`,
            "GET",
            serviceRoleKey,
            supabaseUrl,
          );

          if (!paymentLookup.ok || !Array.isArray(paymentLookup.data) || paymentLookup.data.length === 0) {
            console.warn("FAILED_PAYMENT_ROW_NOT_FOUND", { razorpayOrderId });
            return;
          }

          const paymentRow = paymentLookup.data[0] as { id: string; application_id: string };

          // b. Mark payment failed — AND status = 'pending' guard prevents
          //    overwriting a payment.captured event that arrived after this failure
          await supabaseRequest(
            `payments?gateway_reference=eq.${encodeURIComponent(razorpayOrderId)}&status=eq.pending`,
            "PATCH",
            serviceRoleKey,
            supabaseUrl,
            {
              status: "failed",
              failure_reason: failureReason,
              gateway_response: enrichedPayload,
            },
          );

          console.log("PAYMENT_ROW_UPDATED_FAILED", { paymentId: paymentRow.id });

          // c. Reset application to owner_accepted — gives tenant another attempt.
          //    Do NOT set withdrawn — payment failure is not a tenant action.
          await supabaseRequest(
            `applications?id=eq.${encodeURIComponent(paymentRow.application_id)}&status=eq.payment_pending`,
            "PATCH",
            serviceRoleKey,
            supabaseUrl,
            { status: "owner_accepted", updated_at: new Date().toISOString() },
          );

          console.log("APP_STATUS_RESET_TO_OWNER_ACCEPTED", { applicationId: paymentRow.application_id });

        } else {
          // Unhandled event type — log and ignore
          console.log("UNHANDLED_EVENT", { event });
        }

      } catch (err) {
        // Do not re-throw — 200 already sent to Razorpay
        console.error("WAITUNTIL_ERROR", { error: err instanceof Error ? err.message : String(err) });
      }
    })(),
  );

  return immediateResponse;
});
