// Phase 3 Prompt 2 — submit-contact-request
// Follows the create-razorpay-order/index.ts skeleton exactly:
// manual JWT validation (verify_jwt=false at gateway), CORS_HEADERS, json() helper,
// Deno.serve() top-level try/catch, service_role for all DB reads.
//
// Security invariants (D-P3-001/002):
// - tenant_id is derived ONLY from the verified JWT — never from the request body
// - contact details (voice/text channels) are NEVER read into this function or returned in any response
// - tenant_profile_snapshot is built at INSERT time from public_profiles + profiles + rental_preferences

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";

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

const REQUIRED_PREF_KEYS = [
  "age",
  "gender",
  "number_of_occupants",
  "occupation",
  "expected_stay_duration",
] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!bearerToken) return json({ error: "Unauthorized" }, 401);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? SUPABASE_URL;

    // ── 1. Validate JWT → tenant_id ─────────────────────────────────────────
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { "Authorization": `Bearer ${bearerToken}`, "apikey": anonKey },
    });
    if (userRes.status !== 200) return json({ error: "Unauthorized" }, 401);
    const userData = await userRes.json();
    const tenantId: string | undefined = userData?.id;
    if (!tenantId) return json({ error: "Unauthorized" }, 401);

    // ── 2. Parse body ───────────────────────────────────────────────────────
    let body: { property_id?: string; tenant_message?: string | null; consent_checked_at?: string };
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

    const propertyId = body?.property_id;
    if (!propertyId || typeof propertyId !== "string") {
      return json({ error: "Missing property_id" }, 400);
    }
    const tenantMessage = typeof body?.tenant_message === "string" ? body.tenant_message : null;
    if (tenantMessage !== null && tenantMessage.length > 200) {
      return json({ error: "tenant_message exceeds 200 characters" }, 400);
    }
    const consentCheckedAt = body?.consent_checked_at;
    if (!consentCheckedAt || typeof consentCheckedAt !== "string") {
      return json({ error: "Missing consent_checked_at" }, 400);
    }

    const srHeaders = { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` };

    // ── 3. Property lookup — owner_id + status ──────────────────────────────
    const propRes = await fetch(
      `${supabaseUrl}/rest/v1/properties?id=eq.${propertyId}&select=id,owner_id,status`,
      { headers: srHeaders },
    );
    if (!propRes.ok) {
      console.error("PROPERTY_FETCH_ERROR", { status: propRes.status });
      return json({ error: "Failed to fetch property" }, 500);
    }
    const props: Array<{ id: string; owner_id: string; status: string }> = await propRes.json();
    const property = props?.[0];
    if (!property) return json({ error: "Property not found" }, 404);
    if (!["listed", "edit_pending_review"].includes(property.status)) {
      return json({ error: "Property is not currently accepting requests" }, 422);
    }

    // ── 4. Self-request guard ───────────────────────────────────────────────
    if (property.owner_id === tenantId) {
      return json({ error: "Forbidden: cannot request contact on own property" }, 403);
    }

    // ── 5. Global daily rate limit (10/day IST) via DB function ─────────────
    const rateRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_tenant_daily_request_count`,
      {
        method: "POST",
        headers: { ...srHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ p_tenant_id: tenantId }),
      },
    );
    if (rateRes.ok) {
      const todayCount = Number(await rateRes.json());
      if (Number.isFinite(todayCount) && todayCount >= 10) {
        return json({ error: "daily_limit_reached", remaining: 0 }, 429);
      }
    } else {
      console.error("RATE_LIMIT_RPC_ERROR", { status: rateRes.status });
      // Fail-closed: if the rate-limit RPC is broken, block the request.
      return json({ error: "Rate limit check failed" }, 500);
    }

    // ── 6. Preferences completeness check ───────────────────────────────────
    const prefRes = await fetch(
      `${supabaseUrl}/rest/v1/rental_preferences?user_id=eq.${tenantId}&select=*`,
      { headers: srHeaders },
    );
    if (!prefRes.ok) {
      console.error("PREF_FETCH_ERROR", { status: prefRes.status });
      return json({ error: "Failed to fetch preferences" }, 500);
    }
    const prefRows: Array<Record<string, unknown>> = await prefRes.json();
    const prefRow = prefRows?.[0] ?? null;

    if (!prefRow || REQUIRED_PREF_KEYS.some((k) => prefRow[k] === null || prefRow[k] === undefined)) {
      return json({
        error: "preferences_incomplete",
        redirect: "/tenant-dashboard/preferences",
      }, 422);
    }

    // ── 7. Snapshot: public_profiles + profiles.created_at + rental_preferences ─
    const [pubRes, profRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/public_profiles?user_id=eq.${tenantId}&select=display_name,full_name,profile_photo_url,bio`,
        { headers: srHeaders },
      ),
      fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${tenantId}&select=created_at`,
        { headers: srHeaders },
      ),
    ]);
    const pubRow: { display_name?: string | null; full_name?: string | null; profile_photo_url?: string | null; bio?: string | null } =
      (await pubRes.json())?.[0] ?? {};
    const profRow: { created_at?: string | null } = (await profRes.json())?.[0] ?? {};

    const tenant_profile_snapshot = {
      display_name: pubRow.display_name ?? null,
      full_name: pubRow.full_name ?? null,
      profile_photo_url: pubRow.profile_photo_url ?? null,
      bio: pubRow.bio ?? null,
      member_since: profRow.created_at ?? null,
      rental_preferences: {
        age: prefRow.age ?? null,
        gender: prefRow.gender ?? null,
        number_of_occupants: prefRow.number_of_occupants ?? null,
        occupation: prefRow.occupation ?? null,
        occupation_other: prefRow.occupation_other ?? null,
        expected_stay_duration: prefRow.expected_stay_duration ?? null,
        preferred_city: prefRow.preferred_city ?? null,
        preferred_localities: prefRow.preferred_localities ?? null,
        move_in_by: prefRow.move_in_by ?? null,
        marital_status: prefRow.marital_status ?? null,
        diet_preference: prefRow.diet_preference ?? null,
        has_pets: prefRow.has_pets ?? null,
        pet_types: prefRow.pet_types ?? null,
        is_foreign_citizen: prefRow.is_foreign_citizen ?? null,
      },
    };

    // ── 8. INSERT contact_requests (trigger sets attempt_number) ────────────
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/contact_requests`, {
      method: "POST",
      headers: { ...srHeaders, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({
        property_id: propertyId,
        tenant_id: tenantId,
        owner_id: property.owner_id,
        tenant_message: tenantMessage,
        tenant_profile_snapshot,
        consent_checked_at: consentCheckedAt,
        consent_terms_version: 1,
      }),
    });

    if (insertRes.status === 201) {
      const inserted: Array<{ id: string; attempt_number: number }> = await insertRes.json();
      return json({ id: inserted[0].id, attempt_number: inserted[0].attempt_number }, 201);
    }

    const errBody = await insertRes.text();
    console.error("INSERT_ERROR", { status: insertRes.status, body: errBody });

    // Unique partial index violation → active request already exists.
    if (insertRes.status === 409) {
      return json({ error: "request_already_active" }, 409);
    }

    // Trigger raise (cooldown / max attempts / daily cap edge race).
    // Postgres RAISE EXCEPTION surfaces via PostgREST with a JSON error body
    // containing `message`. We surface it verbatim so the UI can map to copy.
    let triggerMessage = errBody;
    try {
      const parsed = JSON.parse(errBody);
      if (parsed?.message) triggerMessage = parsed.message;
    } catch { /* leave raw */ }

    return json({ error: "trigger_violation", message: triggerMessage }, 422);

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("UNHANDLED_ERROR", { error });
    return json({ error: "Internal server error" }, 500);
  }
});
