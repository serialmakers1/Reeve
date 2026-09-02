import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "../../api/sitemap-properties";

type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];

const COMPLETE = {
  listing_type: "rent",
  building_name: "Prestige Lakeside Habitat",
  locality: "Whitefield",
  city: "Bengaluru",
  listed_rent: 45000,
  sale_price: null,
};

/** Mock supabase paged responses: `pages` is an array of row-arrays returned per offset. */
function mockPagedFetch(pages: (Record<string, unknown>[])[], opts: { ok?: boolean } = {}) {
  const { ok = true } = opts;
  let page = 0;
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    if (!ok) return new Response("err", { status: 500 });
    const rows = pages[page] ?? [];
    page += 1;
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

function withId(base: Record<string, unknown>, id: string) {
  return { id, ...base };
}

beforeEach(() => {
  calls = [];
  process.env.SUPABASE_URL = "https://db.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "anon-key-123";
});
afterEach(() => vi.restoreAllMocks());

const req = () => new Request("https://app.test/api/sitemap-properties");

describe("api/sitemap-properties", () => {
  it("emits <loc>-only for complete-record rows; excludes incomplete ones", async () => {
    mockPagedFetch([
      [
        withId(COMPLETE, "aaa"),
        withId({ ...COMPLETE, locality: null }, "bbb"), // incomplete → excluded
        withId({ ...COMPLETE, listing_type: "sale", listed_rent: null, sale_price: 9500000 }, "ccc"),
      ],
    ]);
    const res = await handler(req());
    const xml = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(xml).toContain("<loc>https://www.reeve.in/property/aaa</loc>");
    expect(xml).toContain("<loc>https://www.reeve.in/property/ccc</loc>");
    expect(xml).not.toContain("/property/bbb");
    // no lastmod/changefreq/priority
    expect(xml).not.toMatch(/lastmod|changefreq|priority/);
  });

  it("paginates across multiple batches until exhausted", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => withId(COMPLETE, `p${i}`));
    const tail = [withId(COMPLETE, "last")];
    mockPagedFetch([full, tail]);
    const res = await handler(req());
    const xml = await res.text();
    expect(res.status).toBe(200);
    expect((xml.match(/<loc>/g) || []).length).toBe(1001);
    expect(xml).toContain("/property/last</loc>");
    // two page fetches
    expect(calls.filter((c) => c.url.includes("/rest/v1/properties")).length).toBe(2);
  });

  it("zero public rows → 200 with an empty <urlset>", async () => {
    mockPagedFetch([[]]);
    const res = await handler(req());
    const xml = await res.text();
    expect(res.status).toBe(200);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<loc>");
  });

  it("all public rows fail the gate → 200 empty (distinct from failure)", async () => {
    mockPagedFetch([[withId({ ...COMPLETE, city: null }, "x"), withId({ ...COMPLETE, building_name: "" }, "y")]]);
    const res = await handler(req());
    const xml = await res.text();
    expect(res.status).toBe(200);
    expect(xml).not.toContain("<loc>");
  });

  it("upstream failure → 5xx, never a fake empty 200", async () => {
    mockPagedFetch([], { ok: false });
    const res = await handler(req());
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it("sends apikey only", async () => {
    mockPagedFetch([[withId(COMPLETE, "aaa")]]);
    await handler(req());
    const dbCall = calls.find((c) => c.url.includes("/rest/v1/properties"));
    const headers = new Headers(dbCall!.init?.headers);
    expect(headers.get("apikey")).toBe("anon-key-123");
    expect(headers.get("authorization")).toBeNull();
  });
});
