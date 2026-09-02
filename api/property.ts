/**
 * api/property.ts — Edge SEO handler for /property/:id
 *
 * Vercel rewrites `/property/:id → /api/property` (named param auto-passed as ?id).
 * Uses the anonymous/publishable key so Postgres RLS is the sole public/private
 * authority: a row returns iff the property is public. No `status` is fetched.
 *
 * Three outcomes (index-vs-noindex set by the complete-record content gate):
 *   - public + gate passes → 200, index,follow, self-canonical, OG, sitemap-eligible
 *   - public + gate fails  → 200, noindex,follow, self-canonical, generic title, no OG
 *   - no row / malformed   → 404, noindex, no property canonical/OG
 * Upstream/shell failure → 5xx (never a masked 404). Response is always
 * `text/html; charset=utf-8` + `no-store`.
 *
 * All request state is local to this handler (no module-level mutable globals),
 * so concurrent requests cannot cross-contaminate.
 */

import {
  type PropertySeoRow,
  passesIndexabilityGate,
  listingWord,
  priceText,
  buildPropertyTitle,
  buildPropertyDescription,
  buildOgTitle,
  buildOgDescription,
  buildPropertyCanonical,
  htmlEscape,
  GATE_FAIL_TITLE,
  GATE_FAIL_DESCRIPTION,
  UNAVAILABLE_TITLE,
} from "../src/lib/seo/propertyMeta";

