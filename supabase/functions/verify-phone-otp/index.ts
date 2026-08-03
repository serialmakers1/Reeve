const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

// +91 followed by exactly 10 digits
const PHONE_REGEX = /^\+91\d{10}$/;
// Supabase OTPs are 6 digits; accept 4–8 to be safe
const TOKEN_REGEX = /^\d{4,8}$/;
// signInWithOtp creates a spurious auth.users row moments before verify is called.
// Legitimate users have created_at well beyond this threshold.
const SPURIOUS_ROW_MAX_AGE_MS = 60_000;

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

    // ── 4. Guard: abort if phone belongs to a legitimate existing user ────────
    // signInWithOtp creates a spurious row moments before this call (age < 60s).
    // A real user would have created_at well beyond SPURIOUS_ROW_MAX_AGE_MS.
    if (phoneUserId && phoneUserId !== googleUserId) {
      const createdAt = verifyData?.user?.created_at;
      const ageMs = createdAt ? Date.now() - new Date(createdAt).getTime() : Infinity;
      console.log('STEP4_AGE_CHECK', { phoneUserId, createdAt, ageMs });
      if (ageMs > SPURIOUS_ROW_MAX_AGE_MS) {
        return json({ error: "This phone number is already registered to another account." }, 409);
      }
    }

    // ── 5. Delete spurious phone-only auth.users row before PUT ──────────────
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

      // Also delete the public.users row the handle_user_updated trigger created
      // for the spurious phone-only user (fires when phone_confirmed_at is set).
      const deletePublicRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${phoneUserId}`,
        {
          method: "DELETE",
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!deletePublicRes.ok) {
        console.error(`verify-phone-otp: failed to delete public.users row for ${phoneUserId}`, await deletePublicRes.text().catch(() => ""));
      } else {
        console.log(`verify-phone-otp: deleted public.users row for spurious phone user ${phoneUserId}`);
      }
    }

    // ── 6. Link phone to the original Google OAuth user via Admin API ──────────
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

    // ── 7. Sync the confirmed phone into public.users atomically ──────────────
    // The Admin PUT above only updates auth.users; GoTrue's phone_change flow means
    // handle_user_updated already ran with phone=NULL (writing phone_verified=true,
    // phone=NULL). This RPC locks the auth row, reads the authoritative confirmed
    // phone, and writes it to public.users — converging the two under concurrency.
    // The RPC always writes the authoritative auth phone; p_expected_phone only
    // tells us whether this request won or lost a concurrent different-phone race.
    const SYNC_MAX_ATTEMPTS = 3;
    let syncRow: { synced?: boolean; expected_phone_matches?: boolean; status?: string } | null = null;
    let syncTransientError = false;

    for (let attempt = 1; attempt <= SYNC_MAX_ATTEMPTS; attempt++) {
      syncTransientError = false;
      let rpcRes: Response;
      try {
        rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_verified_phone_from_auth`, {
          method: "POST",
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_user_id: googleUserId, p_expected_phone: phone }),
        });
      } catch (_networkErr) {
        // Network-level failure — transient, retry.
        syncTransientError = true;
        console.log('STEP7_SYNC_NETWORK_ERR', { attempt });
        if (attempt < SYNC_MAX_ATTEMPTS) { await new Promise((r) => setTimeout(r, 200 * attempt)); }
        continue;
      }

      const rpcText = await rpcRes.text();
      console.log('STEP7_SYNC_RESULT', { attempt, status: rpcRes.status });

      // A definitive RPC exception (e.g. public_user_row_missing) is a 4xx from
      // PostgREST — do NOT retry; treat as a hard failure below.
      if (rpcRes.status >= 500) {
        syncTransientError = true;
        if (attempt < SYNC_MAX_ATTEMPTS) { await new Promise((r) => setTimeout(r, 200 * attempt)); }
        continue;
      }

      if (!rpcRes.ok) {
        // 4xx = definitive RPC error (bad input / raised exception). No retry.
        console.error('STEP7_SYNC_RPC_ERROR', { status: rpcRes.status });
        return json({ error: "Could not complete phone verification. Please try again." }, 500);
      }

      // RETURNS TABLE → PostgREST returns a JSON array even for a single row.
      const parsed = (() => { try { return JSON.parse(rpcText); } catch { return null; } })();
      const row = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!row || row.synced !== true) {
        // Empty/malformed body — treat as transient and retry.
        syncTransientError = true;
        if (attempt < SYNC_MAX_ATTEMPTS) { await new Promise((r) => setTimeout(r, 200 * attempt)); }
        continue;
      }

      syncRow = row;
      break;
    }

    if (!syncRow) {
      // Exhausted retries (transient failures). Return non-success — never claim
      // success. auth.users has the phone; public.users may still be NULL, but
      // get_phone_fallback keeps contact-reveal working and a retry re-converges.
      console.error('STEP7_SYNC_FAILED', { transient: syncTransientError });
      return json({ error: "Could not complete phone verification. Please try again." }, 500);
    }

    if (syncRow.expected_phone_matches === false) {
      // Lost a concurrent different-phone race. The RPC already converged
      // public.users to the authoritative auth phone; do NOT overwrite here.
      console.log('STEP7_SYNC_CONCURRENT', { expected_phone_matches: false });
      return json({ error: "Your phone was changed by another verification. Refresh and try again." }, 409);
    }

    console.log('STEP7_SYNC_OK', { expected_phone_matches: true });
    return json({ success: true }, 200);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return json({ error }, 500);
  }
});
