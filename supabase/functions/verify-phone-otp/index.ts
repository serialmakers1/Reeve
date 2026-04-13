const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

// +91 followed by exactly 10 digits
const PHONE_REGEX = /^\+91\d{10}$/;
// Supabase OTPs are 6 digits; accept 4–8 to be safe
const TOKEN_REGEX = /^\d{4,8}$/;

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
  // Handle CORS preflight
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

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "apikey": anonKey,
      },
    });

    const userData = await userRes.json();

    if (userRes.status !== 200) {
      return json({ error: "Unauthorized" }, 401);
    }

    const googleUserId: string | undefined = userData?.id;
    if (!googleUserId) {
      return json({ error: "Unauthorized" }, 401);
    }

    console.log('STEP1_JWT_OK', { googleUserId });

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

    console.log('STEP2_BODY', { phone, otp: otp.substring(0, 2) + '****' });

    // ── 3. Verify OTP via Supabase Auth ───────────────────────────────────────
    // Returns a session for the phone-only user — extract their ID for cleanup,
    // then discard the session entirely (never forwarded to client).
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, token: otp, type: "sms" }),
    });

    const verifyBody = await verifyRes.text();
    console.log('STEP3_VERIFY', {
      status: verifyRes.status,
      body: verifyBody.substring(0, 200),
    });

    if (!verifyRes.ok) {
      const verifyErr = JSON.parse(verifyBody) ?? {};
      const msg = verifyErr?.msg || verifyErr?.message || "Invalid or expired OTP";
      return json({ error: msg }, 400);
    }

    const verifyData = (() => { try { return JSON.parse(verifyBody); } catch { return {}; } })();
    // ID of the spurious phone-only auth.users row created by signInWithOtp
    const phoneUserId: string | undefined = verifyData?.user?.id;

    // ── 4. Delete spurious phone-only auth.users row before PUT ──────────────
    // Must happen BEFORE the PUT — the PUT sets phone on the Google user, which
    // would collide with the phone already on the spurious row (unique constraint).
    if (phoneUserId && phoneUserId !== googleUserId) {
      console.log(`verify-phone-otp: deleting spurious phone user ${phoneUserId} before PUT`);
      const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${phoneUserId}`, {
        method: "DELETE",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      });
      if (!deleteRes.ok) {
        console.error(`verify-phone-otp: failed to delete phone user ${phoneUserId}`, await deleteRes.text().catch(() => ""));
      } else {
        console.log(`verify-phone-otp: deleted spurious phone user ${phoneUserId}`);
      }
    }

    // ── 6. Link phone to the original Google OAuth user via Admin API ─────────
    // PUT sets phone + phone_confirm: true without touching the caller's session.
    console.log('STEP4_PRE_PATCH', {
      googleUserId,
      phone,
      patchUrl: SUPABASE_URL + '/auth/v1/admin/users/' + googleUserId,
    });

    const patchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${googleUserId}`, {
      method: "PUT",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, phone_confirm: true }),
    });

    const patchBody = await patchRes.text();
    console.log('STEP4_PATCH_RESULT', {
      status: patchRes.status,
      body: patchBody.substring(0, 300),
    });

    if (!patchRes.ok) {
      const patchErr = (() => { try { return JSON.parse(patchBody); } catch { return {}; } })();
      const msg = patchErr?.message || "Failed to link phone to user";
      return json({ error: msg }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return json({ error }, 500);
  }
});
