import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "../../api/submit-property-enquiry";

const N8N_BASE = "https://n8n.example.com/webhook";
const N8N_URL = `${N8N_BASE}/property-service-enquiry`;
const N8N_SECRET = "n8n-secret-abc";

type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];

function n8nCalls() {
  return calls.filter((c) => c.url.includes("/property-service-enquiry"));
}

function mockFetch(opts: {
  turnstileOk?: boolean;
  supabaseStatus?: number;
  representation?: unknown;
  n8nStatus?: number;
  n8nThrow?: boolean;
  n8nHang?: boolean; // reject only when aborted (simulates timeout)
} = {}) {
  const {
    turnstileOk = true,
    supabaseStatus = 201,
    representation = [{ id: "enq-123", created_at: "2026-09-05T10:00:00Z" }],
    n8nStatus = 200,
    n8nThrow = false,
    n8nHang = false,
  } = opts;

  global.fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push({ url, init });

      if (url.includes("challenges.cloudflare.com")) {
        return new Response(
          JSON.stringify(
            turnstileOk
              ? { success: true, action: "property_enquiry" }
              : { success: false }
          ),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.includes("/rest/v1/property_service_enquiries")) {
        return new Response(
          supabaseStatus >= 400 ? "err" : JSON.stringify(representation),
          {
            status: supabaseStatus,
            headers: { "content-type": "application/json" },
          }
        );
      }

      if (url.includes("/property-service-enquiry")) {
        if (n8nThrow) throw new Error("network down");
        if (n8nHang) {
          return await new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("aborted"))
            );
          });
        }
        return new Response(n8nStatus >= 200 && n8nStatus < 300 ? "ok" : "err", {
          status: n8nStatus,
        });
      }

      return new Response("not found", { status: 404 });
    }
  ) as unknown as typeof fetch;
}

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    serviceChoice: "property_management",
    buildingStreet: "12 MG Road",
    localityArea: "Indiranagar",
    propertyType: "apartment",
    name: "Asha Rao",
    phone: "+919876543210",
    email: "asha@example.com",
    preferredContact: "whatsapp",
    basedIn: "Bengaluru",
    notes: "Please call after 6pm",
    turnstileToken: "tok-1",
    ...overrides,
  };
}

function req(body: unknown, geoHeaders: Record<string, string> = {}): Request {
  return new Request("https://app.test/api/submit-property-enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...geoHeaders },
    body: JSON.stringify(body),
  });
}

const GEO_HEADERS = {
  "x-vercel-ip-country": "IN",
  "x-vercel-ip-country-region": "KA",
  "x-vercel-ip-city": "Bengaluru",
  "x-vercel-ip-timezone": "Asia/Kolkata",
  "x-vercel-ip-postal-code": "560001",
  // Excluded fields — present on the request but must NOT reach the webhook.
  "x-real-ip": "203.0.113.9",
  "x-vercel-ip-latitude": "12.97",
  "x-vercel-ip-longitude": "77.59",
};

function n8nPayload() {
  const call = n8nCalls()[0];
  return JSON.parse(call.init!.body as string);
}

