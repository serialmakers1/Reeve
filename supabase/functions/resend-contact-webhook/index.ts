// Phase 3 Prompt 2 — resend-contact-webhook
// Resend webhook receiver. Verifies Svix signature, then writes one email_send_log
// row per delivery event (delivered / bounced / complained / etc.).
//
// ALWAYS returns 200 on valid signature — Resend retries any non-2xx response,
// so 4xx/5xx from a legitimate delivery event would create duplicate log rows.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// Timing-safe equality on two equal-length byte arrays.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Svix / Resend signature verification.
// Signed payload = "{svix-id}.{svix-timestamp}.{body}", HMAC-SHA256 with the
// secret bytes (secret comes as `whsec_<base64>` — strip prefix, then decode).
async function verifySvixSignature(opts: {
  secret: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string; // e.g. "v1,base64sig v1,base64sig2"
  body: string;
}): Promise<boolean> {
  const secretRaw = opts.secret.startsWith("whsec_") ? opts.secret.slice(6) : opts.secret;
  let secretBytes: Uint8Array;
  try {
    secretBytes = base64ToBytes(secretRaw);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const toSign = `${opts.svixId}.${opts.svixTimestamp}.${opts.body}`;
  const sigBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign)));
  const expectedB64 = bytesToBase64(sigBytes);
  const expectedBytes = new TextEncoder().encode(expectedB64);

  // Header may contain multiple space-separated "v1,<sig>" tuples.
  const tuples = opts.svixSignature.split(" ").filter(Boolean);
  for (const t of tuples) {
    const [version, sig] = t.split(",");
    if (version !== "v1" || !sig) continue;
    const provided = new TextEncoder().encode(sig);
    if (timingSafeEqual(provided, expectedBytes)) return true;
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const svixId = req.headers.get("svix-id") ?? "";
    const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
    const svixSignature = req.headers.get("svix-signature") ?? "";
    const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

    // Read raw body once — signature verification and JSON parse both need it.
    const rawBody = await req.text();

    if (!svixId || !svixTimestamp || !svixSignature || !secret) {
      console.warn("WEBHOOK_MISSING_HEADERS_OR_SECRET");
      return json({ error: "Unauthorized" }, 401);
    }

    const sigOk = await verifySvixSignature({
      secret,
      svixId,
      svixTimestamp,
      svixSignature,
      body: rawBody,
    });
    if (!sigOk) {
      console.warn("WEBHOOK_SIGNATURE_INVALID", { svixId });
      return json({ error: "Unauthorized" }, 401);
    }

    // Parse payload
    let payload: {
      type?: string;
      data?: {
        email_id?: string;
        to?: string[];
        reason?: string;
        [k: string]: unknown;
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("WEBHOOK_BODY_UNPARSEABLE");
      return json({ received: true }, 200); // signature was valid — never 4xx here
    }

    const eventType = payload?.type ?? "unknown";
    const resendMessageId = payload?.data?.email_id ?? null;
    const recipientEmail = payload?.data?.to?.[0] ?? null;
    const errorReason = (["email.bounced", "email.complained", "email.failed"].includes(eventType) ? (payload?.data?.reason ?? null) : null) as string | null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const srHeaders = { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` };

    // Lookup contact_request_id + recipient_user_id from the original send row
    let contactRequestId: string | null = null;
    let recipientUserId: string | null = null;
    if (resendMessageId) {
      const lookupRes = await fetch(
        `${supabaseUrl}/rest/v1/email_send_log?resend_message_id=eq.${encodeURIComponent(resendMessageId)}&select=contact_request_id,recipient_user_id&order=created_at.asc&limit=1`,
        { headers: srHeaders },
      );
      if (lookupRes.ok) {
        const rows: Array<{ contact_request_id: string | null; recipient_user_id: string | null }> = await lookupRes.json();
        contactRequestId = rows?.[0]?.contact_request_id ?? null;
        recipientUserId = rows?.[0]?.recipient_user_id ?? null;
      }
    }

    // INSERT the event row — always, orphan or not
    await fetch(`${supabaseUrl}/rest/v1/email_send_log`, {
      method: "POST",
      headers: { ...srHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_request_id: contactRequestId,
        resend_message_id: resendMessageId,
        event_type: eventType,
        recipient_user_id: recipientUserId,
        recipient_email: recipientEmail,
        error_reason: errorReason,
        raw_payload: payload,
      }),
    }).catch((err) => console.error("WEBHOOK_LOG_INSERT_ERROR", { error: String(err) }));

    return json({ received: true }, 200);

  } catch (err) {
    // Even on unhandled errors: signature was already validated above.
    // Return 200 so Resend does not retry-storm us.
    console.error("UNHANDLED_ERROR", { error: err instanceof Error ? err.message : String(err) });
    return json({ received: true }, 200);
  }
});
