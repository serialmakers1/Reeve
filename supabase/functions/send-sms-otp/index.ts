import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

// ── In-memory rate limiter (fixed-window, per-instance) ───────────────────────
// NOTE: in-memory state is not shared across edge function instances.
// This is intentional — provides per-instance protection against burst abuse.
// Supabase Auth also applies its own OTP frequency limit (set to 120s in dashboard).

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const phoneRateMap = new Map<string, RateLimitEntry>();
const ipRateMap = new Map<string, RateLimitEntry>();

function checkRateLimit(map: Map<string, RateLimitEntry>, key: string): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now >= entry.resetAt) {
    // New window — allow and record
    map.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false; // not limited
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return true; // rate limited — do not increment
  }
  entry.count += 1;
  return false; // allowed
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // A) Read raw body as text first — signature verification requires raw bytes.
  // req.text() consumes the stream; all subsequent parsing uses rawBody directly.
  const rawBody = await req.text();

  // B) Verify webhook signature — must happen before any payload processing
  const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  if (!hookSecret) {
    console.error("HOOK_CONFIG_ERROR | SEND_SMS_HOOK_SECRET is not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Strip "v1,whsec_" prefix — Webhook constructor expects the raw base64 string,
    // not decoded bytes. It handles decoding internally.
    const secret = hookSecret.replace("v1,whsec_", "");
    const wh = new Webhook(secret);
    wh.verify(rawBody, {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`HOOK_SIGNATURE_INVALID | error=${error}`);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // C) Parse verified payload
    // Shape: { user: { phone: string }, sms: { otp: string } }
    const payload = JSON.parse(rawBody) as {
      user: { phone: string };
      sms: { otp: string };
    };

    const rawPhone: string = payload?.user?.phone ?? "";
    const otp: string = payload?.sms?.otp ?? "";

    if (!rawPhone || !otp) {
      // Malformed payload — log and return 200 to avoid infinite Supabase retries
      console.error("MSG91_FAILURE | malformed_payload | missing phone or otp");
      return new Response(null, { status: 200 });
    }

    // D) Strip leading + so MSG91 receives E.164 without the plus
    // e.g. +919876543210 → 919876543210
    const mobile = rawPhone.startsWith("+") ? rawPhone.slice(1) : rawPhone;
    const phoneSuffix = mobile.slice(-4);

    // E) Extract client IP for rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    // F) Rate limit — per phone number (5 per hour)
    if (checkRateLimit(phoneRateMap, mobile)) {
      console.warn(`MSG91_RATE_LIMIT | phone_suffix=${phoneSuffix} | type=phone`);
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // G) Rate limit — per IP (5 per hour)
    if (checkRateLimit(ipRateMap, ip)) {
      console.warn(`MSG91_RATE_LIMIT | ip=${ip} | type=ip`);
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // H) Call MSG91 OTP API
    const msg91Res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "authkey": Deno.env.get("MSG91_AUTH_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: Deno.env.get("MSG91_TEMPLATE_ID")!,
        mobile,
        otp,
      }),
    });

    // I) Handle MSG91 failure — log but return 200 to prevent infinite Supabase retries
    if (!msg91Res.ok) {
      const body = await msg91Res.text();
      console.error(
        `MSG91_FAILURE | phone_suffix=${phoneSuffix} | status=${msg91Res.status} | body=${body}`,
      );
      return new Response(null, { status: 200 });
    }

    // J) Success — empty body (Supabase hook requirement: must be exactly empty, not {})
    return new Response(null, { status: 200 });
  } catch (err) {
    // K) Catch-all — log and return 200 to prevent infinite Supabase retries
    const error = err instanceof Error ? err.message : String(err);
    console.error(`MSG91_FAILURE | unexpected_error=${error}`);
    return new Response(null, { status: 200 });
  }
});
