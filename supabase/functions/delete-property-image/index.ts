const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";
const R2_ENDPOINT = "https://731bf5e6253cfe9a3ae733dbe3ac5dea.r2.cloudflarestorage.com";
const R2_BUCKET = "property-images";
const R2_PUBLIC_URL = "https://images.reeve.in";

// ── AWS SigV4 helpers ──────────────────────────────────────────────────────────

async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const buf: ArrayBuffer = typeof data === "string" ? new TextEncoder().encode(data).buffer as ArrayBuffer : data instanceof Uint8Array ? data.buffer as ArrayBuffer : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const keyBuf = key instanceof Uint8Array ? key.buffer as ArrayBuffer : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
}

async function deriveSigningKey(
  secret: string,
  date: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secret).buffer as ArrayBuffer, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signR2Request(
  method: string,
  objectPath: string,
  payload: ArrayBuffer,
): Promise<{ url: string; headers: Record<string, string> }> {
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(R2_ENDPOINT).host;
  const url = `${R2_ENDPOINT}/${R2_BUCKET}/${objectPath}`;
  const canonicalUri = `/${R2_BUCKET}/${objectPath}`;

  const payloadHash = await sha256Hex(payload);

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method,
    canonicalUri,
    "", // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url,
    headers: {
      "Authorization": authHeader,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "Host": host,
    },
  };
}

// ── R2 deletion + durable outbox helpers ────────────────────────────────────────

// Delete one trusted object key from R2 with a single bounded retry for transient
// failures. R2's S3-compatible DeleteObject is idempotent — a missing key returns
// 2xx — so there is NO 404 special-case: a 404 here signals a wrong bucket/path/
// endpoint and is treated as a real (retained) failure, never silently "cleaned".
async function deleteFromR2(
  objectKey: string,
): Promise<{ ok: boolean; status: number; transient: boolean; error: string | null }> {
  const maxAttempts = 2; // one small bounded retry for transient cases only
  let lastStatus = 0;
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { url, headers } = await signR2Request("DELETE", objectKey, new ArrayBuffer(0));
      const res = await fetch(url, { method: "DELETE", headers });
      if (res.ok) {
        return { ok: true, status: res.status, transient: false, error: null };
      }
      lastStatus = res.status;
      lastError = `R2 DELETE HTTP ${res.status}`;
      // Transient: throttling / server error → retry once more. Everything else
      // (401/403/404/other 4xx) is non-transient → stop and retain the outbox row.
      if (!(res.status === 429 || res.status >= 500)) {
        return { ok: false, status: res.status, transient: false, error: lastError };
      }
    } catch (_e) {
      // Network/exception → transient → retry once more.
      lastStatus = 0;
      lastError = "R2 DELETE network error";
    }
  }
  return { ok: false, status: lastStatus, transient: true, error: lastError };
}

// Remove the outbox row for a fully-cleaned object. Best-effort: a leftover row is
// harmless (the future reconciliation worker re-checks and clears it).
async function clearOutbox(objectKey: string, srHeaders: Record<string, string>): Promise<void> {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/pending_r2_deletions?object_key=eq.${encodeURIComponent(objectKey)}`,
      { method: "DELETE", headers: srHeaders },
    );
  } catch (_e) { /* best-effort; outbox row simply remains for later retry */ }
}

// Record a sanitized failure marker on the retained outbox row. Only last_attempt_at
// and last_error — attempt_count is intentionally left to the Prompt 3 retry worker
// (a plain PATCH cannot atomically increment). Best-effort; never fatal.
async function markOutboxFailed(
  objectKey: string,
  detail: string | null,
  srHeaders: Record<string, string>,
): Promise<void> {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/pending_r2_deletions?object_key=eq.${encodeURIComponent(objectKey)}`,
      {
        method: "PATCH",
        headers: srHeaders,
        body: JSON.stringify({
          last_attempt_at: new Date().toISOString(),
          last_error: (detail ?? "R2 delete failed").slice(0, 500),
        }),
      },
    );
  } catch (_e) { /* best-effort */ }
}