beforeEach(() => {
  calls = [];
  process.env.SUPABASE_URL = "https://db.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_xyz";
  process.env.TURNSTILE_SECRET_KEY = "ts-secret";
  process.env.N8N_WEBHOOK_BASE_URL = N8N_BASE;
  process.env.N8N_WEBHOOK_SECRET = N8N_SECRET;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("submit-property-enquiry — n8n notification", () => {
  it("dispatches exactly one n8n request on successful insert", async () => {
    mockFetch();
    const res = await handler(req(baseBody()));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(n8nCalls()).toHaveLength(1);
  });

  it("populates webhook with returned DB id and created_at", async () => {
    mockFetch({
      representation: [{ id: "enq-999", created_at: "2026-09-05T12:34:56Z" }],
    });
    await handler(req(baseBody()));
    const p = n8nPayload();
    expect(p.event).toBe("property_service_enquiry_created");
    expect(p.enquiry_id).toBe("enq-999");
    expect(p.created_at).toBe("2026-09-05T12:34:56Z");
  });

  it("sends Authorization: Bearer <secret>", async () => {
    mockFetch();
    await handler(req(baseBody()));
    const headers = new Headers(n8nCalls()[0].init!.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${N8N_SECRET}`);
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("builds the URL from N8N_WEBHOOK_BASE_URL and normalizes a trailing slash", async () => {
    process.env.N8N_WEBHOOK_BASE_URL = N8N_BASE + "/";
    mockFetch();
    await handler(req(baseBody()));
    expect(n8nCalls()[0].url).toBe(N8N_URL);
  });

  it("includes coarse geo context from the Vercel request headers / decoded ipCity", async () => {
    mockFetch();
    await handler(req(baseBody(), GEO_HEADERS));
    const p = n8nPayload();
    expect(p.ip_country).toBe("IN");
    expect(p.ip_region).toBe("KA");
    expect(p.ip_city).toBe("Bengaluru");
    expect(p.ip_timezone).toBe("Asia/Kolkata");
    expect(p.ip_postal_code).toBe("560001");
  });

  it("missing geo headers produce null geo values without affecting submission", async () => {
    mockFetch();
    const res = await handler(req(baseBody())); // no geo headers
    await expect(res.json()).resolves.toEqual({ success: true });
    const p = n8nPayload();
    expect(p.ip_country).toBeNull();
    expect(p.ip_region).toBeNull();
    expect(p.ip_city).toBeNull();
    expect(p.ip_timezone).toBeNull();
    expect(p.ip_postal_code).toBeNull();
  });

  it("excludes request_ip / lat / long / Turnstile / secrets from the payload", async () => {
    mockFetch();
    await handler(req(baseBody(), GEO_HEADERS));
    const p = n8nPayload();
    for (const k of [
      "request_ip",
      "ip_latitude",
      "ip_longitude",
      "turnstileToken",
      "turnstile_token",
    ]) {
      expect(p).not.toHaveProperty(k);
    }
    // No secret leaks through the payload body.
    const bodyStr = n8nCalls()[0].init!.body as string;
    expect(bodyStr).not.toContain(N8N_SECRET);
    expect(bodyStr).not.toContain(process.env.SUPABASE_SECRET_KEY!);
    expect(bodyStr).not.toContain("203.0.113.9");
  });

  it("NRI Sale includes only sale_readiness", async () => {
    mockFetch();
    const sale = {
      titleDocuments: "yes",
      ownershipRecords: "yes",
      duesCurrent: "no",
      ownersAligned: "unsure",
      executionPlan: "yes",
    };
    await handler(
      req(baseBody({ serviceChoice: "nri_property_sale", saleReadiness: sale }))
    );
    const p = n8nPayload();
    expect(p.sale_readiness).toEqual(sale);
    expect(p.rent_tds_check).toBeNull();
  });

  it("NRI Rent/TDS includes only rent_tds_check", async () => {
    mockFetch();
    const rent = {
      propertyRented: "yes",
      tenantDeducting: "no",
      deductionRecords: "unsure",
      caHandling: "no",
      overOneYear: "yes",
    };
    await handler(
      req(baseBody({ serviceChoice: "nri_rent_tds", rentTdsCheck: rent }))
    );
    const p = n8nPayload();
    expect(p.rent_tds_check).toEqual(rent);
    expect(p.sale_readiness).toBeNull();
  });

  it("normal services send both service-specific contexts as null", async () => {
    mockFetch();
    await handler(req(baseBody({ serviceChoice: "find_tenant" })));
    const p = n8nPayload();
    expect(p.sale_readiness).toBeNull();
    expect(p.rent_tds_check).toBeNull();
  });

  it("DB failure → zero n8n requests and customer failure", async () => {
    mockFetch({ supabaseStatus: 500 });
    const res = await handler(req(baseBody()));
    expect(res.status).toBe(500);
    expect(n8nCalls()).toHaveLength(0);
  });

  it("Turnstile failure → zero n8n requests and no DB insert", async () => {
    mockFetch({ turnstileOk: false });
    const res = await handler(req(baseBody()));
    expect(res.status).toBe(403);
    expect(n8nCalls()).toHaveLength(0);
    expect(
      calls.some((c) => c.url.includes("/rest/v1/property_service_enquiries"))
    ).toBe(false);
  });

  it("honeypot → zero n8n requests and no DB insert", async () => {
    mockFetch();
    const res = await handler(req(baseBody({ company_website: "spam" })));
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(n8nCalls()).toHaveLength(0);
    expect(
      calls.some((c) => c.url.includes("/rest/v1/property_service_enquiries"))
    ).toBe(false);
  });

  it("n8n 500 → customer still receives success after DB save", async () => {
    mockFetch({ n8nStatus: 500 });
    const res = await handler(req(baseBody()));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(n8nCalls()).toHaveLength(1);
  });

  it("n8n network error → customer success", async () => {
    mockFetch({ n8nThrow: true });
    const res = await handler(req(baseBody()));
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("n8n timeout (abort) → customer success", async () => {
    vi.useFakeTimers();
    mockFetch({ n8nHang: true });
    const p = handler(req(baseBody()));
    await vi.advanceTimersByTimeAsync(5000);
    const res = await p;
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("missing N8N_WEBHOOK_BASE_URL → customer success, no n8n dispatch", async () => {
    delete process.env.N8N_WEBHOOK_BASE_URL;
    mockFetch();
    const res = await handler(req(baseBody()));
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(n8nCalls()).toHaveLength(0);
  });

  it("missing N8N_WEBHOOK_SECRET → customer success, no n8n dispatch", async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    mockFetch();
    const res = await handler(req(baseBody()));
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(n8nCalls()).toHaveLength(0);
  });

  it("malformed/empty DB representation → customer success and no n8n dispatch", async () => {
    mockFetch({ representation: [] });
    const res = await handler(req(baseBody()));
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(n8nCalls()).toHaveLength(0);
  });
});
