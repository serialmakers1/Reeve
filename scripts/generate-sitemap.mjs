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
 *
 * PLANNED_SEO_ROUTES (TODO) — owner/NRI/location marketing pages that are NOT yet
 *   live. They must NOT appear in the sitemap until the corresponding routes and
 *   page components exist in src/App.tsx. Activate them by moving entries from
 *   the PLANNED_SEO_ROUTES block below into ACTIVE_ROUTES.
 *
 * EXCLUDED (never include) — all private/protected/auth/dashboard/admin routes:
 *   /login, /refer-property, /eligibility, /my-properties, /my-properties/*,
 *   /profile, /owner, /owner/dashboard, /owner/properties/*, /owner/applications/*,
 *   /dashboard, /dashboard/*, /admin, /admin/*, /property/:id
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DIST      = path.join(ROOT, 'dist');
const OUT_FILE  = path.join(DIST, 'sitemap.xml');

const BASE_URL  = 'https://reeve.in';
const TODAY     = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ─── ACTIVE ROUTES ────────────────────────────────────────────────────────────
// Only routes that are live, public, and genuinely indexable.
// Matches routes in src/App.tsx that have no auth guard.
const ACTIVE_ROUTES = [
  {
    path:        '/',
    changefreq:  'weekly',
    priority:    '1.00',
  },
  {
    path:        '/owners',
    changefreq:  'weekly',
    priority:    '0.95',
  },
  {
    path:        '/search',
    changefreq:  'daily',
    priority:    '0.75',
  },
  {
    path:        '/savings/tenant',
    changefreq:  'monthly',
    priority:    '0.70',
  },
  {
    path:        '/contact',
    changefreq:  'monthly',
    priority:    '0.70',
  },
  {
    path:        '/move-in-audit',
    changefreq:  'monthly',
    priority:    '0.85',
  },
  {
    path:        '/privacy',
    changefreq:  'yearly',
    priority:    '0.30',
  },
  {
    path:        '/terms',
    changefreq:  'yearly',
    priority:    '0.30',
  },
  {
    path:        '/refund',
    changefreq:  'yearly',
    priority:    '0.30',
  },
];

// ─── PLANNED SEO ROUTES (TODO — NOT YET LIVE) ────────────────────────────────
// Move an entry to ACTIVE_ROUTES only after:
//   1. The page component exists in src/pages/
//   2. The route is registered in src/App.tsx
//   3. The page has real content (not a stub)
//
// const PLANNED_SEO_ROUTES = [
//   { path: '/nri-property-management-bangalore', changefreq: 'weekly',  priority: '0.95' },
//   { path: '/property-management-hsr-layout',    changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-koramangala',   changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-btm-layout',    changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-indiranagar',   changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-whitefield',    changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-bellandur',     changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-marathahalli',  changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-sarjapur-road', changefreq: 'weekly',  priority: '0.90' },
//   { path: '/property-management-electronic-city', changefreq: 'weekly', priority: '0.90' },
//   { path: '/pricing',                           changefreq: 'monthly', priority: '0.85' },
//   { path: '/process/inspection',                changefreq: 'monthly', priority: '0.85' },
//   { path: '/process/deposit',                   changefreq: 'monthly', priority: '0.85' },
//   { path: '/owner-dashboard',                   changefreq: 'monthly', priority: '0.75' },
//   { path: '/nri-faq',                           changefreq: 'weekly',  priority: '0.85' },
//   { path: '/nri-tax-guide',                     changefreq: 'weekly',  priority: '0.85' },
//   { path: '/nri-poa-guide',                     changefreq: 'weekly',  priority: '0.85' },
//   { path: '/vacant-property-care-bangalore',    changefreq: 'weekly',  priority: '0.85' },
//   { path: '/calculator',                        changefreq: 'monthly', priority: '0.75' },
//   { path: '/founders',                          changefreq: 'monthly', priority: '0.65' },
//   { path: '/sops',                              changefreq: 'monthly', priority: '0.60' },
//   { path: '/sample-agreement',                  changefreq: 'monthly', priority: '0.70' },
//   { path: '/compare/reeve-vs-nobroker',         changefreq: 'monthly', priority: '0.80' },
//   { path: '/compare/reeve-vs-housewise',        changefreq: 'monthly', priority: '0.80' },
//   { path: '/compare/reeve-vs-propdial',         changefreq: 'monthly', priority: '0.80' },
//   { path: '/compare/reeve-vs-azuro',            changefreq: 'monthly', priority: '0.80' },
//   { path: '/compare/property-manager-vs-broker', changefreq: 'monthly', priority: '0.80' },
// ];

// ─── BUILD XML ────────────────────────────────────────────────────────────────

function buildXml(routes) {
  const urls = routes.map(({ path: p, changefreq, priority }) => `  <url>
    <loc>${BASE_URL}${p}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
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
ACTIVE_ROUTES.forEach(r => console.log(`  ${BASE_URL}${r.path}`));
