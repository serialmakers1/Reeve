import { z } from "zod";

export const config = { runtime: "edge" };

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Apostrophe escapes — identical to client, character-for-character:
// ' = ' (U+0027, straight apostrophe)
// ' = ' (U+2018, left single quotation mark)
// ' = ' (U+2019, right single quotation mark)
const SRV_NAME_RE   = /^[\p{L}\p{M} .'''-]{2,80}$/u;
const SRV_BLDG_RE   = /^[\p{L}\p{N} .,'''\-/#&():]{1,120}$/u;
const SRV_LOCALE_RE = /^[\p{L}\p{N} .,'''\-/&()]{2,80}$/u;
const SRV_HAS_L     = /\p{L}/u;
const SRV_HAS_LD    = /[\p{L}\p{N}]/u;
// Intentional: reject C0 control characters and DEL in user input.
// eslint-disable-next-line no-control-regex
const SRV_CTRL      = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const SRV_EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function srvPhone(v: string): boolean {
  const norm = v.trim().replace(/[\s()\-.]/g, "");
  if (!/^\+?\d+$/.test(norm)) return false;
  const digits = norm.replace(/^\+/, "");
  return digits.length >= 7 && digits.length <= 15;
}

const EnquirySchema = z.object({
  serviceChoice: z.enum([
    "property_management",
    "vacant_property_care",
    "find_tenant",
    "nri_property_sale",
    "nri_rent_tds",
    "khata_mutation",
    "not_sure",
  ]),
  buildingStreet: z
    .string()
    .max(120)
    .refine((v) => !v || (SRV_BLDG_RE.test(v.trim()) && SRV_HAS_LD.test(v.trim())))
    .transform((v) => v?.trim() || undefined)
    .optional(),
  localityArea: z
    .string()
    .min(2)
    .max(80)
    .refine((v) => SRV_LOCALE_RE.test(v.trim()) && SRV_HAS_L.test(v.trim()))
    .transform((v) => v.trim()),
  propertyType: z.enum([
    "apartment",
    "villa_row_house",
    "independent_house",
    "plot_land",
  ]),
  name: z
    .string()
    .min(2)
    .max(80)
    .refine((v) => SRV_NAME_RE.test(v.trim()) && SRV_HAS_L.test(v.trim()))
    .transform((v) => v.trim()),
  phone: z
    .string()
    .min(5)
    .max(30)
    .refine((v) => srvPhone(v))
    .transform((v) => v.trim()),
  email: z
    .string()
    .max(254)
    .optional()
    .transform((v) => {
      const t = (v ?? "").trim().toLowerCase();
      return t || null;
    })
    .refine(
      (v) => v === null || (v.length >= 3 && SRV_EMAIL_RE.test(v)),
      "Invalid email"
    ),
  preferredContact: z.enum(["whatsapp", "scheduled_call", "telegram", "botim"]),
  basedIn: z
    .string()
    .min(2)
    .max(80)
    .refine((v) => SRV_LOCALE_RE.test(v.trim()) && SRV_HAS_L.test(v.trim()))
    .transform((v) => v.trim()),
  notes: z
    .string()
    .max(1000)
    .refine((v) => !v || !SRV_CTRL.test(v))
    .transform((v) => v?.trim() || undefined)
    .optional(),
  saleReadiness: z.object({
    titleDocuments:   z.enum(["yes", "no", "unsure"]),
    ownershipRecords: z.enum(["yes", "no", "unsure"]),
    duesCurrent:      z.enum(["yes", "no", "unsure"]),
    ownersAligned:    z.enum(["yes", "no", "unsure"]),
    executionPlan:    z.enum(["yes", "no", "unsure"]),
  }).strict().optional(),
  rentTdsCheck: z.object({
    propertyRented:   z.enum(["yes", "no", "unsure"]),
    tenantDeducting:  z.enum(["yes", "no", "unsure"]),
    deductionRecords: z.enum(["yes", "no", "unsure"]),
    caHandling:       z.enum(["yes", "no", "unsure"]),
    overOneYear:      z.enum(["yes", "no", "unsure"]),
  }).strict().optional(),
  turnstileToken: z.string().min(1),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Env guard — check all three required vars before any other work
  const supabaseUrl        = process.env.SUPABASE_URL;
  const serviceRoleKey     = process.env.SUPABASE_SECRET_KEY;
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey || !turnstileSecretKey) {
    console.error("MISSING_ENV_VARS", {
      supabaseUrl:        !!supabaseUrl,
      serviceRoleKey:     !!serviceRoleKey,
      turnstileSecretKey: !!turnstileSecretKey,
    });
    return json({ error: "Server configuration error" }, 500);
  }

  // Enforce real body size
  const cl = request.headers.get("content-length");
  if (cl && parseInt(cl, 10) > 16_384) {
    return json({ error: "Payload too large" }, 413);
  }
  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).length > 16_384) {
    return json({ error: "Payload too large" }, 413);
  }

  // Parse JSON — confirm it is a non-null plain object
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json({ error: "Invalid request body" }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Honeypot — silently accept if filled (bots only)
  if (body.company_website) {
    return json({ success: true });
  }

  // Strip service-specific context fields for services that don't own them.
  // Guard against null/non-object body shapes (those are left for Zod to reject normally).
  const isObjectBody =
    typeof body === "object" && body !== null && !Array.isArray(body);

  const rawBody = body as Record<string, unknown>;
  const serviceChoice = rawBody.serviceChoice;

  const bodyForValidation = isObjectBody
    ? {
        ...rawBody,
        ...(serviceChoice !== "nri_property_sale"
          ? { saleReadiness: undefined }
          : {}),
        ...(serviceChoice !== "nri_rent_tds"
          ? { rentTdsCheck: undefined }
          : {}),
      }
    : body;

  // Zod validation
  const parsed = EnquirySchema.safeParse(bodyForValidation);
  if (!parsed.success) {
    return json({ error: "Validation failed" }, 400);
  }
  const data = parsed.data;

  // Read Vercel geo headers server-side (never trust client body for these)
  const rawIp =
    request.headers.get("x-real-ip") ??
    ((request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null);

  const rawLat = parseFloat(request.headers.get("x-vercel-ip-latitude") ?? "");
  const rawLng = parseFloat(request.headers.get("x-vercel-ip-longitude") ?? "");
  const ipLatitude  = isFinite(rawLat) && rawLat >= -90  && rawLat <= 90  ? rawLat  : null;
  const ipLongitude = isFinite(rawLng) && rawLng >= -180 && rawLng <= 180 ? rawLng : null;

  let ipCity: string | null = null;
  try {
    const raw = request.headers.get("x-vercel-ip-city");
    ipCity = raw ? decodeURIComponent(raw) : null;
  } catch {
    ipCity = null;
  }

  // Turnstile verification
  const tsForm = new FormData();
  tsForm.append("secret",   turnstileSecretKey);
  tsForm.append("response", data.turnstileToken);
  if (rawIp) tsForm.append("remoteip", rawIp);

  let tsRes: { success: boolean; action?: string };
  try {
    const r = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: tsForm });
    tsRes = (await r.json()) as { success: boolean; action?: string };
  } catch {
    return json(
      { success: false, error: "Verification failed. Please try again.", code: "turnstile_failed" },
      403
    );
  }

  if (!tsRes.success || tsRes.action !== "property_enquiry") {
    return json(
      { success: false, error: "Verification failed. Please try again.", code: "turnstile_failed" },
      403
    );
  }

  // Build row
  const row = {
    service_choice:    data.serviceChoice,
    building_street:   data.buildingStreet ?? null,
    locality_area:     data.localityArea,
    property_type:     data.propertyType,
    name:              data.name,
    phone:             data.phone,
    email:             data.email,
    preferred_contact: data.preferredContact,
    based_in:          data.basedIn,
    notes:             data.notes ?? null,
    ...(data.serviceChoice === "nri_property_sale" && data.saleReadiness
      ? { sale_readiness: data.saleReadiness }
      : {}),
    ...(data.serviceChoice === "nri_rent_tds" && data.rentTdsCheck
      ? { rent_tds_check: data.rentTdsCheck }
      : {}),
    request_ip:        rawIp,
    ip_country:        request.headers.get("x-vercel-ip-country") ?? null,
    ip_region:         request.headers.get("x-vercel-ip-country-region") ?? null,
    ip_city:           ipCity,
    ip_latitude:       ipLatitude,
    ip_longitude:      ipLongitude,
    ip_timezone:       request.headers.get("x-vercel-ip-timezone") ?? null,
    ip_postal_code:    request.headers.get("x-vercel-ip-postal-code") ?? null,
  };

  // Insert via service role — apikey header only (sb_secret_* keys are not JWTs).
  // Return only the inserted id/created_at so we can populate the notification.
  const dbRes = await fetch(
    `${supabaseUrl}/rest/v1/property_service_enquiries?select=id,created_at`,
    {
      method: "POST",
      headers: {
        apikey:           serviceRoleKey,
        "Content-Type":   "application/json",
        Prefer:           "return=representation",
      },
      body: JSON.stringify(row),
    }
  );

  if (!dbRes.ok) {
    const errText = await dbRes.text().catch(() => "(unreadable)");
    console.error("Supabase insert failed", dbRes.status, errText);
    return json({ error: "Could not save enquiry" }, 500);
  }

  // DB insert succeeded — the enquiry is authoritatively saved from here on.
  // Everything below is best-effort notification and MUST NOT convert a saved
  // enquiry into a customer-facing failure.

  // Parse the returned representation defensively.
  const rep: unknown = await dbRes.json().catch(() => null);
  const inserted =
    Array.isArray(rep) && rep[0] && typeof rep[0] === "object"
      ? (rep[0] as { id?: unknown; created_at?: unknown })
      : null;
  const insertedId = typeof inserted?.id === "string" ? inserted.id : null;
  const insertedCreatedAt =
    typeof inserted?.created_at === "string" ? inserted.created_at : null;

  if (!insertedId || !insertedCreatedAt) {
    // Saved, but representation unexpectedly missing/malformed — skip notify.
    console.warn("enquiry_persisted_no_representation");
    return json({ success: true });
  }

  // Best-effort authenticated n8n notification. These env vars are OPTIONAL
  // notification dependencies — deliberately NOT part of the hard env guard.
  const n8nBaseUrl = process.env.N8N_WEBHOOK_BASE_URL;
  const n8nSecret  = process.env.N8N_WEBHOOK_SECRET;

  if (!n8nBaseUrl || !n8nSecret) {
    console.warn("n8n_notify_skipped_missing_env", { enquiry_id: insertedId });
    return json({ success: true });
  }

  // Explicit allow-listed payload built from validated data — never the DB row,
  // never the raw IP/lat/long, the Turnstile token, or any secret. Coarse geo
  // context (country/region/city/timezone/postal) is included so n8n can render
  // it in the notification; it reuses the already-decoded/validated values.
  const webhookPayload = {
    event:             "property_service_enquiry_created",
    enquiry_id:        insertedId,
    created_at:        insertedCreatedAt,
    service_choice:    data.serviceChoice,
    building_street:   data.buildingStreet ?? null,
    locality_area:     data.localityArea,
    property_type:     data.propertyType,
    name:              data.name,
    phone:             data.phone,
    email:             data.email,
    preferred_contact: data.preferredContact,
    based_in:          data.basedIn,
    notes:             data.notes ?? null,
    sale_readiness:
      data.serviceChoice === "nri_property_sale" ? data.saleReadiness ?? null : null,
    rent_tds_check:
      data.serviceChoice === "nri_rent_tds" ? data.rentTdsCheck ?? null : null,
    ip_country:     request.headers.get("x-vercel-ip-country") ?? null,
    ip_region:      request.headers.get("x-vercel-ip-country-region") ?? null,
    ip_city:        ipCity,
    ip_timezone:    request.headers.get("x-vercel-ip-timezone") ?? null,
    ip_postal_code: request.headers.get("x-vercel-ip-postal-code") ?? null,
  };

  const webhookUrl = `${n8nBaseUrl.replace(/\/+$/, "")}/property-service-enquiry`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${n8nSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    });
    if (!nRes.ok) {
      // Log only safe stage/status/enquiry-id — no headers, secrets, payload, PII, or body.
      console.warn("n8n_notify_non_2xx", {
        status: nRes.status,
        enquiry_id: insertedId,
      });
    }
  } catch {
    // Timeout / network error — never surface to the customer path.
    console.warn("n8n_notify_error", { enquiry_id: insertedId });
  } finally {
    clearTimeout(timeout);
  }

  return json({ success: true });
}
