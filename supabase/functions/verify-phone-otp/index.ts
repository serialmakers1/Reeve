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

    if (!verifyRes.ok) {
      const verifyErr = await verifyRes.json().catch(() => ({}));
      const msg = verifyErr?.msg || verifyErr?.message || "Invalid or expired OTP";
      return json({ error: msg }, 400);
    }

    const verifyData = await verifyRes.json().catch(() => ({}));
    // ID of the spurious phone-only auth.users row created by signInWithOtp
    const phoneUserId: string | undefined = verifyData?.user?.id;

    // ── 4. Link phone to the original Google OAuth user via Admin API ─────────
    // PATCH sets phone + phone_confirm: true without touching the caller's session.
    const patchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${googleUserId}`, {
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

    // ── 5. Clean up spurious phone-only auth.users row ────────────────────────
    // signInWithOtp({ shouldCreateUser: true }) created a separate auth.users row
    // for the phone number. Now that the phone is linked to the Google user,
    // delete the orphan row.
    if (phoneUserId && phoneUserId !== googleUserId) {
      console.log(`verify-phone-otp: cleaning up spurious phone user ${phoneUserId}`);
      const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${phoneUserId}`, {
        method: "DELETE",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
      });
      if (!deleteRes.ok) {
        // Non-fatal — log but don't fail the request
        console.error(`verify-phone-otp: failed to delete phone user ${phoneUserId}`, await deleteRes.text().catch(() => ""));
      } else {
        console.log(`verify-phone-otp: deleted spurious phone user ${phoneUserId}`);
      }
    }

    return json({ success: true }, 200);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return json({ error }, 500);
  }
});
