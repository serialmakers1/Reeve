// cleanup-property-images — internal, secret-protected R2 image cleanup worker.
//
// Invoked on a schedule (weekly n8n, configured separately after deploy) via
//   POST  Authorization: Bearer <N8N_WEBHOOK_SECRET>
// verify_jwt=false (see config.toml); the shared secret is the only auth, checked
// timing-safe here. Never callable from a browser.
//
// One run does: build authoritative reference sets → R2 reconciliation (enqueue
// R2-only orphans older than 7 days) → drain pending_r2_deletions (delete from R2,
// with a FRESH reference recheck immediately before each destructive delete).
//
// pending_r2_deletions is the single durable deletion queue. This worker never
// deletes an object that is currently referenced, never deletes a malformed key,
// and fails closed on any reference-check error.

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";
const R2_ENDPOINT = "https://731bf5e6253cfe9a3ae733dbe3ac5dea.r2.cloudflarestorage.com";
const R2_BUCKET = "property-images";
const R2_PUBLIC_URL = "https://images.reeve.in";
const R2_PREFIX = "properties/";

const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7-day grace for reconciliation-discovered orphans
const DRAIN_LIMIT = 200;
const PAGE = 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Canonical object-key shape shared with the SQL enqueue helper. Destructive-safe:
// the worker refuses to delete anything that does not match exactly.
const KEY_RE =
  /^properties\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/photos\/[^/]+$/;
function isValidPhotoKey(key: string): boolean {
  return KEY_RE.test(key);
}
function propertyIdFromKey(key: string): string | null {
  const m = key.match(/^properties\/([0-9a-fA-F-]{36})\/photos\//);
  return m ? m[1] : null;
}

// ── SigV4 primitives (no _shared module exists; duplicated per repo convention) ──
async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const buf: ArrayBuffer = typeof data === "string"
    ? new TextEncoder().encode(data).buffer as ArrayBuffer
    : data instanceof Uint8Array
    ? data.buffer as ArrayBuffer
    : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmacSha256(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const keyBuf = key instanceof Uint8Array ? key.buffer as ArrayBuffer : key;
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
}
async function deriveSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secret).buffer as ArrayBuffer, date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// RFC3986 / AWS URI encoding over UTF-8 bytes (encodes '/' too — for query params).
function awsUriEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  for (const b of bytes) {
    if ((b >= 0x41 && b <= 0x5A) || (b >= 0x61 && b <= 0x7A) || (b >= 0x30 && b <= 0x39) ||
        b === 0x2D || b === 0x5F || b === 0x2E || b === 0x7E) {
      out += String.fromCharCode(b);
    } else {
      out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}
function amzNow(): { amzDate: string; dateStamp: string } {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

// Sign a keyed request with NO query string (PUT/DELETE on an object).
async function signR2Object(method: string, objectPath: string): Promise<{ url: string; headers: Record<string, string> }> {
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
  const region = "auto", service = "s3";
  const { amzDate, dateStamp } = amzNow();
  const host = new URL(R2_ENDPOINT).host;
  const canonicalUri = `/${R2_BUCKET}/${objectPath}`;
  const payloadHash = await sha256Hex(new ArrayBuffer(0));
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method, canonicalUri, "",
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,
    signedHeaders, payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signature = toHex(await hmacSha256(await deriveSigningKey(secretAccessKey, dateStamp, region, service), stringToSign));
  return {
    url: `${R2_ENDPOINT}/${R2_BUCKET}/${objectPath}`,
    headers: {
      "Authorization": `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "Host": host,
    },
  };
}

// Sign a bucket GET with a canonical query string (ListObjectsV2). The exact encoded
// query that is signed is also the query sent on the wire.
async function signR2List(params: Record<string, string>): Promise<{ url: string; headers: Record<string, string> }> {
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
  const region = "auto", service = "s3";
  const { amzDate, dateStamp } = amzNow();
  const host = new URL(R2_ENDPOINT).host;
  const canonicalUri = `/${R2_BUCKET}`;
  const canonicalQuery = Object.keys(params).sort()
    .map((k) => `${awsUriEncode(k)}=${awsUriEncode(params[k])}`).join("&");
  const payloadHash = await sha256Hex(new ArrayBuffer(0));
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "GET", canonicalUri, canonicalQuery,
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,
    signedHeaders, payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signature = toHex(await hmacSha256(await deriveSigningKey(secretAccessKey, dateStamp, region, service), stringToSign));
  return {
    url: `${R2_ENDPOINT}/${R2_BUCKET}?${canonicalQuery}`,
    headers: {
      "Authorization": `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      "Host": host,
    },
  };
}

// R2 DELETE with one bounded retry. Mirrors Prompt-1 deleteFromR2 semantics: 2xx ok;
// 429/5xx/network transient (retry once); other non-2xx incl. 404 = retained failure
// (never treated as success).
async function deleteFromR2(objectKey: string): Promise<{ ok: boolean; status: number; error: string | null }> {
  let lastStatus = 0, lastError: string | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { url, headers } = await signR2Object("DELETE", objectKey);
      const res = await fetch(url, { method: "DELETE", headers });
      if (res.ok) return { ok: true, status: res.status, error: null };
      lastStatus = res.status;
      lastError = `R2 DELETE HTTP ${res.status}`;
      if (!(res.status === 429 || res.status >= 500)) return { ok: false, status: res.status, error: lastError };
    } catch (_e) {
      lastStatus = 0;
      lastError = "R2 DELETE network error";
    }
  }
  return { ok: false, status: lastStatus, error: lastError };
}