// Durably enqueue a staged object for cleanup BEFORE relying on R2. Staged objects
// have no property_images row, so the AFTER DELETE trigger cannot enqueue them.
// Uses ignore-duplicates so a re-enqueue is a safe no-op. Returns false only on a
// genuine failure (so the caller can refuse to report false success).
async function enqueueOutbox(objectKey: string, srHeaders: Record<string, string>): Promise<boolean> {
  try {
    // on_conflict=object_key is required: the table's PK is the surrogate `id`, so
    // ignore-duplicates alone would conflict on the PK (never the UNIQUE object_key).
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pending_r2_deletions?on_conflict=object_key`, {
      method: "POST",
      headers: { ...srHeaders, "Prefer": "resolution=ignore-duplicates" },
      body: JSON.stringify({ object_key: objectKey }),
    });
    return res.ok;
  } catch (_e) {
    return false;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // A) CORS on every response
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // D) Validate JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
      },
    });

    if (userRes.status !== 200) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const userJson = await userRes.json();
    const userId: string | undefined = userJson?.id;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // E) Parse JSON body. Two modes:
    //    normal delete  → { image_id, property_id }
    //    staged delete  → { staged_url, property_id }  (removes an abandoned R2 object)
    const body = await req.json();
    const imageId: string = body?.image_id ?? "";
    const propertyId: string = body?.property_id ?? "";
    const stagedUrl: string = body?.staged_url ? String(body.staged_url) : "";

    if (!UUID_REGEX.test(propertyId)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid property_id" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const srHeaders = {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };
    // Caller-JWT headers — DB mutations run as the real user (M5/F1).
    const callerHeaders = {
      "apikey": anonKey,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Role + property (owner_id, status) via trusted lookup only.
    const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=role`, { headers: srHeaders });
    const roleRows = await roleRes.json();
    const userRole: string = roleRows?.[0]?.role ?? "";
    const isAdmin = userRole === "admin" || userRole === "super_admin";

    const propRes = await fetch(`${SUPABASE_URL}/rest/v1/properties?id=eq.${propertyId}&select=owner_id,status`, { headers: srHeaders });
    const propRows = await propRes.json();
    const propRow = propRows?.[0];
    if (!propRow) {
      return new Response(JSON.stringify({ success: false, error: "Property not found" }), {
        status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const ownerId: string = propRow.owner_id ?? "";
    const propStatus: string = propRow.status ?? "";
    if (!isAdmin && ownerId !== userId) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Staged-delete mode: remove an abandoned R2 object (never a live row). ──
    if (stagedUrl) {
      const propPrefix = `${R2_PUBLIC_URL}/properties/${propertyId}/`;
      if (!stagedUrl.startsWith(propPrefix)) {
        return new Response(JSON.stringify({ success: false, error: "URL is not under this property's storage path" }), {
          status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      // Must not correspond to a live property_images row. Fail CLOSED: if the reference
      // check itself errors, do NOT delete (a non-OK body isn't an array and would else
      // read as "not live" → wrongful deletion).
      const liveRes = await fetch(
        `${SUPABASE_URL}/rest/v1/property_images?url=eq.${encodeURIComponent(stagedUrl)}&select=id`,
        { headers: srHeaders },
      );
      if (!liveRes.ok) {
        console.error("STAGED_LIVE_REFERENCE_CHECK_FAILED", { status: liveRes.status });
        return new Response(JSON.stringify({ success: false, error: "Could not delete photo. Please try again." }), {
          status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const liveRows = await liveRes.json();
      if (Array.isArray(liveRows) && liveRows.length > 0) {
        return new Response(JSON.stringify({ success: false, error: "That photo is a live image, not a staged object" }), {
          status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      // Must not be referenced by a still-pending edit request for this property. Fail CLOSED.
      const perRes = await fetch(
        `${SUPABASE_URL}/rest/v1/property_edit_requests?property_id=eq.${propertyId}&status=eq.pending&select=payload`,
        { headers: srHeaders },
      );
      if (!perRes.ok) {
        console.error("STAGED_PENDING_REFERENCE_CHECK_FAILED", { status: perRes.status });
        return new Response(JSON.stringify({ success: false, error: "Could not delete photo. Please try again." }), {
          status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const perRows = await perRes.json();
      const referenced = Array.isArray(perRows) && perRows.some((r: { payload?: { photo_changes?: { add?: Array<{ url?: string }> } } }) =>
        (r?.payload?.photo_changes?.add ?? []).some((a) => a?.url === stagedUrl));
      if (referenced) {
        return new Response(JSON.stringify({ success: false, error: "Photo is referenced by a pending review; resolve it first" }), {
          status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const objectKey = stagedUrl.replace(`${R2_PUBLIC_URL}/`, "");
      // Durably record the cleanup BEFORE relying on R2. If the enqueue itself
      // fails we must NOT pretend deletion succeeded (there would be no recovery record).
      const enqueued = await enqueueOutbox(objectKey, srHeaders);
      if (!enqueued) {
        console.error("STAGED_OUTBOX_ENQUEUE_FAILED");
        return new Response(JSON.stringify({ success: false, error: "Could not delete photo" }), {
          status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const stagedR2 = await deleteFromR2(objectKey);
      if (stagedR2.ok) {
        await clearOutbox(objectKey, srHeaders);
      } else {
        console.error("STAGED_R2_DELETE_FAILED", { status: stagedR2.status });
        await markOutboxFailed(objectKey, stagedR2.error, srHeaders);
      }
      // Deletion is durably queued either way; report success (unchanged contract).
      return new Response(JSON.stringify({ success: true, staged: true }), {
        status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Normal image delete ──
    if (!UUID_REGEX.test(imageId)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid image_id" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const imageRes = await fetch(`${SUPABASE_URL}/rest/v1/property_images?id=eq.${imageId}&select=*`, { headers: srHeaders });
    const imageRows = await imageRes.json();
    if (!Array.isArray(imageRows) || imageRows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Image not found" }), {
        status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const imageRow = imageRows[0];

    // SEC-002: bind the image to the authorized property. The image is fetched by id
    // alone via service_role (RLS-bypassing), so without this the caller's authorized
    // property_id and the privileged image lookup are independent — permitting deletion
    // of another property's R2 object. Unconditional (admins included): the real
    // property must be supplied so property A's status/rules never apply to B's image.
    // Runs before any status branch, DB delete, RPC, or R2 delete.
    if (imageRow.property_id !== propertyId) {
      return new Response(JSON.stringify({ success: false, error: "Image does not belong to this property" }), {
        status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin && ["pending_review", "unlisted", "archived"].includes(propStatus)) {
      return new Response(JSON.stringify({ success: false, error: `Photos are frozen while the listing is ${propStatus}` }), {
        status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let newPrimaryId: string | null = null;

    if (isAdmin || ["listed", "edit_pending_review"].includes(propStatus)) {
      // Live listing (or admin): transactional RPC — enforces min-3 (owner) + atomic
      // cover promotion. DB deletion happens inside the RPC (before R2 cleanup below).
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_property_photo`, {
        method: "POST", headers: callerHeaders, body: JSON.stringify({ p_image_id: imageId }),
      });
      if (!rpcRes.ok) {
        await rpcRes.text(); // consume body; not logged (may contain DB/RPC internals)
        console.error("DELETE_RPC_FAILED", { status: rpcRes.status });
        return new Response(JSON.stringify({ success: false, error: "Delete blocked" }), {
          status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    } else {
      // draft / changes_requested: direct delete via caller JWT (trigger permits), then
      // reassign the cover if the deleted image was primary. Verify the intended row was
      // actually removed BEFORE touching R2 — an RLS-blocked delete returns HTTP 200 with
      // zero rows, and deleting the R2 object then would orphan the victim's still-live row
      // (SEC-002). Keep caller-JWT + RLS; do not switch to service_role.
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/property_images?id=eq.${imageId}`, {
        method: "DELETE",
        headers: { ...callerHeaders, "Prefer": "return=representation" },
      });
      if (!delRes.ok) {
        const detail = await delRes.text();
        console.error("PROPERTY_IMAGE_DB_DELETE_FAILED", { status: delRes.status, detail });
        return new Response(JSON.stringify({ success: false, error: "Delete failed" }), {
          status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const delRows = await delRes.json();
      if (!Array.isArray(delRows) || delRows.length !== 1 || delRows[0]?.id !== imageId) {
        return new Response(JSON.stringify({ success: false, error: "Delete blocked" }), {
          status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (imageRow.is_primary) {
        const remainRes = await fetch(
          `${SUPABASE_URL}/rest/v1/property_images?property_id=eq.${propertyId}&select=id&order=sort_order.asc,created_at.asc&limit=1`,
          { headers: srHeaders },
        );
        const remainRows = await remainRes.json();
        const candidateId: string | null = Array.isArray(remainRows) && remainRows[0]?.id ? remainRows[0].id : null;
        if (candidateId) {
          await fetch(`${SUPABASE_URL}/rest/v1/property_images?id=eq.${candidateId}`, {
            method: "PATCH", headers: callerHeaders, body: JSON.stringify({ is_primary: true }),
          });
          newPrimaryId = candidateId;
        }
      }
    }

    // R2 cleanup AFTER the committed DB deletion (orphan file is safer than a
    // dangling row). The AFTER DELETE trigger already enqueued this object in
    // pending_r2_deletions within the delete transaction, so an R2 failure here is
    // durably recoverable: clear the outbox row on success, retain it on failure.
    // The application delete already succeeded either way.
    const objectKey = (imageRow.url ?? "").replace(`${R2_PUBLIC_URL}/`, "");
    let storageCleanupPending = false;
    if (objectKey) {
      const r2 = await deleteFromR2(objectKey);
      if (r2.ok) {
        await clearOutbox(objectKey, srHeaders);
      } else {
        console.error("R2_DELETE_FAILED", { status: r2.status });
        await markOutboxFailed(objectKey, r2.error, srHeaders);
        storageCleanupPending = true;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_primary_id: newPrimaryId,
        ...(storageCleanupPending ? { storage_cleanup_pending: true } : {}),
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    // L) Catch-all
    console.error("DELETE_UNEXPECTED_ERROR");
    return new Response(JSON.stringify({ success: false, error: "Unexpected error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
