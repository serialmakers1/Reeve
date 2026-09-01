/**
 * scripts/generate-sitemap.mjs
 *
 * Generates dist/sitemap.xml after the Vite production build.
 * Run via: node scripts/generate-sitemap.mjs
 * Wired as "postbuild" in package.json so it runs automatically after `npm run build`.
 *
 * ─── ROUTE CLASSIFICATION ────────────────────────────────────────────────────
 *
 * ACTIVE_ROUTES   — live, public, indexable pages. These are emitted into the XML.
 *   Each entry is a route path; the sitemap emits only <loc> (no lastmod/changefreq/
 *   priority — those were build-date/guessed values with no truthful signal).
 *
 * EXCLUDED (documentation guardrail — never add to ACTIVE_ROUTES) — all
 *   private/auth/account/admin routes and dynamic property-detail pages:
 *   /login, /list, /list/:id, /me, /profile, /u/:userId,
 *   /owner-dashboard, /owner-dashboard/*, /tenant-dashboard, /tenant-dashboard/*,
 *   /dashboard/favourites, /admin, /admin/*, /property/:id
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DIST      = path.join(ROOT, 'dist');
const OUT_FILE  = path.join(DIST, 'sitemap.xml');

const BASE_URL  = 'https://www.reeve.in';

// ─── ACTIVE ROUTES ────────────────────────────────────────────────────────────
// Only routes that are live, public, and genuinely indexable.
// Matches public (no auth guard) routes in src/App.tsx. Sitemap emits <loc> only.
const ACTIVE_ROUTES = [
  '/',
  '/search',
  '/contact',
  // Property Services — Bangalore
  '/property-services-bangalore',
  '/property-management-bangalore',
  '/vacant-property-care-bangalore',
  '/find-tenant-bangalore',
  '/khata-transfer-bangalore',
  // Property Services — NRI (India-wide)
  '/nri-property-services-india',
  '/nri-property-sale-india',
  '/nri-rent-tds-india',
  // Legal
  '/privacy',
  '/terms',
  '/refund',
];

// ─── BUILD XML ────────────────────────────────────────────────────────────────

function buildXml(routes) {
  const urls = routes.map((p) => `  <url>
    <loc>${BASE_URL}${p}</loc>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ─── WRITE ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DIST)) {
  console.error('ERROR: dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

const xml = buildXml(ACTIVE_ROUTES);
fs.writeFileSync(OUT_FILE, xml, 'utf8');
console.log(`✓ sitemap.xml written to dist/ with ${ACTIVE_ROUTES.length} URLs`);
ACTIVE_ROUTES.forEach(p => console.log(`  ${BASE_URL}${p}`));
