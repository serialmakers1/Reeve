/**
 * api/sitemap-properties.ts — dynamic property sitemap, served at /sitemap-properties.xml
 *
 * Anonymous/publishable key ⇒ RLS returns only public rows. Fetches id + the six
 * content-gate fields in deterministic paginated batches and emits `<loc>`-only
 * entries for rows that pass the SAME shared `passesIndexabilityGate()` as the PDP,
 * so the sitemap is a strict subset of the indexable set.
 *
 *   - upstream/query failure → 5xx (never a masked empty 200)
 *   - zero sitemap-eligible rows (no public rows, or all fail the gate) → 200 empty <urlset>
 *
 * `<loc>` only (no lastmod — no truthful per-listing content-modified timestamp yet).
 */

import { type PropertySeoRow, passesIndexabilityGate } from "../src/lib/seo/propertyMeta";

export const config = { runtime: "edge" };

const BASE = "https://www.reeve.in";
const PAGE_SIZE = 1000;
const MAX_URLS = 50000; // sitemap-protocol guardrail; split into an index only if approached.
const GATE_COLUMNS = "id,building_name,locality,city,listing_type,listed_rent,sale_price";

type Row = PropertySeoRow & { id: string };

export default async function handler(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const ids: string[] = [];
  try {
    if (!supabaseUrl || !anonKey) throw new Error("missing supabase env");
    for (let offset = 0; ids.length < MAX_URLS; offset += PAGE_SIZE) {
      const endpoint =
        `${supabaseUrl}/rest/v1/properties` +
        `?select=${GATE_COLUMNS}&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(endpoint, {
        headers: { apikey: anonKey, accept: "application/json" },
      });
      if (!res.ok) throw new Error(`supabase ${res.status}`);
      const rows = (await res.json()) as Row[];
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const row of rows) {
        if (ids.length >= MAX_URLS) break;
        if (passesIndexabilityGate(row)) ids.push(row.id);
      }
      if (rows.length < PAGE_SIZE) break;
    }
  } catch {
    return new Response("<!-- upstream error -->", {
      status: 502,
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const urls = ids
    .map((id) => `  <url>\n    <loc>${BASE}/property/${id}</loc>\n  </url>`)
    .join("\n");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    (urls ? urls + "\n" : "") +
    `</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" },
  });
}