// ── Outbox helpers (service-role REST) ───────────────────────────────────────────
function srHeaders(): Record<string, string> {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
}
async function enqueueOutbox(objectKey: string): Promise<void> {
  // on_conflict=object_key: outbox PK is a surrogate id, not object_key.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pending_r2_deletions?on_conflict=object_key`, {
    method: "POST",
    headers: { ...srHeaders(), "Prefer": "resolution=ignore-duplicates" },
    body: JSON.stringify({ object_key: objectKey }),
  });
  // Throw on failure so reconciliation does NOT report a phantom-queued orphan; the
  // outer reconcile catch flips reconcileError=true and next week retries.
  if (!res.ok) throw new Error("outbox enqueue failed");
}
async function clearOutbox(objectKey: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/pending_r2_deletions?object_key=eq.${encodeURIComponent(objectKey)}`, {
    method: "DELETE", headers: srHeaders(),
  });
}
async function stampOutbox(objectKey: string, patch: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/pending_r2_deletions?object_key=eq.${encodeURIComponent(objectKey)}`, {
      method: "PATCH", headers: srHeaders(), body: JSON.stringify(patch),
    });
  } catch (_e) { /* best-effort */ }
}

// ── Fresh, targeted reference checks (the destructive-safety gate) ───────────────
// Returns true if the object is currently referenced; throws on any query error so the
// caller can fail closed (keep the row, delete nothing).
async function isReferenced(objectKey: string): Promise<boolean> {
  const fullUrl = `${R2_PUBLIC_URL}/${objectKey}`;
  // (1) live property_images row
  const liveRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_images?url=eq.${encodeURIComponent(fullUrl)}&select=id&limit=1`,
    { headers: srHeaders() },
  );
  if (!liveRes.ok) throw new Error("live check failed");
  const liveRows = await liveRes.json();
  if (Array.isArray(liveRows) && liveRows.length > 0) return true;
  // (2) pending edit request on a non-archived property (inner embed filters top-level rows)
  const pid = propertyIdFromKey(objectKey);
  if (!pid) return false;
  const perRes = await fetch(
    `${SUPABASE_URL}/rest/v1/property_edit_requests?property_id=eq.${pid}&status=eq.pending` +
      `&select=payload,properties!inner(status)&properties.status=neq.archived`,
    { headers: srHeaders() },
  );
  if (!perRes.ok) throw new Error("pending check failed");
  const perRows = await perRes.json();
  return Array.isArray(perRows) && perRows.some((r: { payload?: { photo_changes?: { add?: Array<{ url?: string }> } } }) =>
    (r?.payload?.photo_changes?.add ?? []).some((a) => a?.url === fullUrl));
}

// ── Bulk reference sets (reconciliation only; NEVER used for drain delete decisions) ──
async function loadReferenceSets(): Promise<{ liveUrls: Set<string>; protectedStaged: Set<string> }> {
  const liveUrls = new Set<string>();
  for (let offset = 0;; offset += PAGE) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/property_images?select=url&limit=${PAGE}&offset=${offset}`,
      { headers: srHeaders() },
    );
    if (!res.ok) throw new Error("property_images load failed");
    const rows = await res.json() as Array<{ url?: string }>;
    for (const r of rows) if (r.url) liveUrls.add(r.url);
    if (!Array.isArray(rows) || rows.length < PAGE) break;
  }
  const protectedStaged = new Set<string>();
  for (let offset = 0;; offset += PAGE) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/property_edit_requests?status=eq.pending` +
        `&select=payload,properties!inner(status)&properties.status=neq.archived&limit=${PAGE}&offset=${offset}`,
      { headers: srHeaders() },
    );
    if (!res.ok) throw new Error("edit_requests load failed");
    const rows = await res.json() as Array<{ payload?: { photo_changes?: { add?: Array<{ url?: string }> } } }>;
    for (const r of rows) for (const a of (r.payload?.photo_changes?.add ?? [])) if (a?.url) protectedStaged.add(a.url);
    if (!Array.isArray(rows) || rows.length < PAGE) break;
  }
  return { liveUrls, protectedStaged };
}

// ── R2 ListObjectsV2 (regex parse of the S3 XML) ─────────────────────────────────
function xmlTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].replace(/&amp;/g, "&") : null;
}
async function listPage(token: string | null): Promise<{ objects: Array<{ key: string; lastModified: string | null }>; next: string | null }> {
  const params: Record<string, string> = { "list-type": "2", "prefix": R2_PREFIX, "max-keys": String(PAGE) };
  if (token) params["continuation-token"] = token;
  const { url, headers } = await signR2List(params);
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) throw new Error(`ListObjectsV2 HTTP ${res.status}`);
  const xml = await res.text();
  const objects: Array<{ key: string; lastModified: string | null }> = [];
  for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = xmlTag(m[1], "Key");
    if (key) objects.push({ key, lastModified: xmlTag(m[1], "LastModified") });
  }
  const truncated = xmlTag(xml, "IsTruncated") === "true";
  const next = truncated ? xmlTag(xml, "NextContinuationToken") : null;
  return { objects, next };
}

// ── Handler ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Shared-secret auth (timing-safe; never log the supplied value).
  const secret = Deno.env.get("N8N_WEBHOOK_SECRET") ?? "";
  if (!secret) {
    console.error("N8N_WEBHOOK_SECRET_NOT_CONFIGURED");
    return json({ error: "Service unavailable" }, 503);
  }
  const supplied = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!supplied) return json({ error: "Unauthorized" }, 401);
  const enc = new TextEncoder();
  const a = enc.encode(supplied.padEnd(secret.length, "\0"));
  const b = enc.encode(secret.padEnd(supplied.length, "\0"));
  let diff = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0 || supplied.length !== secret.length) return json({ error: "Unauthorized" }, 401);

  const summary = { reconciled: 0, deleted: 0, protected: 0, retained: 0, invalid: 0, reconcileError: false };

  try {
    // 1) Authoritative reference sets. Failure here aborts the whole run (delete nothing).
    let sets: { liveUrls: Set<string>; protectedStaged: Set<string> };
    try {
      sets = await loadReferenceSets();
    } catch (_e) {
      console.error("REFERENCE_LOAD_FAILED");
      return json({ error: "Reference load failed; no cleanup performed" }, 503);
    }
    const referencedInSets = (fullUrl: string) => sets.liveUrls.has(fullUrl) || sets.protectedStaged.has(fullUrl);

    // 2) Reconciliation (independent from the drain). A listing failure stops only
    //    reconciliation; candidates already enqueued from completed pages remain.
    try {
      const cutoff = Date.now() - GRACE_MS;
      let token: string | null = null;
      do {
        const page = await listPage(token);
        for (const obj of page.objects) {
          if (!isValidPhotoKey(obj.key)) continue;
          if (!obj.lastModified) continue;
          const lm = Date.parse(obj.lastModified);
          if (!Number.isFinite(lm) || lm > cutoff) continue; // missing/malformed or within grace
          const fullUrl = `${R2_PUBLIC_URL}/${obj.key}`;
          if (referencedInSets(fullUrl)) continue;
          await enqueueOutbox(obj.key);
          summary.reconciled++;
        }
        token = page.next;
      } while (token);
    } catch (_e) {
      summary.reconcileError = true;
      console.error("RECONCILE_LISTING_FAILED"); // sanitized; do not classify unscanned objects
    }

    // 3) Drain the durable outbox. Fair order so permanently-failing rows can't starve it.
    const drainRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pending_r2_deletions?select=object_key,attempt_count` +
        `&order=last_attempt_at.asc.nullsfirst,created_at.asc&limit=${DRAIN_LIMIT}`,
      { headers: srHeaders() },
    );
    if (!drainRes.ok) {
      console.error("OUTBOX_LOAD_FAILED", { status: drainRes.status });
      // The queue itself could not be read — a real cleanup failure, not partial success.
      // 503 so the weekly monitor doesn't mistake it for a good run.
      return json({ ...summary, error: "outbox load failed" }, 503);
    }
    const rows = await drainRes.json() as Array<{ object_key: string; attempt_count: number }>;
    for (const row of rows) {
      const key = row.object_key;
      if (!isValidPhotoKey(key)) {
        summary.invalid++;
        await stampOutbox(key, { last_attempt_at: new Date().toISOString(), last_error: "invalid_object_key" });
        continue;
      }
      // Fresh targeted recheck immediately before the destructive delete.
      let referenced: boolean;
      try {
        referenced = await isReferenced(key);
      } catch (_e) {
        summary.retained++;
        await stampOutbox(key, { last_attempt_at: new Date().toISOString(), last_error: "reference_check_failed" });
        continue;
      }
      if (referenced) {
        summary.protected++;
        await clearOutbox(key); // stale intent — now live/carried-forward
        continue;
      }
      const del = await deleteFromR2(key);
      if (del.ok) {
        summary.deleted++;
        await clearOutbox(key);
      } else {
        summary.retained++;
        await stampOutbox(key, {
          last_attempt_at: new Date().toISOString(),
          last_error: (del.error ?? "R2 delete failed").slice(0, 500),
          attempt_count: (row.attempt_count ?? 0) + 1,
        });
      }
    }

    return json(summary, 200);
  } catch (_e) {
    console.error("CLEANUP_UNEXPECTED_ERROR");
    return json({ error: "Unexpected error" }, 500);
  }
});
