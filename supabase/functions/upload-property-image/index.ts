const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10485760; // 10MB

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
  contentType: string,
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
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

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
      "Content-Type": contentType,
      "Host": host,
    },
  };
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // A) CORS on every response — handled per return below
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

    // E) Parse multipart/form-data
    const formData = await req.formData();
    const fileField = formData.get("file");
    const propertyId = formData.get("property_id");
    const section = formData.get("section") as string | null;
    const isFloorPlanRaw = formData.get("is_floor_plan");
    const isFloorPlan = isFloorPlanRaw === "true";
    // Optional (Prompt 4): route upload into an existing pending edit request's payload
    // instead of directly inserting to property_images. Used when owner uploads photos
    // while modifying an already-submitted edit.
    const pendingEditRequestIdRaw = formData.get("pending_edit_request_id");
    const pendingEditRequestId = pendingEditRequestIdRaw ? pendingEditRequestIdRaw.toString() : null;

    if (!fileField || !propertyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing file or property_id" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // F) Validate property_id
    const propertyIdStr = propertyId.toString();
    if (!UUID_REGEX.test(propertyIdStr)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid property_id" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // F.1) Validate pending_edit_request_id if present
    if (pendingEditRequestId && !UUID_REGEX.test(pendingEditRequestId)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid pending_edit_request_id" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // F.5) Ownership + status resolution. Service role is used ONLY for these trusted
    // lookups; the DB mutation (direct insert) runs with the CALLER's JWT so RLS +
    // the property_images guard see the real auth.uid()/is_admin() (M5).
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const srHeaders = {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    const roleRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=role`,
      { headers: srHeaders },
    );
    const roleRows = await roleRes.json();
    const userRole: string = roleRows?.[0]?.role ?? "";
    const isAdmin = userRole === "admin" || userRole === "super_admin";

    const propRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${propertyIdStr}&select=owner_id,status`,
      { headers: srHeaders },
    );
    const propRows = await propRes.json();
    const propRow = propRows?.[0];
    if (!propRow) {
      return new Response(JSON.stringify({ success: false, error: "Property not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const ownerId: string = propRow.owner_id ?? "";
    const propStatus: string = propRow.status ?? "";
    if (!isAdmin && ownerId !== userId) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Resolve upload mode by status (M5, decision 2):
    //   admin OR draft/changes_requested → direct insert (initial-listing flow)
    //   owner + listed/edit_pending_review → STAGED (storage-only; no row, no status change)
    //   owner + pending_review/unlisted/archived → frozen (reject)
    // pending_edit_request_id is intentionally ignored — uploads never mutate an edit request;
    // staged photos are attached to photo_changes.add only at explicit Submit.
    let mode: "direct" | "staged";
    if (isAdmin || propStatus === "draft" || propStatus === "changes_requested") {
      mode = "direct";
    } else if (propStatus === "listed" || propStatus === "edit_pending_review") {
      mode = "staged";
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Photo uploads are not allowed while the listing is ${propStatus}` }),
        { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    void pendingEditRequestId;

    // G) Validate file type
    const file = fileField as File;
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ success: false, error: "File must be jpeg, png, or webp" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // H) Check file size
    const fileBuffer = await file.arrayBuffer();
    if (fileBuffer.byteLength > MAX_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: "File too large. Max 10MB" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // I) Build file path
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[file.type];
    // Collision-resistant object key: timestamp alone could collide for two
    // uploads to the same property within the same millisecond. A random UUID
    // suffix guarantees distinct keys. Identity is still server-generated; the
    // original filename is never used as object identity.
    const filePath = `properties/${propertyIdStr}/photos/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // J) Sign and upload to R2
    const { url: r2Url, headers: r2Headers } = await signR2Request(
      "PUT",
      filePath,
      fileBuffer,
      file.type,
    );

    const r2Res = await fetch(r2Url, {
      method: "PUT",
      headers: r2Headers,
      body: fileBuffer,
    });

    if (r2Res.status !== 200) {
      return new Response(
        JSON.stringify({ success: false, error: "R2 upload failed", r2Status: r2Res.status }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // K) Build public URL
    const publicUrl = `${R2_PUBLIC_URL}/${filePath}`;

    // L) Staged mode: return the R2 reference only. No DB row, no status change.
    // The frontend holds this in pending-edit state; submit_property_edit_request
    // attaches it to photo_changes.add on explicit Submit. The property_images guard
    // is defense-in-depth so a raw insert still cannot expose an unreviewed photo.
    if (mode === "staged") {
      return new Response(
        JSON.stringify({
          success: true,
          staged: true,
          url: publicUrl,
          section: section || null,
          is_floor_plan: isFloorPlan,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Direct-insert path (draft/changes_requested owner, or admin) — CALLER JWT so
    // RLS + is_admin() apply correctly (M5/F1). Never service_role for the mutation.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/property_images`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        property_id: propertyIdStr,
        uploaded_by: userId,
        url: publicUrl,
        thumbnail_url: null,
        caption: null,
        is_floor_plan: isFloorPlan,
        is_primary: false,
        sort_order: 0,
        section: section || null,
      }),
    });

    if (!insertRes.ok) {
      await insertRes.text(); // consume body; not logged (may contain DB internals)
      console.error("UPLOAD_DB_INSERT_FAILED", { status: insertRes.status });
      return new Response(JSON.stringify({ success: false, error: "Upload failed" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const insertedRows = await insertRes.json();
    const insertedRow = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

    // M) Return success
    return new Response(
      JSON.stringify({ success: true, url: publicUrl, id: insertedRow.id }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    // N) Catch-all
    console.error("UPLOAD_UNEXPECTED_ERROR");
    return new Response(JSON.stringify({ success: false, error: "Unexpected error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
