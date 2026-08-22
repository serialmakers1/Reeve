// Phase 3 Prompt 2 — submit-contact-request
// Follows the create-razorpay-order/index.ts skeleton exactly:
// manual JWT validation (verify_jwt=false at gateway), CORS_HEADERS, json() helper,
// Deno.serve() top-level try/catch, service_role for all DB reads.
//
// Security invariants (D-P3-001/002):
// - tenant_id is derived ONLY from the verified JWT — never from the request body
// - contact details (voice/text channels) are NEVER read into this function or returned in any response
// - tenant_profile_snapshot is built at INSERT time from users + profiles + rental_preferences

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

type PrefRow = Record<string, unknown>;

function isMissing(v: unknown): boolean {
  return v === null || v === undefined;
}

function checkRentPrefsComplete(pr: PrefRow): boolean {
  const mode = pr["preference_mode"] as string | null | undefined;
  const modeOk = mode === "rent" || mode === "both";
  return (
    modeOk &&
    !isMissing(pr["age"]) &&
    !isMissing(pr["occupation"]) &&
    pr["is_foreign_citizen"] !== null &&
    pr["is_foreign_citizen"] !== undefined &&
    !isMissing(pr["gender"]) &&
    !isMissing(pr["number_of_occupants"]) &&
    !isMissing(pr["expected_stay_duration"])
  );
}

function checkBuyPrefsComplete(pr: PrefRow): boolean {
  const mode = pr["preference_mode"] as string | null | undefined;
  const modeOk = mode === "buy" || mode === "both";
  return (
    modeOk &&
    !isMissing(pr["age"]) &&
    !isMissing(pr["occupation"]) &&
    pr["is_foreign_citizen"] !== null &&
    pr["is_foreign_citizen"] !== undefined &&
    !isMissing(pr["buying_purpose"]) &&
    !isMissing(pr["purchase_timeline"]) &&
    !isMissing(pr["funding_stage"])
  );
}

function buildRentSnapshot(pr: PrefRow): Record<string, unknown> {
  const snap: Record<string, unknown> = {
    age: pr["age"],
    occupation: pr["occupation"],
    is_foreign_citizen: pr["is_foreign_citizen"],
    gender: pr["gender"],
    number_of_occupants: pr["number_of_occupants"],
    expected_stay_duration: pr["expected_stay_duration"],
    has_pets: !!pr["has_pets"],
  };
  if (pr["occupation_other"] && typeof pr["occupation_other"] === "string" && pr["occupation_other"] !== "") {
    snap["occupation_other"] = pr["occupation_other"];
  }
  if (pr["move_in_by"] !== null && pr["move_in_by"] !== undefined) snap["move_in_by"] = pr["move_in_by"];
  if (pr["marital_status"] !== null && pr["marital_status"] !== undefined) snap["marital_status"] = pr["marital_status"];
  if (pr["diet_preference"] !== null && pr["diet_preference"] !== undefined) snap["diet_preference"] = pr["diet_preference"];
  // pet_types only when has_pets=true and array is non-empty
  if (pr["has_pets"]) {
    const pt = pr["pet_types"];
    if (Array.isArray(pt) && pt.length > 0) snap["pet_types"] = pt;
  }
  return snap;
}

