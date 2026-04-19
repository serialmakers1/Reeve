const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

// Token amount is fixed at ₹5,000 — never derived from rent.
const TOKEN_AMOUNT_PAISE = 500_000;
const TOKEN_AMOUNT_INR = 5000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ── 1. Validate caller JWT ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!bearerToken) {
      return json({ error: "Unauthorized" }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? SUPABASE_URL;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "apikey": anonKey,
      },
    });

    if (userRes.status !== 200) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userData = await userRes.json();
    const userId: string | undefined = userData?.id;
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    console.log("STEP1_JWT_OK", { userId });

    // ── 2. Parse request body ─────────────────────────────────────────────────
    let body: { application_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const applicationId = body?.application_id;
    if (!applicationId || typeof applicationId !== "string") {
      return json({ error: "Missing application_id" }, 400);
    }

    console.log("STEP2_BODY", { applicationId });

    // ── 3. Validate application ownership and status ───────────────────────────
    // Use service_role so RLS does not interfere with the lookup.
    const appRes = await fetch(
      `${supabaseUrl}/rest/v1/applications?id=eq.${applicationId}&select=id,tenant_id,status`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!appRes.ok) {
      console.error("STEP3_APP_FETCH_ERROR", { status: appRes.status });
      return json({ error: "Failed to fetch application" }, 500);
    }

    const apps: Array<{ id: string; tenant_id: string; status: string }> = await appRes.json();
    const app = apps?.[0];

    if (!app) {
      return json({ error: "Application not found", code: "NOT_FOUND" }, 403);
    }
    if (app.tenant_id !== userId) {
      console.warn("STEP3_OWNERSHIP_FAIL", { appTenantId: app.tenant_id, userId });
      return json({ error: "Forbidden: not your application", code: "OWNERSHIP" }, 403);
    }
    if (app.status !== "owner_accepted") {
      console.warn("STEP3_STATUS_FAIL", { status: app.status });
      return json({ error: `Application status is '${app.status}', expected 'owner_accepted'`, code: "STATUS" }, 403);
    }

    console.log("STEP3_APP_OK", { applicationId, status: app.status });

    // ── 4. Idempotency — return existing pending order if one exists ───────────
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/payments?application_id=eq.${applicationId}&payment_type=eq.token_deposit&status=eq.pending&select=gateway_reference`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (existingRes.ok) {
      const existing: Array<{ gateway_reference: string | null }> = await existingRes.json();
      const existingPayment = existing?.[0];
      if (existingPayment?.gateway_reference) {
        console.log("STEP4_EXISTING_ORDER", { orderId: existingPayment.gateway_reference });
        return json({
          order_id: existingPayment.gateway_reference,
          amount: TOKEN_AMOUNT_PAISE,
          key_id: razorpayKeyId,
        }, 200);
      }
    }

    // ── 5. Create Razorpay order via native fetch ─────────────────────────────
    // Native fetch is used instead of the npm SDK to avoid Node-style http
    // module edge cases in Deno 2.x.
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${razorpayAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: TOKEN_AMOUNT_PAISE,
        currency: "INR",
        receipt: applicationId,
        checkout_config_id: "config_SfHzUgldMePgt1",
      }),
    });

    if (!rzpRes.ok) {
      const rzpError = await rzpRes.text();
      console.error("STEP5_RAZORPAY_ERROR", { status: rzpRes.status, body: rzpError });
      return json({ error: "Payment gateway error", details: rzpError }, 502);
    }

    const rzpOrder = await rzpRes.json();
    console.log("STEP5_ORDER_CREATED", { orderId: rzpOrder.id });

    // ── 6. Insert payments row ────────────────────────────────────────────────
    // ON CONFLICT (gateway_reference) DO NOTHING guards against the race where
    // two concurrent requests both reach this point with the same order ID.
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/payments`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        application_id: applicationId,
        payer_id: userId,
        payment_type: "token_deposit",
        method: "upi",
        status: "pending",
        amount: TOKEN_AMOUNT_INR,
        currency: "INR",
        gateway_reference: rzpOrder.id,
        gateway_response: rzpOrder,
      }),
    });

    if (!insertRes.ok) {
      const insertErr = await insertRes.text();
      console.error("STEP6_INSERT_ERROR", { status: insertRes.status, body: insertErr });
      // Non-fatal if the row already exists — proceed to status update.
      // Fatal only on unexpected errors.
      if (insertRes.status !== 409) {
        return json({ error: "Failed to record payment", details: insertErr }, 500);
      }
    }

    console.log("STEP6_PAYMENT_INSERTED");

    // ── 7. Advance application status to payment_pending ──────────────────────
    // WHERE guard on status = 'owner_accepted' prevents overwriting a status
    // that moved on between our check (step 3) and this update.
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/applications?id=eq.${applicationId}&status=eq.owner_accepted`,
      {
        method: "PATCH",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "payment_pending" }),
      },
    );

    if (!updateRes.ok) {
      const updateErr = await updateRes.text();
      console.error("STEP7_STATUS_UPDATE_ERROR", { status: updateRes.status, body: updateErr });
      // Order is created and payment row is inserted — return success anyway.
      // The status will be corrected by the webhook handler on payment completion.
    } else {
      console.log("STEP7_STATUS_UPDATED_TO_PAYMENT_PENDING");
    }

    // ── 8. Return order details to frontend ───────────────────────────────────
    return json({
      order_id: rzpOrder.id,
      amount: TOKEN_AMOUNT_PAISE,
      key_id: razorpayKeyId,
    }, 200);

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("UNHANDLED_ERROR", { error });
    return json({ error: "Internal server error" }, 500);
  }
});
