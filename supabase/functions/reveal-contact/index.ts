// Phase 3 Prompt 2.1 — reveal-contact
// Owner clicks Approve → this function updates contact_request to 'approved'
// and dispatches a fire-and-forget webhook to n8n. n8n owns the actual email
// send + any future WhatsApp fanout (Workflows A/B/C parity).
//
// Security invariants (D-P3-001, D-P3-003):
// - Phone / email values appear ONLY in the n8n payload and in email_send_log
//   (admin-only). They NEVER appear in the HTTP response body.
// - caller must be the owner_id on the contact_request. Verified via JWT.
// - DB state is source of truth: approval succeeds regardless of n8n outcome.

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";
const N8N_REVEAL_WEBHOOK = "https://n8n.reeve.in/webhook/contact-reveal";

// SEC-003: contact_request_id is interpolated into raw PostgREST query strings below,
// including the guarded approval PATCH (`?id=eq.<id>&status=eq.pending`). An unvalidated
// value can append or truncate filters — a trailing `#` drops the `status=eq.pending`
// race guard. The anchors matter: this admits only [0-9a-f-], so no query delimiter
// can survive. Same guard as resend-reveal / upload- / delete-property-image.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!bearerToken) return json({ error: "Unauthorized" }, 401);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? SUPABASE_URL;
    const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET") ?? "";
    if (!n8nSecret) {
      console.warn("N8N_WEBHOOK_SECRET_MISSING — dispatch will fail auth at n8n");
    }

    // 1. JWT
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { "Authorization": `Bearer ${bearerToken}`, "apikey": anonKey },
    });
    if (userRes.status !== 200) return json({ error: "Unauthorized" }, 401);
    const callerId: string | undefined = (await userRes.json())?.id;
    if (!callerId) return json({ error: "Unauthorized" }, 401);

    // 2. Body
    let body: { contact_request_id?: string };
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const crId = body?.contact_request_id;
    if (!crId || typeof crId !== "string") return json({ error: "Missing contact_request_id" }, 400);
    if (!UUID_REGEX.test(crId)) return json({ error: "Invalid contact_request_id" }, 400);

    const srHeaders = { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` };

    // 3. Fetch contact_request
    const crRes = await fetch(
      `${supabaseUrl}/rest/v1/contact_requests?id=eq.${crId}&select=id,property_id,tenant_id,owner_id,status`,
      { headers: srHeaders },
    );
    if (!crRes.ok) return json({ error: "Failed to fetch contact request" }, 500);
    const cr: { id: string; property_id: string; tenant_id: string; owner_id: string; status: string } | undefined =
      (await crRes.json())?.[0];
    if (!cr) return json({ error: "Contact request not found" }, 404);

    // 4. Ownership + status guards
    if (cr.owner_id !== callerId) return json({ error: "Forbidden" }, 403);
    if (cr.status !== "pending") return json({ error: "invalid_status_transition" }, 409);

    // 5. UPDATE status → approved (guarded on OLD.status=pending for idempotence)
    //    DB is source of truth: happens BEFORE any n8n call.
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/contact_requests?id=eq.${crId}&status=eq.pending`,
      {
        method: "PATCH",
        headers: { ...srHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    if (!updateRes.ok) {
      console.error("APPROVE_UPDATE_ERROR", { status: updateRes.status });
      return json({ error: "Failed to mark approved" }, 500);
    }

    // 6. Gather notification payload data (service_role — values never leave via HTTP body)
    const [ownerUserRes, tenantUserRes, propRes, tenantProfRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${cr.owner_id}&select=full_name,email,phone`, { headers: srHeaders }),
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${cr.tenant_id}&select=full_name,email,phone`, { headers: srHeaders }),
      fetch(`${supabaseUrl}/rest/v1/properties?id=eq.${cr.property_id}&select=building_name,locality`, { headers: srHeaders }),
      fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${cr.tenant_id}&select=display_name`, { headers: srHeaders }),
    ]);

    const ownerUser: { full_name?: string | null; email?: string | null; phone?: string | null } =
      (await ownerUserRes.json())?.[0] ?? {};
    const tenantUser: { full_name?: string | null; email?: string | null; phone?: string | null } =
      (await tenantUserRes.json())?.[0] ?? {};
    const property: { building_name?: string | null; locality?: string | null } =
      (await propRes.json())?.[0] ?? {};
    const tenantProf: { display_name?: string | null } =
      (await tenantProfRes.json())?.[0] ?? {};

    // 6a. Normalise emails — treat empty strings and null identically.
    const ownerEmail = (ownerUser.email ?? "").trim() || null;
    const tenantEmail = (tenantUser.email ?? "").trim() || null;
    const ownerHasEmail = !!ownerEmail;
    const tenantHasEmail = !!tenantEmail;

    // 6b. Phone fallback: if public.users.phone is null (e.g. phone linked as
    //     second provider), read from auth.identities.identity_data via the
    //     SECURITY DEFINER RPC get_phone_fallback (service_role only).
    const ownerPhoneRaw = (ownerUser.phone ?? "").trim() || null;
    const tenantPhoneRaw = (tenantUser.phone ?? "").trim() || null;

    async function fetchPhoneFallback(userId: string): Promise<string | null> {
      try {
        const r = await fetch(`${supabaseUrl}/rest/v1/rpc/get_phone_fallback`, {
          method: "POST",
          headers: { ...srHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId }),
        });
        if (!r.ok) {
          console.error("PHONE_FALLBACK_NON_2XX", { userId, status: r.status });
          return null;
        }
        const val = await r.json();
        if (typeof val === "string") {
          const trimmed = val.trim();
          return trimmed ? trimmed : null;
        }
        return null;
      } catch (err) {
        console.error("PHONE_FALLBACK_ERROR", { userId, error: err instanceof Error ? err.message : String(err) });
        return null;
      }
    }

    const [ownerPhone, tenantPhone] = await Promise.all([
      ownerPhoneRaw ? Promise.resolve(ownerPhoneRaw) : fetchPhoneFallback(cr.owner_id),
      tenantPhoneRaw ? Promise.resolve(tenantPhoneRaw) : fetchPhoneFallback(cr.tenant_id),
    ]);
    const ownerHasPhone = !!ownerPhone;
    const tenantHasPhone = !!tenantPhone;

    // n8n payload — send "" (never null) for missing email or phone so
    // downstream template rendering doesn't break on null.
    const n8nPayload = {
      event: "contact_approved",
      contact_request_id: crId,
      property: {
        id: cr.property_id,
        building_name: property.building_name ?? null,
        locality: property.locality ?? null,
      },
      owner: {
        user_id: cr.owner_id,
        full_name: ownerUser.full_name ?? null,
        email: ownerEmail ?? "",
        phone: ownerPhone ?? "",
      },
      tenant: {
        user_id: cr.tenant_id,
        display_name: tenantProf.display_name ?? null,
        full_name: tenantUser.full_name ?? null,
        email: tenantEmail ?? "",
        phone: tenantPhone ?? "",
      },
    };

    const willDispatch = ownerHasEmail || tenantHasEmail;

    // 7. Log per-recipient: dispatched vs skipped_no_email. Skipped rows still
    //    log the intended payload so admin can retry manually if needed.
    const logRows = [
      ownerHasEmail
        ? {
            contact_request_id: crId,
            resend_message_id: null,
            event_type: "n8n_webhook_dispatched",
            recipient_user_id: cr.owner_id,
            recipient_email: ownerEmail,
            error_reason: null,
            raw_payload: n8nPayload,
          }
        : {
            contact_request_id: crId,
            resend_message_id: null,
            event_type: "skipped_no_email",
            recipient_user_id: cr.owner_id,
            recipient_email: null,
            error_reason: "owner email missing at reveal time",
            raw_payload: n8nPayload,
          },
      tenantHasEmail
        ? {
            contact_request_id: crId,
            resend_message_id: null,
            event_type: "n8n_webhook_dispatched",
            recipient_user_id: cr.tenant_id,
            recipient_email: tenantEmail,
            error_reason: null,
            raw_payload: n8nPayload,
          }
        : {
            contact_request_id: crId,
            resend_message_id: null,
            event_type: "skipped_no_email",
            recipient_user_id: cr.tenant_id,
            recipient_email: null,
            error_reason: "tenant email missing at reveal time",
            raw_payload: n8nPayload,
          },
    ];

    if (!ownerHasPhone) {
      logRows.push({
        contact_request_id: crId,
        resend_message_id: null,
        event_type: "skipped_no_phone",
        recipient_user_id: cr.owner_id,
        recipient_email: null,
        error_reason: "owner phone missing at reveal time (fallback exhausted)",
        raw_payload: n8nPayload,
      });
    }
    if (!tenantHasPhone) {
      logRows.push({
        contact_request_id: crId,
        resend_message_id: null,
        event_type: "skipped_no_phone",
        recipient_user_id: cr.tenant_id,
        recipient_email: null,
        error_reason: "tenant phone missing at reveal time (fallback exhausted)",
        raw_payload: n8nPayload,
      });
    }

    await fetch(`${supabaseUrl}/rest/v1/email_send_log`, {
      method: "POST",
      headers: { ...srHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(logRows),
    }).catch((err) => console.error("EMAIL_LOG_INSERT_ERROR", { error: String(err) }));

    // 8. Fire-and-forget n8n dispatch — only if at least one party has email.
    let n8nError = false;
    if (willDispatch) {
      try {
        const n8nRes = await fetch(N8N_REVEAL_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${n8nSecret}`,
          },
          body: JSON.stringify(n8nPayload),
        });
        if (!n8nRes.ok) {
          n8nError = true;
          console.error("N8N_DISPATCH_NON_2XX", { status: n8nRes.status });
        }
      } catch (err) {
        n8nError = true;
        console.error("N8N_DISPATCH_ERROR", { error: err instanceof Error ? err.message : String(err) });
      }
    } else {
      console.warn("N8N_DISPATCH_SKIPPED_NO_EMAILS", { crId });
    }

    return json(
      !willDispatch
        ? { approved: true, notification_dispatched: false, reason: "no_recipient_email" }
        : n8nError
          ? { approved: true, notification_dispatched: false, n8n_error: true }
          : { approved: true, notification_dispatched: true },
      200,
    );

  } catch (err) {
    console.error("UNHANDLED_ERROR", { error: err instanceof Error ? err.message : String(err) });
    return json({ error: "Internal server error" }, 500);
  }
});