function buildBuySnapshot(pr: PrefRow): Record<string, unknown> {
  const snap: Record<string, unknown> = {
    age: pr["age"],
    occupation: pr["occupation"],
    is_foreign_citizen: pr["is_foreign_citizen"],
    buying_purpose: pr["buying_purpose"],
    purchase_timeline: pr["purchase_timeline"],
    funding_stage: pr["funding_stage"],
  };
  if (pr["occupation_other"] && typeof pr["occupation_other"] === "string" && pr["occupation_other"] !== "") {
    snap["occupation_other"] = pr["occupation_other"];
  }
  return snap;
}

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
    // Unicode-safe length check: Array.from counts code points, matching PostgreSQL char_length()
    if (tenantMessage !== null && Array.from(tenantMessage).length > 200) {
      return json({ error: "message_too_long" }, 400);
    }
    const consentCheckedAt = body?.consent_checked_at;
    if (!consentCheckedAt || typeof consentCheckedAt !== "string") {
      return json({ error: "Missing consent_checked_at" }, 400);
    }

    const srHeaders = { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` };

    // ── 2b. Content validation via validate_short_text (service_role RPC) ──────
    if (tenantMessage) {
      const valRes = await fetch(
        `${supabaseUrl}/rest/v1/rpc/validate_short_text`,
        {
          method: "POST",
          headers: { ...srHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_text: tenantMessage, p_max_length: 200 }),
        },
      );
      if (!valRes.ok) {
        let pgMsg = "";
        try {
          const errJson = await valRes.json();
          pgMsg = errJson?.message ?? errJson?.error ?? "";
        } catch { /* ignore parse failure */ }

        if (pgMsg.includes("TEXT_TOO_LONG"))           return json({ error: "message_too_long" }, 400);
        if (pgMsg.includes("CONTAINS_PHONE"))          return json({ error: "message_contains_phone" }, 422);
        if (pgMsg.includes("CONTAINS_EMAIL"))          return json({ error: "message_contains_email" }, 422);
        if (pgMsg.includes("CONTAINS_URL"))            return json({ error: "message_contains_url" }, 422);
        if (pgMsg.includes("CONTAINS_SOCIAL_HANDLE"))  return json({ error: "message_contains_contact_handle" }, 422);
        if (pgMsg.includes("BLOCKED_CONTENT"))         return json({ error: "message_contains_contact_channel" }, 422);
        if (pgMsg.includes("BLOCKED_WORD"))            return json({ error: "message_blocked_content" }, 422);

        console.error("VALIDATE_SHORT_TEXT_UNKNOWN_ERROR", { status: valRes.status });
        return json({ error: "Internal server error" }, 500);
      }
    }

    // ── 3. Property lookup — owner_id + status + listing_type ───────────────
    const propRes = await fetch(
      `${supabaseUrl}/rest/v1/properties?id=eq.${propertyId}&select=id,owner_id,status,listing_type`,
      { headers: srHeaders },
    );
    if (!propRes.ok) {
      console.error("PROPERTY_FETCH_ERROR", { status: propRes.status });
      return json({ error: "Failed to fetch property" }, 500);
    }
    const props: Array<{ id: string; owner_id: string; status: string; listing_type: string | null }> = await propRes.json();
    const property = props?.[0];
    if (!property) return json({ error: "Property not found" }, 404);
    if (!["listed", "edit_pending_review"].includes(property.status)) {
      return json({ error: "Property is not currently accepting requests" }, 422);
    }

    const listingType = property.listing_type;
    if (listingType !== "rent" && listingType !== "sale") {
      return json({ error: "Unknown listing type — cannot validate preferences" }, 422);
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
      return json({ error: "Rate limit check failed" }, 500);
    }

    // ── 6. Preferences completeness check (mode-aware) ──────────────────────
    const prefRes = await fetch(
      `${supabaseUrl}/rest/v1/rental_preferences?user_id=eq.${tenantId}&select=*`,
      { headers: srHeaders },
    );
    if (!prefRes.ok) {
      console.error("PREF_FETCH_ERROR", { status: prefRes.status });
      return json({ error: "Failed to fetch preferences" }, 500);
    }
    const prefRows: PrefRow[] = await prefRes.json();
    const prefRow = prefRows?.[0] ?? null;

    const prefsOk = prefRow
      ? listingType === "rent"
        ? checkRentPrefsComplete(prefRow)
        : checkBuyPrefsComplete(prefRow)
      : false;

    if (!prefsOk) {
      return json({
        error: "preferences_incomplete",
        redirect: `/tenant-dashboard/preferences?mode=${listingType === "sale" ? "buy" : "rent"}`,
      }, 422);
    }

    // ── 7. Snapshot: users + profiles + mode-scoped prefs ─────────────────────
    // Reads directly from users (full_name) and profiles (all other identity
    // fields + created_at). Service-role bypasses RLS. Degrade-to-null on any
    // missing row — contact request is never aborted by missing profile data.
    const [profileUserRes, profRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${tenantId}&select=full_name`,
        { headers: srHeaders },
      ),
      fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${tenantId}&select=display_name,profile_photo_url,bio,created_at`,
        { headers: srHeaders },
      ),
    ]);
    const profileUserRow: { full_name?: string | null } =
      (await profileUserRes.json())?.[0] ?? {};
    const profRow: { display_name?: string | null; profile_photo_url?: string | null; bio?: string | null; created_at?: string | null } =
      (await profRes.json())?.[0] ?? {};

    const preferenceType = listingType === "sale" ? "buy" : "rent";
    const prefSnapshot = listingType === "sale"
      ? buildBuySnapshot(prefRow!)
      : buildRentSnapshot(prefRow!);

    const tenant_profile_snapshot: Record<string, unknown> = {
      preference_type: preferenceType,
      display_name: profRow.display_name ?? null,
      full_name: profileUserRow.full_name ?? null,
      profile_photo_url: profRow.profile_photo_url ?? null,
      bio: profRow.bio ?? null,
      member_since: profRow.created_at ?? null,
    };

    if (listingType === "sale") {
      tenant_profile_snapshot["buying_preferences"] = prefSnapshot;
    } else {
      tenant_profile_snapshot["rental_preferences"] = prefSnapshot;
    }

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

    if (insertRes.status === 409) {
      return json({ error: "request_already_active" }, 409);
    }

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
