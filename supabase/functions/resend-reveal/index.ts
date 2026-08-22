// Phase 3 Prompt 2.1 — resend-reveal
// Either party (tenant or owner) can re-request the approval notification.
// Rewrite: replaces direct Resend call with fire-and-forget POST to n8n.
// Gates: 15-day expiry from approved_at (added), 1 per hour, 5 per day per caller per contact_request.

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";
const N8N_RESEND_WEBHOOK = "https://n8n.reeve.in/webhook/contact-resend-reveal";

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

function isResendExpiredAt(approvedAt: string | null, nowMs: number): boolean {
  if (!approvedAt) return true;
  const approvedAtMs = Date.parse(approvedAt);
  if (!Number.isFinite(approvedAtMs)) return true;
  return nowMs - approvedAtMs > 15 * 24 * 60 * 60 * 1000;
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

    const srHeaders = { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}` };

    // 3. Fetch contact_request
    const crRes = await fetch(
      `${supabaseUrl}/rest/v1/contact_requests?id=eq.${crId}&select=id,property_id,tenant_id,owner_id,status,approved_at`,
      { headers: srHeaders },
    );
    if (!crRes.ok) return json({ error: "Failed to fetch contact request" }, 500);
    const cr: { id: string; property_id: string; tenant_id: string; owner_id: string; status: string; approved_at: string | null } | undefined =
      (await crRes.json())?.[0];
    if (!cr) return json({ error: "Contact request not found" }, 404);

    // 4. Role check
    const isTenant = cr.tenant_id === callerId;
    const isOwner = cr.owner_id === callerId;
    if (!isTenant && !isOwner) return json({ error: "Forbidden" }, 403);
    const callerRole: "owner" | "tenant" = isOwner ? "owner" : "tenant";

    // 5. Status
    if (cr.status !== "approved") return json({ error: "not_approved" }, 422);

    // 5a. 15-day expiry from approved_at
    if (isResendExpiredAt(cr.approved_at, Date.now())) {
      return json({ error: "resend_expired" }, 422);
    }

    // 6. Cooldown: 1 per hour by recipient (caller)
    // Cooldown reads dispatch rows including the n8n_* event types since those
    // are what this endpoint writes now (Resend `email.sent` comes later via
    // resend-contact-webhook and is also honoured as a valid signal).
    const RESEND_EVENT_TYPES = "(email.sent,email.resent,n8n_webhook_dispatched,n8n_resend_webhook_dispatched)";
    const hourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const hourRes = await fetch(
      `${supabaseUrl}/rest/v1/email_send_log?contact_request_id=eq.${crId}&recipient_user_id=eq.${callerId}&event_type=in.${RESEND_EVENT_TYPES}&created_at=gt.${hourAgoIso}&select=created_at&order=created_at.desc`,
      { headers: srHeaders },
    );
    if (hourRes.ok) {
      const rows: Array<{ created_at: string }> = await hourRes.json();
      if (rows.length >= 1) {
        const nextSlotMs = new Date(rows[0].created_at).getTime() + 60 * 60 * 1000;
        const retrySec = Math.max(1, Math.ceil((nextSlotMs - Date.now()) / 1000));
        return json({ error: "cooldown_active", retry_after_seconds: retrySec }, 429);
      }
    }

    // 5/day IST — anchor to today's IST midnight
    const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const istMidnight = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - 5.5 * 60 * 60 * 1000);
    const dayRes = await fetch(
      `${supabaseUrl}/rest/v1/email_send_log?contact_request_id=eq.${crId}&recipient_user_id=eq.${callerId}&event_type=in.${RESEND_EVENT_TYPES}&created_at=gt.${istMidnight.toISOString()}&select=id`,
      { headers: srHeaders },
    );
    if (dayRes.ok) {
      const rows: Array<unknown> = await dayRes.json();
      if (rows.length >= 5) return json({ error: "daily_resend_limit" }, 429);
    }

    // 7. Gather payload data
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

    // Caller = the person we're resending TO. Other party = the details being resent.
    const callerEmail = isOwner ? (ownerUser.email ?? null) : (tenantUser.email ?? null);

    // Phone fallback: if public.users.phone is null for the other party (e.g.
    // phone linked as second provider), read from auth via SECURITY DEFINER
    // RPC get_phone_fallback (service_role only). Pattern ported from
    // reveal-contact/index.ts verbatim.
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

    const otherPartyUserId = isOwner ? cr.tenant_id : cr.owner_id;
    const otherPartyPhoneRaw = isOwner
      ? ((tenantUser.phone ?? "").trim() || null)
      : ((ownerUser.phone ?? "").trim() || null);
    const otherPartyPhone = otherPartyPhoneRaw ?? (await fetchPhoneFallback(otherPartyUserId));
    const otherPartyHasPhone = !!otherPartyPhone;

    const otherParty = isOwner
      ? {
          full_name: tenantUser.full_name ?? null,
          display_name: tenantProf.display_name ?? null,
          phone: otherPartyPhone ?? "",
          email: tenantUser.email ?? null,
        }
      : {
          full_name: ownerUser.full_name ?? null,
          display_name: null,          // owner has no profiles.display_name field in this flow
          phone: otherPartyPhone ?? "",
          email: ownerUser.email ?? null,
        };

    const n8nPayload = {
      event: "contact_resend_reveal",
      contact_request_id: crId,
      caller_role: callerRole,
      caller: { user_id: callerId, email: callerEmail },
      other_party: otherParty,
      property: {
        building_name: property.building_name ?? null,
        locality: property.locality ?? null,
      },
    };

    // 8. Log dispatch — MUST happen before n8n dispatch. The cooldown check above
    //    reads this row, and the returned UUID is the idempotency key for Resend.
    //    If the insert fails or returns no ID, abort — do NOT dispatch to n8n with
    //    a null dispatch_log_id (resend:null would collapse all resend attempts into
    //    one Resend deduplication key, silently suppressing legitimate later sends).
    let dispatchLogId: string | null = null;
    try {
      const logRes = await fetch(`${supabaseUrl}/rest/v1/email_send_log`, {
        method: "POST",
        headers: { ...srHeaders, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({
          contact_request_id: crId,
          resend_message_id: null,
          event_type: "n8n_resend_webhook_dispatched",
          recipient_user_id: callerId,
          recipient_email: callerEmail,
          error_reason: null,
          raw_payload: n8nPayload,
        }),
      });
      if (logRes.ok) {
        const rows: Array<{ id: string }> = await logRes.json();
        dispatchLogId = rows?.[0]?.id ?? null;
      } else {
        console.error("LOG_INSERT_ERROR", { status: logRes.status });
      }
    } catch (err) {
      console.error("LOG_INSERT_ERROR", { error: String(err) });
    }

    if (!dispatchLogId) {
      console.error("LOG_INSERT_FAILED_NO_ID — aborting dispatch to preserve idempotency");
      return json({ error: "Internal server error" }, 500);
    }

    // Add dispatch_log_id to the payload sent to n8n so it can use it as
    // the Resend idempotency key (unique UUID per user resend action).
    (n8nPayload as Record<string, unknown>).dispatch_log_id = dispatchLogId;

    // 8a. Additive log for missing phone — does NOT replace the dispatch row
    //     (cooldown reads that row) and does NOT affect the cooldown gate.
    if (!otherPartyHasPhone) {
      await fetch(`${supabaseUrl}/rest/v1/email_send_log`, {
        method: "POST",
        headers: { ...srHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_request_id: crId,
          resend_message_id: null,
          event_type: "skipped_no_phone",
          recipient_user_id: otherPartyUserId,
          recipient_email: null,
          error_reason: "other party phone missing at resend time (fallback exhausted)",
          raw_payload: n8nPayload,
        }),
      }).catch((err) => console.error("SKIPPED_NO_PHONE_LOG_ERROR", { error: String(err) }));
    }

    // 9. Fire-and-forget n8n dispatch
    let n8nError = false;
    try {
      const n8nRes = await fetch(N8N_RESEND_WEBHOOK, {
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

    return json(n8nError ? { sent: true, n8n_error: true } : { sent: true }, 200);

  } catch (err) {
    console.error("UNHANDLED_ERROR", { error: err instanceof Error ? err.message : String(err) });
    return json({ error: "Internal server error" }, 500);
  }
});