export const config = { runtime: "edge" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEO_COLUMNS = "listing_type,building_name,locality,city,listed_rent,sale_price";

// Head tags Group 2 replaces/removes (all matched globally so multiple og:*/
// twitter:*/JSON-LD tags are collected + stripped). Collected originals are stored
// in `data-pdp-base` so the client can restore the homepage head on route-exit.
const MANAGED_PATTERNS: RegExp[] = [
  /<title[^>]*>[\s\S]*?<\/title>/gi,
  /<meta\b[^>]*\bname=["']description["'][^>]*>/gi,
  /<meta\b[^>]*\bname=["']robots["'][^>]*>/gi,
  /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi,
  /<meta\b[^>]*\bproperty=["']og:[^"']*["'][^>]*>/gi,
  /<meta\b[^>]*\bname=["']twitter:[^"']*["'][^>]*>/gi,
  /<script\b[^>]*type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi,
];

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** Collect + remove the managed homepage head tags. Returns the stripped html and the originals. */
function stripManagedHead(html: string): { html: string; base: string[] } {
  const base: string[] = [];
  let out = html;
  for (const re of MANAGED_PATTERNS) {
    const matches = out.match(re);
    if (matches) base.push(...matches);
    out = out.replace(re, "");
  }
  return { html: out, base };
}

/** Add `mounted` to a `<div id="root" ...>` opening tag, preserving any existing class.
 * The global CSS hides `#root` (opacity:0) until `#root.mounted`; `main.tsx` adds `mounted`
 * only after React boots, so the edge preview must be `mounted` to be visible before JS. */
function addMountedClass(openTag: string): string {
  const classRe = /\bclass=["']([^"']*)["']/i;
  const m = classRe.exec(openTag);
  if (m) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    if (!classes.includes("mounted")) classes.push("mounted");
    return openTag.replace(classRe, `class="${classes.join(" ")}"`);
  }
  // No class attribute — append one just before the tag's closing `>`.
  return openTag.replace(/>$/, ` class="mounted">`);
}

/**
 * Robustly replace the (possibly non-empty, nested) #root content — no naïve regex.
 * The bundled module script lives in <head>, so the root close is the last `</div>`
 * before `</body>` (not before a trailing script). Handles arbitrary nested divs.
 * The edge-produced root is marked `mounted` so the preview is visible before JS boots.
 */
function replaceRoot(html: string, bodyHtml: string): string | null {
  const start = html.indexOf('<div id="root"');
  if (start === -1) return null;
  const openTagEnd = html.indexOf(">", start);
  if (openTagEnd === -1) return null;
  const openTag = addMountedClass(html.slice(start, openTagEnd + 1));
  const contentStart = openTagEnd + 1;
  const bodyCloseIdx = html.indexOf("</body>", contentStart);
  if (bodyCloseIdx === -1) return null;
  const closeIdx = html.lastIndexOf("</div>", bodyCloseIdx);
  if (closeIdx === -1 || closeIdx < contentStart) return null;
  return html.slice(0, start) + openTag + bodyHtml + html.slice(closeIdx);
}

function edgeMeta(name: string, content: string): string {
  return `<meta name="${name}" content="${htmlEscape(content)}" data-pdp-edge>`;
}
function edgeOg(property: string, content: string): string {
  return `<meta property="${property}" content="${htmlEscape(content)}" data-pdp-edge>`;
}

function bodyPreview(inner: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px">${inner}</div>`;
}

function propertyBody(row: PropertySeoRow): string {
  const b = htmlEscape((row.building_name ?? "").trim());
  const place = htmlEscape([row.locality, row.city].map((x) => (x ?? "").trim()).filter(Boolean).join(", "));
  const word = listingWord(row);
  const price = htmlEscape(priceText(row));
  return bodyPreview(
    `<main>` +
      `<h1>${b}</h1>` +
      (place ? `<p>${place}</p>` : "") +
      (word ? `<p>For ${word}</p>` : "") +
      (price ? `<p>${price}</p>` : "") +
      `<p>View this property on Reeve.</p>` +
      `<p><a href="/search">Browse properties on Reeve</a></p>` +
      `</main>`,
  );
}

const GENERIC_BODY = bodyPreview(
  `<main><h1>Property Listing</h1><p>View this property on Reeve.</p>` +
    `<p><a href="/search">Browse properties on Reeve</a></p></main>`,
);

const UNAVAILABLE_BODY = bodyPreview(
  `<main><h1>This listing is no longer available</h1>` +
    `<p>The owner may have taken it off the market.</p>` +
    `<p><a href="/search">Browse properties on Reeve</a></p></main>`,
);

/**
 * Patch the shell: strip managed homepage head into `data-pdp-base` on <html>,
 * inject property head tags (marked `data-pdp-edge`), replace #root body.
 * Returns null if the shell is structurally unexpected (→ caller returns 5xx).
 */
function buildPage(
  shell: string,
  opts: {
    title: string;
    description: string;
    robots: string;
    canonical: string | null;
    og: { title: string; description: string; url: string } | null;
    body: string;
  },
): string | null {
  const { html: stripped, base } = stripManagedHead(shell);

  const headTags: string[] = [
    `<title data-pdp-edge>${htmlEscape(opts.title)}</title>`,
    edgeMeta("description", opts.description),
    edgeMeta("robots", opts.robots),
  ];
  if (opts.canonical) {
    headTags.push(`<link rel="canonical" href="${htmlEscape(opts.canonical)}" data-pdp-edge>`);
  }
  if (opts.og) {
    headTags.push(edgeOg("og:title", opts.og.title));
    headTags.push(edgeOg("og:description", opts.og.description));
    headTags.push(edgeOg("og:url", opts.og.url));
  }

  let out = stripped.replace("</head>", `    ${headTags.join("\n    ")}\n  </head>`);

  // Base-head carrier for client on-leave restoration (attribute-escaped JSON).
  const baseAttr = htmlEscape(JSON.stringify(base));
  out = out.replace(/<html(\s|>)/i, `<html data-pdp-base="${baseAttr}"$1`);

  return replaceRoot(out, opts.body);
}

export default async function handler(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const id = new URL(request.url).searchParams.get("id") ?? "";

  // Fetch the shell (current deployment origin) + the property row concurrently.
  const shellPromise = fetch(new URL("/index.html", request.url).toString()).then(async (r) => {
    if (!r.ok) throw new Error(`shell ${r.status}`);
    return r.text();
  });

  const rowPromise: Promise<PropertySeoRow | null> = (async () => {
    if (!UUID_RE.test(id)) return null; // malformed → treated as no row (404)
    if (!supabaseUrl || !anonKey) throw new Error("missing supabase env");
    const endpoint =
      `${supabaseUrl}/rest/v1/properties` +
      `?id=eq.${encodeURIComponent(id)}&select=${SEO_COLUMNS}&limit=1`;
    const res = await fetch(endpoint, {
      headers: { apikey: anonKey, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const rows = (await res.json()) as PropertySeoRow[];
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  })();

  let shell: string;
  let row: PropertySeoRow | null;
  try {
    [shell, row] = await Promise.all([shellPromise, rowPromise]);
  } catch {
    // Property-record OR shell fetch failure → 5xx (never a masked 404).
    return htmlResponse("<!doctype html><title>Server error</title>", 500);
  }

  // No public row (or malformed id) → real 404, noindex, no property canonical/OG.
  if (!row) {
    const page = buildPage(shell, {
      title: UNAVAILABLE_TITLE,
      description: "This property listing is no longer available on Reeve.",
      robots: "noindex",
      canonical: null,
      og: null,
      body: UNAVAILABLE_BODY,
    });
    if (page == null) return htmlResponse("<!doctype html><title>Server error</title>", 500);
    return htmlResponse(page, 404);
  }

  const canonical = buildPropertyCanonical(id);

  if (passesIndexabilityGate(row)) {
    const page = buildPage(shell, {
      title: buildPropertyTitle(row),
      description: buildPropertyDescription(row),
      robots: "index, follow",
      canonical,
      og: {
        title: buildOgTitle(row),
        description: buildOgDescription(row),
        url: canonical,
      },
      body: propertyBody(row),
    });
    if (page == null) return htmlResponse("<!doctype html><title>Server error</title>", 500);
    return htmlResponse(page, 200);
  }

  // Public but incomplete record → 200, noindex,follow, generic metadata, no OG.
  const page = buildPage(shell, {
    title: GATE_FAIL_TITLE,
    description: GATE_FAIL_DESCRIPTION,
    robots: "noindex, follow",
    canonical,
    og: null,
    body: GENERIC_BODY,
  });
  if (page == null) return htmlResponse("<!doctype html><title>Server error</title>", 500);
  return htmlResponse(page, 200);
}
