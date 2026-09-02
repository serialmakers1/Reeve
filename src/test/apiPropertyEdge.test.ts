import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "../../api/property";

// A realistic post-prerender homepage shell matching real Vite output: the bundled
// module script lives in <head> (NOT after #root), full head SEO, and a NESTED-div #root.
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Reeve | Rentals in Bangalore</title>
    <meta name="description" content="Homepage description." />
    <script type="module" crossorigin src="/assets/index-abc123.js"></script>
    <meta property="og:title" content="Reeve | Rentals in Bangalore" />
    <meta property="og:description" content="Homepage og desc." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <link rel="canonical" href="https://www.reeve.in/" />
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Reeve"}</script>
  </head>
  <body>
    <div id="root"><div class="home"><header><a href="/">Reeve</a></header><main><h1>Home</h1></main></div></div>
  </body>
</html>`;

const VALID_ID = "11111111-1111-4111-8111-111111111111";

type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];

function mockFetch(opts: {
  shellOk?: boolean;
  rows?: unknown[] | null;
  supabaseOk?: boolean;
}) {
  const { shellOk = true, rows = [], supabaseOk = true } = opts;
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    if (url.includes("/index.html")) {
      return new Response(shellOk ? SHELL : "err", { status: shellOk ? 200 : 500 });
    }
    if (url.includes("/rest/v1/properties")) {
      if (!supabaseOk) return new Response("err", { status: 503 });
      return new Response(JSON.stringify(rows ?? []), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
}

function req(id: string): Request {
  return new Request(`https://app.test/api/property?id=${encodeURIComponent(id)}`);
}

const GATE_PASS_ROW = {
  listing_type: "rent",
  building_name: "Prestige Lakeside Habitat",
  locality: "Whitefield",
  city: "Bengaluru",
  listed_rent: 45000,
  sale_price: null,
};

beforeEach(() => {
  calls = [];
  process.env.SUPABASE_URL = "https://db.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "anon-key-123";
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("api/property — public + gate passes", () => {
  it("returns 200, index,follow, property head/body, exactly one canonical, no homepage leakage", async () => {
    mockFetch({ rows: [GATE_PASS_ROW] });
    const res = await handler(req(VALID_ID));
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");

    // Property title + canonical + robots + OG
    expect(html).toContain("<title data-pdp-edge>Prestige Lakeside Habitat for Rent in Whitefield, Bengaluru | Reeve</title>");
    expect(html).toContain('content="index, follow"');
    expect(html).toContain('rel="canonical" href="https://www.reeve.in/property/' + VALID_ID + '"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description" content="₹45,000/month · View this property on Reeve"');
    expect(html).toContain('property="og:url"');

    // exactly one canonical / description / title
    expect((html.match(/rel="canonical"/g) || []).length).toBe(1);
    expect((html.match(/name="description"/g) || []).length).toBe(1);
    expect((html.match(/<title/g) || []).length).toBe(1);

    // homepage ACTIVE head/body stripped (the escaped originals legitimately live in the
    // data-pdp-base carrier for client restore, so check for active tags, not raw substrings).
    expect(html).not.toContain('content="Homepage description."');
    expect(html).not.toContain('<script type="application/ld+json">');
    expect(html).not.toContain('name="twitter:card"');
    expect(html).not.toContain("<h1>Home</h1>");

    // structural integrity: module script present exactly once
    expect((html.match(/<script type="module"/g) || []).length).toBe(1);

    // base-head carrier saved for client restore
    expect(html).toContain("data-pdp-base=");
  });

  it("makes the edge preview visible before JS (#root has the `mounted` class)", async () => {
    mockFetch({ rows: [GATE_PASS_ROW] });
    const res = await handler(req(VALID_ID));
    const html = await res.text();

    // The global CSS hides #root (opacity:0) until #root.mounted — the edge root must be mounted.
    expect(html).toMatch(/<div id="root"[^>]*class="[^"]*\bmounted\b[^"]*"[^>]*>/);
    // Preview content is inside the mounted root
    expect(html).toContain("<h1>Prestige Lakeside Habitat</h1>");
    expect(html).toContain("₹45,000/month");
    // React can still take over: exactly one #root and one module script
    expect((html.match(/id="root"/g) || []).length).toBe(1);
    expect((html.match(/<script type="module"/g) || []).length).toBe(1);
  });

  it("sends apikey only — no Authorization header, no service key", async () => {
    mockFetch({ rows: [GATE_PASS_ROW] });
    await handler(req(VALID_ID));
    const dbCall = calls.find((c) => c.url.includes("/rest/v1/properties"));
    expect(dbCall).toBeTruthy();
    const headers = new Headers(dbCall!.init?.headers);
    expect(headers.get("apikey")).toBe("anon-key-123");
    expect(headers.get("authorization")).toBeNull();
  });
});

describe("api/property — public + gate fails (incomplete record)", () => {
  it("returns 200, noindex,follow, generic title, self-canonical, no OG", async () => {
    mockFetch({ rows: [{ ...GATE_PASS_ROW, locality: null }] });
    const res = await handler(req(VALID_ID));
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("<title data-pdp-edge>Property Listing | Reeve</title>");
    expect(html).toContain('content="noindex, follow"');
    expect(html).toContain('rel="canonical" href="https://www.reeve.in/property/' + VALID_ID + '"');
    expect(html).not.toContain('property="og:');
  });
});

describe("api/property — 404 / malformed / failures", () => {
  it("zero rows → 404 + noindex + no property canonical", async () => {
    mockFetch({ rows: [] });
    const res = await handler(req(VALID_ID));
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(html).toContain('content="noindex"');
    expect(html).not.toContain('rel="canonical" href="https://www.reeve.in/property/');
  });

  it("malformed id → 404 (no supabase call)", async () => {
    mockFetch({ rows: [GATE_PASS_ROW] });
    const res = await handler(req("not-a-uuid"));
    expect(res.status).toBe(404);
    expect(calls.some((c) => c.url.includes("/rest/v1/properties"))).toBe(false);
  });

  it("supabase failure → 5xx (not 404)", async () => {
    mockFetch({ supabaseOk: false });
    const res = await handler(req(VALID_ID));
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it("shell fetch failure → 5xx", async () => {
    mockFetch({ shellOk: false, rows: [GATE_PASS_ROW] });
    const res = await handler(req(VALID_ID));
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

describe("api/property — XSS escaping", () => {
  it("escapes hostile building_name so it cannot break out of the title or inject script", async () => {
    mockFetch({
      rows: [{ ...GATE_PASS_ROW, building_name: `Evil</title><script>alert(1)</script>` }],
    });
    const res = await handler(req(VALID_ID));
    const html = await res.text();
    expect(res.status).toBe(200);
    // No injected script; module script still present exactly once.
    expect(html).not.toContain("<script>alert(1)</script>");
    expect((html.match(/<script type="module"/g) || []).length).toBe(1);
    expect((html.match(/<\/title>/g) || []).length).toBe(1);
    expect(html).toContain("&lt;script&gt;");
  });
});
