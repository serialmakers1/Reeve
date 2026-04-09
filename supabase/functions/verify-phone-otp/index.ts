const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

// +91 followed by exactly 10 digits
const PHONE_REGEX = /^\+91\d{10}$/;
// Supabase OTPs are 6 digits; accept 4–8 to be safe
const TOKEN_REGEX = /^\d{4,8}$/;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
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

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "apikey": anonKey,
      },
    });

    if (userRes.status !== 200) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userJson = await userRes.json();
    const userId: string | undefined = userJson?.id;
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── 2. Parse and validate body ────────────────────────────────────────────
    let body: { phone?: string; token?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const phone = body?.phone ?? "";
    const otp = body?.token ?? "";

    if (!phone || !otp) {
      return json({ error: "Missing phone or token" }, 400);
    }
    if (!PHONE_REGEX.test(phone)) {
      return json({ error: "Invalid phone format — expected +91XXXXXXXXXX" }, 400);
    }
    if (!TOKEN_REGEX.test(otp)) {
      return json({ error: "Invalid token format" }, 400);
    }

    // ── 3. Verify OTP via Supabase Auth ───────────────────────────────────────
    // Returns a phone-session on success — we discard it, never forward to client.
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, token: otp, type: "sms" }),
    });

    if (!verifyRes.ok) {
      const verifyErr = await verifyRes.json().catch(() => ({}));
      const msg = verifyErr?.msg || verifyErr?.message || "Invalid or expired OTP";
      return json({ error: msg }, 400);
    }
    // Phone OTP confirmed valid — phone-session discarded here.

    // ── 4. Link phone to the original user via Admin API ──────────────────────
    // PATCH sets phone + phone_confirm: true on the Google OAuth user without
    // touching their session.
    const patchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, phone_confirm: true }),
    });

    if (!patchRes.ok) {
      const patchErr = await patchRes.json().catch(() => ({}));
      const msg = patchErr?.message || "Failed to link phone to user";
      return json({ error: msg }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return json({ error }, 500);
  }
});
