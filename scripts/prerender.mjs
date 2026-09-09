/**
 * scripts/prerender.mjs
 *
 * Post-build SSG: generates static HTML files for public marketing routes.
 * Runs after `vite build` via the `postbuild` npm script.
 *
 * Strategy:
 *   1. Read the built dist/index.html (contains real hashed JS/CSS asset paths).
 *   2. For each public route, swap <title>, <meta> tags, inject JSON-LD schema,
 *      and inject static body HTML.
 *   3. Write the result to dist/{route}/index.html.
 *
 * React uses createRoot (not hydrateRoot), so it replaces static HTML on mount.
 * No hydration mismatch issues.
 *
 * Schema architecture:
 *   - One shared Reeve Organization entity (@id .../#organization) is emitted on
 *     every prerendered page, alongside a shared WebSite node. A per-page WebPage
 *     node carries the build-time dateModified (freshness routes only). A single
 *     shared LocalBusiness (@id .../#local-business) appears on the homepage and
 *     the five Bangalore service pages. Service/FAQPage/BreadcrumbList nodes are
 *     appended per route.
 *   - Do not add self-serving review/aggregateRating markup to Reeve's
 *     Organization or LocalBusiness schema.
 *   - safeJsonLd() Unicode-escapes <, >, & so the JSON is safe inside <script> tags.
 *
 * Build-time freshness:
 *   - The current IST (Asia/Kolkata) build date is computed once and applied as a
 *     crawler-only "Last updated" line inside #root (replaced by React on mount)
 *     and as WebPage.dateModified. Applies to the homepage + 8 service pages;
 *     /search and /contact are excluded (freshness:false). The date advances on
 *     every production build/redeploy — no scheduler.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DIST      = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('ERROR: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Serialize a JSON-LD object to a string safe for embedding inside a
 * <script> tag in HTML. JSON.stringify does not escape <, >, or & by
 * default; those characters are legal in JSON but can break HTML parsers
 * when the script tag appears in an HTML document.
 */
function safeJsonLd(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

// ── Build-time date (IST / Asia/Kolkata) ───────────────────────────────────────
// Computed once per build. ISO date is assembled from explicit parts (never from
// a locale's display formatting) so it is always a valid YYYY-MM-DD.
const NOW = new Date();
const IST_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(NOW).reduce((o, x) => (o[x.type] = x.value, o), {});
const LAST_UPDATED_ISO   = `${IST_PARTS.year}-${IST_PARTS.month}-${IST_PARTS.day}`; // e.g. "2026-09-07"
const LAST_UPDATED_HUMAN = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric',
}).format(NOW); // e.g. "7 September 2026"

// ── Shared data ─────────────────────────────────────────────────────────────

// Canonical host is www. Single source of truth.
const BASE = 'https://www.reeve.in';
const WWW  = BASE;

const ORG_ID  = WWW + '/#organization';
const SITE_ID = WWW + '/#website';
const LB_ID   = WWW + '/#local-business';

const ORG_REF = { '@id': ORG_ID };
const LB_REF  = { '@id': LB_ID };

// areaServed values, matched to each page's actual geography.
const BENGALURU_AREA = {
  '@type': 'City',
  name: 'Bengaluru',
  containedInPlace: { '@type': 'AdministrativeArea', name: 'Karnataka' },
};
const INDIA_AREA = { '@type': 'Country', name: 'India' };

const ORG_DESCRIPTION =
  "Reeve is a transparent property marketplace for India and a provider of professional Property Management and Property Services in Bangalore. Users can browse properties, while owners, brokers, builders and property managers can list properties with their role shown on each listing. Core marketplace access is free, users can browse without an account, Reeve's organic marketplace results aren't for sale, and Reeve does not sell enquiries. Reeve also provides NRI property coordination across India.";

const LB_DESCRIPTION =
  'Reeve combines its India-wide transparent property marketplace for browsing and listing properties with professional Property Management and Property Services in Bangalore, including vacant property care, tenant placement, Khata and mutation support, and related property services in Bengaluru.';

// ── Shared schema nodes ─────────────────────────────────────────────────────

// One canonical Organization entity, emitted verbatim on every prerendered page.
const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Reeve',
  legalName: 'Serial Makers Private Limited',
  url: WWW,
  description: ORG_DESCRIPTION,
  telephone: '+917899874281',
  email: 'support@reeve.in',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Bengaluru',
    addressRegion: 'Karnataka',
    addressCountry: 'IN',
  },
  areaServed: INDIA_AREA,
  image: WWW + '/icon-192.png',
  sameAs: [
    'https://www.linkedin.com/company/reeve-pm/',
    'https://x.com/reeve_pm',
    'https://www.trustpilot.com/review/reeve.in',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+917899874281',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi', 'Kannada'],
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '19:00',
      },
    },
  ],
  founder: [
    {
      '@type': 'Person',
      name: 'Lohit Agarwal',
      jobTitle: 'Co-founder',
      sameAs: 'https://www.linkedin.com/in/lohit24a/',
      worksFor: ORG_REF,
    },
    {
      '@type': 'Person',
      name: 'Daksh Jain',
      jobTitle: 'Co-founder',
      sameAs: 'https://www.linkedin.com/in/dakshjain127/',
      worksFor: ORG_REF,
    },
  ],
};

const WEBSITE = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: 'Reeve',
  url: WWW,
};

// One shared LocalBusiness (same Reeve entity), Bangalore-scoped. No storefront /
// opening-hours / hasMap signals; no priceRange; no street address.
const LOCAL_BUSINESS = {
  '@type': 'LocalBusiness',
  '@id': LB_ID,
  name: 'Reeve',
  url: WWW + '/property-services-bangalore',
  parentOrganization: ORG_REF,
  telephone: '+917899874281',
  email: 'support@reeve.in',
  areaServed: BENGALURU_AREA,
  description: LB_DESCRIPTION,
  sameAs: ['https://share.google/a2Hm9cYDZuqqAWm00'],
};

// ── Node builders ───────────────────────────────────────────────────────────

function webPageNode(canonical, name, freshness) {
  const node = {
    '@type': 'WebPage',
    '@id': canonical + '#webpage',
    url: canonical,
    name,
    isPartOf: { '@id': SITE_ID },
    about: ORG_REF,
  };
  if (freshness) node.dateModified = LAST_UPDATED_ISO;
  return node;
}

function breadcrumbNode(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

function faqNode(canonical, faqs) {
  return {
    '@type': 'FAQPage',
    '@id': canonical + '#faq',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * Assemble the full @graph for a route:
 *   [Organization, WebSite, WebPage, (LocalBusiness), (Service), (FAQPage), (BreadcrumbList)]
 */
function buildGraph(route) {
  const graph = [
    ORGANIZATION,
    WEBSITE,
    webPageNode(route.canonical, route.title, route.freshness),
  ];
  if (route.localBusiness) graph.push(LOCAL_BUSINESS);
  if (route.service) graph.push(route.service);
  if (route.faqs && route.faqs.length) graph.push(faqNode(route.canonical, route.faqs));
  if (route.breadcrumb) graph.push(breadcrumbNode(route.breadcrumb));
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Render a route's FAQ Q&A into prerender body HTML (visible content matches FAQPage schema). */
function faqBodyHtml(faqs) {
  const items = faqs
    .map((f) => `      <div>\n        <h3>${esc(f.q)}</h3>\n        <p>${esc(f.a)}</p>\n      </div>`)
    .join('\n');
  return `\n<section aria-label="Frequently asked questions">\n  <h2>Frequently asked questions</h2>\n${items}\n</section>`;
}

// ── Customer Stories (testimonials) ──────────────────────────────────────────
//
// This is a byte-identical copy (text + order) of src/data/testimonials.ts. The
// React component is the canonical source; this static copy exists only so the
// same stories appear in the prerendered HTML for crawlers/GEO. If you edit one,
// edit both.
const TESTIMONIALS_COPY = {
  eyebrow: 'CUSTOMER STORIES',
  heading: 'What property owners say about Reeve',
  supporting: 'Experiences from property owners in Bangalore, elsewhere in India and overseas.',
};

const TESTIMONIALS = [
  { service: 'REEVE MANAGED', name: 'Neha R.', initials: 'NR', avatarVariant: 1, role: 'Property Owner', ownerLocation: 'Bangalore', propertyType: '2 BHK', propertyLocation: 'Whitefield, Bangalore', quote: 'I had no issue paying for property management, I just wanted to know what I was paying for. With my flat in Whitefield, every repair now comes with the vendor bill and photos. Once a plumbing job crossed ₹3,000, they asked me before doing it. That sounds basic, but after my earlier experience it made a big difference.' },
  { service: 'NRI PROPERTY SALE', name: 'Sameer P.', initials: 'SP', avatarVariant: 5, role: 'NRI Property Owner', ownerLocation: 'Dubai', propertyType: 'Apartment', propertyLocation: 'Pune, Maharashtra', quote: 'I was selling a flat in Pune while living in Dubai and thought the main problem would be finding a buyer. The document review actually found an old municipal record issue first. Reeve coordinated with the advocate and CA and kept the paperwork moving from India. It took some time to clear, but I knew what was pending instead of just hearing ‘it’s in process.’' },
  { service: 'REEVE LET', name: 'Rohan D.', initials: 'RD', avatarVariant: 2, role: 'Property Owner', ownerLocation: 'Bangalore', propertyType: '2 BHK', propertyLocation: 'Koramangala, Bangalore', quote: 'I didn’t want to pay a broker one month’s rent just for bringing a tenant. Reeve photographed my Koramangala apartment, handled the enquiries and did the viewings, while I still chose who I wanted to rent to. The first interested family backed out, so it took a little longer than we hoped, but the updates were regular and the final handover was properly recorded.' },
  { service: 'KHATA & MUTATION', name: 'Ananya S.', initials: 'AS', avatarVariant: 5, role: 'Property Owner', ownerLocation: 'Mumbai', propertyType: 'Apartment', propertyLocation: 'Jayanagar, Bangalore', quote: 'My Khata application had already come back twice because my name was written differently across the old record and sale deed. Reeve didn’t promise a shortcut. They first explained what was mismatching, coordinated the correction documents and followed the resubmission. The authority still took its own time, but I stopped guessing what the rejection actually meant.' },
  { service: 'REEVE WATCH', name: 'Priya N.', initials: 'PN', avatarVariant: 4, role: 'NRI Property Owner', ownerLocation: 'London', propertyType: '2 BHK', propertyLocation: 'Indiranagar, Bangalore', quote: 'Our Indiranagar flat stays locked most of the year because we live in London. On one monthly visit, the photos showed a new seepage patch near the balcony door that obviously wasn’t there the previous month. Reeve got a quote and asked before arranging the repair. For me the useful part is having twelve dated checks, not just someone saying they visited.' },
  { service: 'NRI RENT & TDS', name: 'Rahul B.', initials: 'RB', avatarVariant: 1, role: 'NRI Landlord', ownerLocation: 'Toronto', propertyType: 'Apartment', propertyLocation: 'Chennai, Tamil Nadu', quote: 'We had been receiving rent from our Chennai apartment for years, but the TDS side was honestly a mess. The tenant had some records, our CA had others, and I wasn’t sure what was missing. Reeve got everyone on the same thread, helped reconstruct the documents and coordinated the CA work. It wasn’t instant, but at least the numbers finally matched.' },
  { service: 'REEVE MANAGED', name: 'Kunal M.', initials: 'KM', avatarVariant: 2, role: 'Property Owner', ownerLocation: 'Mumbai', propertyType: '3 BHK', propertyLocation: 'HSR Layout, Bangalore', quote: 'I live in Mumbai and the apartment is in HSR Layout, so small things used to become long WhatsApp chains with the tenant and society. Now I get one monthly statement even when nothing happened, and the quarterly inspection photos are all in one place. I don’t have to keep asking whether someone actually visited.' },
  { service: 'NRI PROPERTY SALE', name: 'Nisha V.', initials: 'NV', avatarVariant: 6, role: 'NRI Property Owner', ownerLocation: 'London', propertyType: 'Apartment', propertyLocation: 'Indiranagar, Bangalore', quote: 'I’m in London and the property is in Bangalore. What helped most was having one person coordinating the photographer, buyer visits, advocate and CA instead of me calling everyone separately. I still decided the price and which offer to take. There were a few document questions before registration, but they were raised early rather than at the last minute.' },
  { service: 'REEVE LET', name: 'Kavita A.', initials: 'KA', avatarVariant: 3, role: 'NRI Property Owner', ownerLocation: 'Dubai', propertyType: '2 BHK', propertyLocation: 'Whitefield, Bangalore', quote: 'I’m based in Dubai and couldn’t fly to Bangalore just to show the apartment to people. The team handled the listing and viewings, sent me the serious options, and I made the final tenant decision from here. The agreement and move-in record were also taken care of. It felt like I was still in control without physically being there.' },
  { service: 'REEVE MANAGED', name: 'Arjun S.', initials: 'AS', avatarVariant: 3, role: 'NRI Property Owner', ownerLocation: 'Singapore', propertyType: '2 BHK', propertyLocation: 'Sarjapur Road, Bangalore', quote: 'Managing the flat from Singapore was getting tiring because every tenant issue ended up with my brother in Bangalore. Reeve took over the day-to-day communication and repairs, but the rent still comes straight to me. I especially like that they don’t handle the deposit. I can see what is happening without putting the money through another company.' },
  { service: 'KHATA & MUTATION', name: 'Deepak R.', initials: 'DR', avatarVariant: 6, role: 'NRI Property Owner', ownerLocation: 'Dubai', propertyType: 'Family property', propertyLocation: 'JP Nagar, Bangalore', quote: 'I inherited the JP Nagar property with my sister and all of us agreed on what needed to be done, but the municipal record was still in our father’s name. Reeve reviewed the deed, old Khata and tax papers, then coordinated the steps and advocate input where needed. There was some back and forth on documents, but we had one person tracking it throughout.' },
  { service: 'REEVE MANAGED', name: 'Ritu K.', initials: 'RK', avatarVariant: 4, role: 'Property Owner', ownerLocation: 'Delhi', propertyType: '3 BHK', propertyLocation: 'Bellandur, Bangalore', quote: 'My tenant moved out earlier than expected and I assumed I would need to cancel management and start again later. Instead, the monthly rate dropped when the flat became empty and the same team continued looking after it. They later handled the tenant search too. There was no new onboarding, which saved a lot of unnecessary back and forth.' },
];

// Same diagonal avatar palettes as src/data/testimonials.ts (avatarVariant → [from,to]).
const AVATAR_PALETTES = {
  1: ['#4F46E5', '#7C3AED'], 2: ['#0284C7', '#4F46E5'], 3: ['#0F766E', '#14B8A6'],
  4: ['#059669', '#10B981'], 5: ['#EA580C', '#F59E0B'], 6: ['#E11D48', '#8B5CF6'],
};

// Insertion marker placed in each target route's bodyHtml at the same semantic
// position the React page renders <TestimonialsSection /> — buildPage swaps it.
const TESTIMONIALS_MARKER = '<!--TESTIMONIALS-->';

/**
 * Static, crawler-readable Customer Stories block. Mirrors the React component's
 * essential structure/geometry (section background, container, header, a
 * horizontal row of white cards with figure/blockquote/figcaption) so first
 * paint and the React state share roughly the same layout (minimises CLS).
 * No interactivity/animation/observers — those stay React-only. No schema.
 */
function testimonialsBodyHtml() {
  const cards = TESTIMONIALS.map((t, i) => {
    const [from, to] = AVATAR_PALETTES[t.avatarVariant] || AVATAR_PALETTES[1];
    return `
          <div role="group" aria-roledescription="slide" aria-label="${i + 1} of ${TESTIMONIALS.length}" class="reeve-story-slide">
            <figure style="display:flex;flex-direction:column;height:100%;width:100%;margin:0;background:#FFFFFF;border:1px solid rgba(15,23,42,0.08);border-radius:20px;padding:22px;box-shadow:0 8px 30px rgba(15,23,42,0.06)">
              <span style="display:inline-block;align-self:flex-start;background:#EEF2FF;color:#4338CA;border:1px solid #E0E7FF;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:700;letter-spacing:0.05em">${esc(t.service)}</span>
              <blockquote class="text-[16px] sm:text-[17px]" style="margin:16px 0 0;color:#1E293B;line-height:1.62">${esc(t.quote)}</blockquote>
              <figcaption style="margin-top:auto;display:flex;align-items:center;gap:12px;padding-top:24px;color:#64748B;font-size:13px;line-height:1.45">
                <span aria-hidden="true" class="h-12 w-12 sm:h-[52px] sm:w-[52px]" style="display:grid;place-items:center;flex:0 0 auto;border-radius:15px;color:#fff;font-size:15px;font-weight:700;background:linear-gradient(140deg,${from},${to})">${esc(t.initials)}</span>
                <span style="min-width:0">
                  <span style="display:block;color:#0F172A;font-size:15px;font-weight:700">${esc(t.name)}</span>
                  <span style="display:block">${esc(t.role)} · ${esc(t.ownerLocation)}</span>
                  <span style="display:block">${esc(t.propertyType)} · ${esc(t.propertyLocation)}</span>
                </span>
              </figcaption>
            </figure>
          </div>`;
  }).join('');

  // Reuses the same responsive carousel classes + container/padding/typography as
  // the React component (incl. the mobile right-gutter bleed for the next-card peek,
  // responsive H2/body/quote/avatar sizes, and reserved bottom-control height) so
  // first paint and React share layout at every width (minimises CLS). Inter font is
  // set explicitly since the surrounding route shell uses system-ui.
  return `
    <section aria-labelledby="testimonial-heading" style="font-family:'Inter',system-ui,sans-serif;background:linear-gradient(135deg,#F5F3FF 0%,#F8FAFC 48%,#ECFEFF 100%),#F8FAFC">
      <div class="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        <p style="margin:0;color:#4F46E5;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${esc(TESTIMONIALS_COPY.eyebrow)}</p>
        <h2 id="testimonial-heading" class="text-[28px] sm:text-[clamp(2rem,3vw,2.625rem)]" style="margin:8px 0 0;color:#0F172A;font-weight:700;line-height:1.15">${esc(TESTIMONIALS_COPY.heading)}</h2>
        <p class="text-[16px] sm:text-[17px]" style="margin:12px 0 0;max-width:760px;color:#64748B;line-height:1.52">${esc(TESTIMONIALS_COPY.supporting)}</p>
        <div role="region" aria-roledescription="carousel" aria-label="Customer stories" style="margin-top:40px">
          <div class="reeve-story-track no-scrollbar -mr-5 py-4 pr-5 sm:mr-0 sm:pr-0">${cards}
          </div>
        </div>
        <div aria-hidden="true" style="margin-top:32px;height:44px"></div>
      </div>
    </section>`;
}

/**
 * Build a complete HTML page by patching the Vite-built shell.
 */
function buildPage(route) {
  const { title, description, ogTitle, ogDescription, canonical, bodyHtml, freshness, faqs } = route;
  let html = shell;

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);

  // <meta name="description">
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${esc(description)}" />`
  );

  // og:title
  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${esc(ogTitle)}" />`
  );

  // og:description
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${esc(ogDescription)}" />`
  );

  // canonical (insert after og:type if not already present)
  if (!html.includes('<link rel="canonical"')) {
    html = html.replace(
      /<meta property="og:type"[^>]*>/,
      `<meta property="og:type" content="website" />\n    <link rel="canonical" href="${esc(canonical)}" />`
    );
  }

  // JSON-LD schema — injected just before </head>.
  const jsonLd = buildGraph(route);
  const scriptBlock = `\n  <script type="application/ld+json">\n${safeJsonLd(jsonLd)}\n  </script>`;
  html = html.replace('</head>', `${scriptBlock}\n</head>`);

  // Body content: base body + optional FAQ Q&A + optional crawler-only freshness line.
  // Everything lives inside #root, so React's createRoot() replaces it on mount.
  let inner = bodyHtml;
  // Swap the testimonials marker (present only on the three target routes) for the
  // static Customer Stories block, so prerender order matches the React page.
  inner = inner.includes(TESTIMONIALS_MARKER)
    ? inner.replace(TESTIMONIALS_MARKER, testimonialsBodyHtml())
    : inner;
  if (faqs && faqs.length) inner += faqBodyHtml(faqs);
  if (freshness) {
    inner += `\n  <p data-prerender-freshness>Last updated: ${esc(LAST_UPDATED_HUMAN)}</p>`;
  }
  html = html.replace('<div id="root"></div>', `<div id="root">${inner}</div>`);

  return html;
}

function writeRoute(outPath, html) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf-8');
}

// ── Route definitions ─────────────────────────────────────────────────────────

const routes = [
  // ── / (homepage) — patched in-place ────────────────────────────────────────
  {
    outFile: path.join(DIST, 'index.html'),
    title: 'Reeve | Property Marketplace India & Property Services Bangalore',
    description: 'Browse and list properties on Reeve, a transparent property marketplace for India. Core marketplace access is free, with Property Management and Property Services in Bangalore.',
    ogTitle: 'Reeve | Property Marketplace India & Property Services Bangalore',
    ogDescription: 'Browse and list properties on Reeve, a transparent property marketplace for India. Core marketplace access is free, with Property Management and Property Services in Bangalore.',
    canonical: BASE + '/',
    freshness: true,
    localBusiness: true,
    // No BreadcrumbList on the homepage: Google requires ≥2 ListItems, and there
    // is no genuine hierarchy above Home.
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Hero">
      <h1>See More Before You Contact</h1>
      <p>Reeve is a transparent property marketplace. See lister info, responsiveness, terms, and history before you make contact.</p>
      <a href="/search">Search Properties</a>
    </section>
    <section aria-label="See What's Behind the Listing">
      <h2>See What's Behind the Listing</h2>
      <p>Every listing shows lister details, responsiveness, and key property terms before you reach out.</p>
    </section>
    <section aria-label="Contact Without Losing Control">
      <h2>Contact Without Losing Control</h2>
      <p>Send a contact request privately. Your contact details stay hidden until the lister approves, then you connect directly.</p>
    </section>
    <section aria-label="Different by Design">
      <h2>Different by Design</h2>
      <p>Built for transparency — explore property details and connect directly with listers.</p>
    </section>
    <section aria-label="How the marketplace works">
      <h2>The marketplace comes first. The business model follows.</h2>
      <ul>
        <li>The core marketplace is free — browse, list, request contact and connect with no marketplace access fee.</li>
        <li>Organic ranking cannot be bought — payment does not improve a listing's position in organic results.</li>
        <li>Participation is open — owners, brokers, property managers and builders can all participate, and the role declared on each listing is shown to users.</li>
        <li>Paid services stay optional — using Reeve Managed, Reeve Watch or Reeve Let is never required to use the core marketplace.</li>
      </ul>
    </section>
    <!--TESTIMONIALS-->
    <section aria-label="Compact Closing Action">
      <h2>Ready to find your next home?</h2>
      <a href="/search">Search Properties</a>
      <a href="/contact">Contact Us</a>
    </section>
  </main>
</div>`,
  },

  // ── /search ───────────────────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'search', 'index.html'),
    title: 'Properties for Rent and Sale in India | Reeve',
    description: 'Find rental and sale properties across India. Search by city, neighbourhood, BHK, and budget, with transparent listing and lister information on Reeve.',
    ogTitle: 'Properties for Rent and Sale in India | Reeve',
    ogDescription: 'Find rental and sale properties across India on Reeve. Search by city, neighbourhood, BHK, and budget.',
    canonical: BASE + '/search',
    freshness: false,
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'Search Properties', item: WWW + '/search' },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Property search">
      <h1>Properties for Rent and Sale in India</h1>
      <p>Search rental and sale properties across India on Reeve. Filter by city, neighbourhood, BHK, furnishing, and budget to find the right home.</p>
      <p>Each listing includes transparent lister information and property details so you can make informed decisions.</p>
    </section>
  </main>
</div>`,
  },

  // ── /contact ──────────────────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'contact', 'index.html'),
    title: 'Contact Reeve | Marketplace & Property Services',
    description: 'Contact Reeve about the property marketplace, Property Services in Bangalore, or NRI property coordination across India.',
    ogTitle: 'Contact Reeve | Marketplace & Property Services',
    ogDescription: "Get in touch with Reeve. Call, WhatsApp, or email — we're a small team and we read every message.",
    canonical: BASE + '/contact',
    freshness: false,
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'Contact', item: WWW + '/contact' },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Contact Reeve">
      <h1>Contact Us</h1>
      <p>We're a small team and we read every message. Pick the option that works best for you.</p>
      <ul>
        <li>
          <h2>Phone</h2>
          <p><a href="tel:+917899874281">+91 78998 74281</a></p>
          <p>Mon–Sat, 9 AM–7 PM IST</p>
        </li>
        <li>
          <h2>WhatsApp</h2>
          <p><a href="https://wa.me/917899874281">WhatsApp us at +91 78998 74281</a></p>
          <p>Mon–Sat, 9 AM–7 PM IST</p>
        </li>
        <li>
          <h2>Email</h2>
          <p><a href="mailto:support@reeve.in">support@reeve.in</a></p>
          <p>We aim to reply within one business day.</p>
        </li>
        <li>
          <h2>Request a Callback</h2>
          <p>Use the callback form on this page to schedule a call at a time that suits you.</p>
        </li>
      </ul>
      <p>Reeve is operated by Serial Makers Private Limited, Bangalore.</p>
    </section>
  </main>
</div>`,
  },

  // ── /property-services-bangalore (Bangalore hub) ────────────────────────────
  {
    outFile: path.join(DIST, 'property-services-bangalore', 'index.html'),
    title: 'Property Services in Bangalore | Reeve',
    description: 'Reeve manages rented properties, looks after empty ones, and finds tenants in Bangalore. Ongoing services start at ₹2,000/month.',
    ogTitle: 'Property Services in Bangalore | Reeve',
    ogDescription: 'Property management, vacant property care, and tenant placement in Bangalore — one accountable Reeve contact, wherever you live.',
    canonical: BASE + '/property-services-bangalore',
    freshness: true,
    localBusiness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/property-services-bangalore#service',
      name: 'Reeve Property Services in Bangalore',
      serviceType: 'Property Services',
      provider: LB_REF,
      areaServed: BENGALURU_AREA,
      description: 'Reeve manages rented properties, looks after empty ones, and finds tenants in Bangalore. Ongoing services start at ₹2,000/month.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
    ],
    faqs: [
      {
        q: 'How long am I committing for?',
        a: 'Property Management: 3-month minimum. Vacant Property Care: 6-month minimum. Find a Tenant: one-time service.',
      },
      {
        q: 'Can I switch services later?',
        a: "Yes. As your property’s situation changes, you can move to the Reeve service that fits it. We’ll help you work out the right next step.",
      },
      {
        q: 'Do you serve my area?',
        a: "Reeve serves most areas across Bangalore. We’ll confirm coverage based on your exact property location.",
      },
      {
        q: 'What happens after I enquire?',
        a: "We’ll review your property and location and get back to you within a day. For Property Management and Vacant Property Care, the next step can include a free property assessment before you commit.",
      },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Property services in Bangalore">
      <h1>Property Services in Bangalore, wherever you are.</h1>
      <p>We manage rented properties, look after empty ones, and find tenants. Ongoing services start at ₹2,000/month.</p>
      <h2>Choose a service</h2>
      <ul>
        <li><a href="/property-management-bangalore">Reeve Managed — ongoing property management</a></li>
        <li><a href="/vacant-property-care-bangalore">Reeve Watch — care for vacant properties</a></li>
        <li><a href="/find-tenant-bangalore">Reeve Let — one-time tenant placement</a></li>
        <li><a href="/khata-transfer-bangalore">Khata &amp; Mutation — property record transfers</a></li>
      </ul>
      <a href="/contact">Talk to Reeve</a>
    </section>
    <!--TESTIMONIALS-->
  </main>
</div>`,
  },

  // ── /property-management-bangalore (Reeve Managed) ──────────────────────────
  {
    outFile: path.join(DIST, 'property-management-bangalore', 'index.html'),
    title: 'Property Management in Bangalore | Reeve',
    description: 'Reeve handles tenant communication, property visits, repairs and records in Bangalore — through one accountable Reeve contact, wherever you live.',
    ogTitle: 'Property Management in Bangalore | Reeve',
    ogDescription: 'Ongoing property management in Bangalore — tenant communication, visits, repairs and records through one accountable Reeve contact.',
    canonical: BASE + '/property-management-bangalore',
    freshness: true,
    localBusiness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/property-management-bangalore#service',
      name: 'Reeve Managed — Property Management in Bangalore',
      serviceType: 'Property Management',
      provider: LB_REF,
      areaServed: BENGALURU_AREA,
      description: 'Reeve handles tenant communication, property visits, repairs and records in Bangalore through one accountable Reeve contact, wherever you live.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
      { name: 'Property Management', item: WWW + '/property-management-bangalore' },
    ],
    faqs: [
      {
        q: 'What happens when my tenant moves out?',
        a: 'When the tenant returns the keys and the property becomes physically vacant, Reeve Managed moves to the applicable empty-property rate from that point. Management continues without needing a new management contract. If the owner wants another tenant, Reeve can also begin tenant finding.',
      },
      {
        q: 'How often will Reeve visit my property?',
        a: 'Reeve Managed includes four scheduled property inspections each year, plus two additional on-request inspections. Move-in and move-out condition records are handled when relevant, and repair/maintenance visits are coordinated as needed.',
      },
      {
        q: "What happens if a repair needs my approval and I don’t respond?",
        a: "Work above the owner’s approval threshold waits for written approval. The default threshold is ₹3,000, and a different threshold can be agreed during onboarding. Vendor costs are passed through at actuals with zero Reeve markup.",
      },
      {
        q: 'Do you hold my rent or security deposit?',
        a: 'No. Rent and security deposit move directly between the tenant and owner. Reeve can confirm receipt status and follow up where needed, but does not take custody of the money.',
      },
      {
        q: 'Can Reeve find my next tenant?',
        a: "Yes. Tenant finding for Reeve Managed clients costs ₹15,000, with ₹0 upfront. The fee is charged when the tenant’s token advance reaches the owner. Unlimited viewings are included, and same-tenant renewal is free.",
      },
      {
        q: "I don’t live in Bangalore. How does Reeve Managed work for me?",
        a: 'You do not need to be in Bangalore for day-to-day management. Reeve handles local property visits, tenant communication and repair coordination. Owner decisions and written approvals can happen remotely, property records are available remotely, and you have one Reeve point of contact.',
      },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Property management in Bangalore">
      <h1>Property Management in Bangalore</h1>
      <p>Reeve handles tenant communication, property visits, repairs and records — through one accountable Reeve contact, wherever you live. You do not need to be in Bangalore for day-to-day management.</p>
      <p>Ongoing management starts at ₹2,000/month when the property is empty and ₹3,000/month when it is rented. It begins with a free property assessment.</p>
      <h2>What Reeve Managed includes</h2>
      <ul>
        <li>Four scheduled property inspections each year, plus two additional on-request inspections, with dated photographs.</li>
        <li>Move-in and move-out condition records.</li>
        <li>Tenant communication, maintenance and access coordination, and renewal negotiation.</li>
        <li>Repair coordination with vendor bills at actuals — Reeve markup ₹0; work above ₹3,000 needs written owner approval.</li>
        <li>Tenant finding for Reeve Managed clients at ₹15,000 with ₹0 upfront, charged when the tenant is placed.</li>
      </ul>
      <p>See all <a href="/property-services-bangalore">Bangalore property services</a>, or <a href="/contact">talk to Reeve</a>.</p>
    </section>
  </main>
</div>`,
  },

  // ── /vacant-property-care-bangalore (Reeve Watch) ───────────────────────────
  {
    outFile: path.join(DIST, 'vacant-property-care-bangalore', 'index.html'),
    title: 'Vacant Property Care in Bangalore | Reeve',
    description: 'Reeve looks after empty homes in Bangalore — monthly visits, preventive checks, and coordination of anything that needs attention.',
    ogTitle: 'Vacant Property Care in Bangalore | Reeve',
    ogDescription: 'Care for vacant properties in Bangalore — monthly visits, preventive checks, and coordinated upkeep by Reeve.',
    canonical: BASE + '/vacant-property-care-bangalore',
    freshness: true,
    localBusiness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/vacant-property-care-bangalore#service',
      name: 'Reeve Watch — Vacant Property Care in Bangalore',
      serviceType: 'Vacant Property Care',
      provider: LB_REF,
      areaServed: BENGALURU_AREA,
      description: 'Reeve looks after empty homes in Bangalore with monthly visits, preventive checks, and coordination of anything that needs attention.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
      { name: 'Vacant Property Care', item: WWW + '/vacant-property-care-bangalore' },
    ],
    faqs: [
      {
        q: 'How often do you visit?',
        a: 'Once every month — 12 scheduled visits a year, each added to your dated property record.',
      },
      {
        q: 'What happens if you find a problem?',
        a: 'We tell you what we found and what needs attention. If work is needed, we can coordinate the next step with your approval.',
      },
      {
        q: 'Can you arrange cleaning?',
        a: 'Yes. Cleaning can be arranged during a monthly visit if requested. Cleaner and material costs are billed at actuals.',
      },
      {
        q: 'How do repair approvals work?',
        a: 'Nothing above ₹3,000 is spent without your written approval. Vendor bills are passed through at actual cost, with no Reeve markup.',
      },
      {
        q: 'What if I decide to rent the property?',
        a: 'You can move from Vacant Property Care to Reeve Managed without starting the property setup again. Tenant placement inside Managed is ₹15,000 with ₹0 upfront.',
      },
      {
        q: 'Is Reeve Watch a security service?',
        a: 'No. This is scheduled property care and monitoring, not guarding or an alarm service, and it does not guarantee against break-in, encroachment, damage or loss.',
      },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Vacant property care in Bangalore">
      <h1>Vacant Property Care in Bangalore</h1>
      <p>We visit every month, run preventive checks and coordinate anything that needs attention.</p>
      <p>Reeve Watch is 12 scheduled visits a year — one every month — each added to a dated property record covering what was checked, what changed and what happened next. Each visit includes room checks and a meter reading.</p>
      <p>Vacant Property Care starts at ₹2,000/month, with a minimum term of 6 months; Watch begins after the first six-month payment.</p>
      <p>See all <a href="/property-services-bangalore">Bangalore property services</a>, or <a href="/contact">talk to Reeve</a>.</p>
    </section>
  </main>
</div>`,
  },

  // ── /find-tenant-bangalore (Reeve Let) ──────────────────────────────────────
  {
    outFile: path.join(DIST, 'find-tenant-bangalore', 'index.html'),
    title: 'Find a Tenant in Bangalore | Reeve',
    description: 'Reeve finds a tenant for your Bangalore property — professional listing, Reeve-conducted viewings, negotiation, agreement and documented handover, whether you are in Bangalore or abroad.',
    ogTitle: 'Find a Tenant in Bangalore | Reeve',
    ogDescription: 'One-time tenant placement in Bangalore — listing, viewings, negotiation, agreement and documented handover by Reeve.',
    canonical: BASE + '/find-tenant-bangalore',
    freshness: true,
    localBusiness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/find-tenant-bangalore#service',
      name: 'Reeve Let — Tenant Placement in Bangalore',
      serviceType: 'Tenant Placement',
      provider: LB_REF,
      areaServed: BENGALURU_AREA,
      description: 'Reeve finds a tenant for your Bangalore property with professional listing, Reeve-conducted viewings, negotiation, agreement and documented handover.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
      { name: 'Find a Tenant', item: WWW + '/find-tenant-bangalore' },
    ],
    faqs: [
      {
        q: 'Do I need to be in Bangalore for the viewings?',
        a: 'No. Reeve schedules and conducts the viewings, so you do not need to attend. Reeve Let can work for owners in Bangalore, elsewhere in India or overseas.',
      },
      {
        q: 'Do you handle cleaning or repairs before the property is listed?',
        a: 'No. Reeve Let covers tenant placement. Cleaning, repairs and other property preparation are not included in the service.',
      },
      {
        q: 'Do you cover my area in Bangalore?',
        a: "Reeve operates across Bangalore. We serve some areas directly and assess others individually — tell us where your property is and we’ll confirm within a day.",
      },
      {
        q: 'What if I want Reeve to manage the property after the tenant is placed?',
        a: 'Then Property Management is the better fit. Reeve Managed continues after move-in with tenant communication, property visits, repairs and records.',
      },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Find a tenant in Bangalore">
      <h1>Find a Tenant for Your Bangalore Property</h1>
      <p>Professional listing, Reeve-conducted viewings, negotiation, agreement and documented handover — whether you're in Bangalore or abroad. Reeve schedules and conducts the viewings, so you do not need to attend.</p>
      <p>Reeve Let is a fixed ₹20,000 placement fee, not linked to your property's rent: ₹5,000 to start (when photography and listing work begins) and ₹15,000 when the tenant gets placed. The ₹5,000 becomes non-refundable once the photography and listing have been delivered.</p>
      <p>The rental agreement and e-stamping are included in the Reeve Let fee. Cleaning, repairs and other property preparation are not included.</p>
      <p>See all <a href="/property-services-bangalore">Bangalore property services</a>, or <a href="/contact">talk to Reeve</a>.</p>
    </section>
  </main>
</div>`,
  },

  // ── /khata-transfer-bangalore (Khata & Mutation) ────────────────────────────
  {
    outFile: path.join(DIST, 'khata-transfer-bangalore', 'index.html'),
    title: 'Khata Transfer in Bangalore | Reeve',
    description: 'Reeve helps with Khata transfer and mutation in Bangalore when the recorded owner is wrong, an application has come back, ownership changed through inheritance, or the property record cannot be matched cleanly.',
    ogTitle: 'Khata Transfer in Bangalore | Reeve',
    ogDescription: 'Khata transfer and property record corrections in Bangalore — Reeve helps when the recorded owner is wrong or the record cannot be matched cleanly.',
    canonical: BASE + '/khata-transfer-bangalore',
    freshness: true,
    localBusiness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/khata-transfer-bangalore#service',
      name: 'Khata Transfer & Mutation in Bangalore',
      serviceType: 'Property Record Transfer',
      provider: LB_REF,
      areaServed: BENGALURU_AREA,
      description: 'Reeve helps with Khata transfer and mutation in Bangalore when the recorded owner is wrong, an application has come back, ownership changed through inheritance, or the property record cannot be found or matched cleanly.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
      { name: 'Khata Transfer', item: WWW + '/khata-transfer-bangalore' },
    ],
    faqs: [
      {
        q: 'Do I need to visit a government office for Khata work?',
        a: 'Many Khata-related steps are designed to be handled through the current online or faceless route, so a routine case may not require a government-office visit. Non-standard cases can still require legitimate document retrieval, authorised actions, professional input or an official follow-up or escalation route. Reeve coordinates those steps where relevant; its role is to clarify and follow the correct process, not to provide special access to an office.',
      },
      {
        q: 'Can Reeve help if I live outside India?',
        a: 'Yes. Reeve can coordinate remotely with owners outside India, review available records, identify what is missing and organise India-side follow-up where appropriate. Some steps may still depend on valid authentication, original or India-side documents, authorised representation or professional input. If the Khata issue is part of a broader property matter, see NRI Property Services.',
      },
      {
        q: 'How does Reeve price Khata-related work?',
        a: 'Reeve first reviews the property, records and issue involved. Once the work required is clear, we explain the scope and provide a quote before you decide whether to proceed.',
      },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Khata transfer in Bangalore">
      <h1>Khata Transfer in Bangalore</h1>
      <p>When the property record doesn't match, the simple Khata process stops being simple.</p>
      <p>Reeve helps when the recorded owner is wrong, an application has come back, ownership changed through inheritance, or the existing property record cannot be found or matched cleanly.</p>
      <h2>Khata, mutation, title and A/B status are different things</h2>
      <ul>
        <li>Khata (and eKhata, its digital form) is the municipal property record.</li>
        <li>Mutation is updating that record after an ownership change.</li>
        <li>Khata is not proof of title.</li>
        <li>eKhata does not turn B-Khata into A-Khata.</li>
      </ul>
      <p>Reeve reviews the property, records and issue involved, then explains the scope and provides a quote before you decide whether to proceed. Reeve can also coordinate remotely with owners outside India.</p>
      <p>See all <a href="/property-services-bangalore">Bangalore property services</a>, or <a href="/contact">talk to Reeve</a>.</p>
    </section>
  </main>
</div>`,
  },

  // ── /nri-property-services-india (NRI hub) ──────────────────────────────────
  {
    outFile: path.join(DIST, 'nri-property-services-india', 'index.html'),
    title: 'NRI Property Services in India | Reeve',
    description: 'Reeve is one point of contact in India for your property — sale coordination, rent and TDS, documents and professionals — for NRIs, anywhere in India.',
    ogTitle: 'NRI Property Services in India | Reeve',
    ogDescription: 'One point of contact in India for your property — NRI property sale, rent and TDS, documents and coordination by Reeve.',
    canonical: BASE + '/nri-property-services-india',
    freshness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/nri-property-services-india#service',
      name: 'NRI Property Services in India',
      serviceType: 'NRI Property Services',
      provider: ORG_REF,
      areaServed: INDIA_AREA,
      description: 'Reeve is one point of contact in India for an NRI-owned property — sale coordination, rent and TDS, documents and professionals.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'NRI Property Services in India', item: WWW + '/nri-property-services-india' },
    ],
    faqs: [
      {
        q: 'Can Reeve help if my property is outside Bangalore?',
        a: 'Yes, depending on what needs to be done. Reeve can coordinate sale documentation and tax work, rent/TDS, legal and professional work, and property-document matters across India through appropriate independent professionals. Direct property management, vacant care, tenant placement, khata work and physical sale execution are currently limited to Bangalore.',
      },
      {
        q: 'Do I need to travel to India?',
        a: 'Not necessarily. Many property matters can be coordinated remotely, and an authorised representative or professional may be able to handle parts of some processes. Other transactions or authorities may require your involvement or presence. Reeve first reviews the situation and explains what is actually required.',
      },
      {
        q: "What if I don’t know which service I need?",
        a: "That’s completely fine. You don’t need to diagnose the problem before contacting Reeve. Tell us what’s happening, where the property is and what you’re trying to achieve. We’ll work out what kind of coordination is involved.",
      },
      {
        q: 'Can Reeve help with inherited or co-owned property?',
        a: "Yes, we can coordinate these situations. Depending on the circumstances, that may involve document review, succession or ownership documentation, professional legal work, record updates, ongoing management or eventual sale support. The exact steps depend on the property’s ownership and documentation.",
      },
      {
        q: 'Can Reeve coordinate several properties or property matters at once?',
        a: "Yes. The coordination model is designed to give you one point of contact even when several professionals or tasks are involved. Physical property work is limited to Reeve’s Bangalore service area, while eligible professional and documentation coordination can extend across India.",
      },
      {
        q: 'How does Reeve decide what the service will cost?',
        a: "We first look at the situation and the work actually required. We then explain the scope and provide a quote before you decide whether to proceed. We don’t publish a fixed NRI-service price because the documents, professionals and processes involved vary substantially between properties.",
      },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="NRI property services in India">
      <h1>NRI Property Services in India</h1>
      <p>One point of contact in India for your property.</p>
      <p>Remote professional, document and tax coordination is available across India. Photography, viewings and physical, on-ground execution are currently Bangalore-only.</p>
      <h2>Choose a service</h2>
      <ul>
        <li><a href="/nri-property-sale-india">NRI Property Sale — documents, tax &amp; sale coordination</a></li>
        <li><a href="/nri-rent-tds-india">NRI Rent &amp; TDS — withholding on Indian rent</a></li>
      </ul>
      <a href="/contact">Talk to Reeve</a>
    </section>
    <!--TESTIMONIALS-->
  </main>
</div>`,
  },

  // ── /nri-property-sale-india ────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'nri-property-sale-india', 'index.html'),
    title: 'NRI Property Sale in India | Reeve',
    description: 'Sell your property in India, even when you live abroad. Reeve is one point of coordination for sale readiness, documents, professionals, buyers and execution.',
    ogTitle: 'NRI Property Sale in India | Reeve',
    ogDescription: 'One point of coordination for an NRI property sale in India — sale readiness, documents, professionals, buyers and execution.',
    canonical: BASE + '/nri-property-sale-india',
    freshness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/nri-property-sale-india#service',
      name: 'NRI Property Sale in India',
      serviceType: 'NRI Property Sale Coordination',
      provider: ORG_REF,
      areaServed: INDIA_AREA,
      description: 'Reeve coordinates an NRI property sale in India — sale readiness, documents, professionals, buyers and execution — as one point of contact.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'NRI Property Services in India', item: WWW + '/nri-property-services-india' },
      { name: 'NRI Property Sale', item: WWW + '/nri-property-sale-india' },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="NRI property sale in India">
      <h1>Sell your property in India, even when you live abroad.</h1>
      <p>One point of coordination for sale readiness, documents, professionals, buyers and execution.</p>
      <h2>Who handles what in an NRI property sale</h2>
      <ul>
        <li>Reeve coordinates sale readiness and document collection, the relevant professionals, and the buyer process — keeping the people, documents and next steps connected.</li>
        <li>Licensed professionals advise; Reeve does not replace them.</li>
        <li>Sale-document and tax coordination is available across India; photography, viewings and on-ground buyer execution are in Bangalore.</li>
      </ul>
      <p>Sale readiness typically covers title-document availability, the ownership chain, an Encumbrance Certificate where applicable, Khata / mutation and municipal or revenue records, and approved plans.</p>
      <p>See all <a href="/nri-property-services-india">NRI property services</a>, or <a href="/contact">talk to Reeve</a>.</p>
    </section>
  </main>
</div>`,
  },

  // ── /nri-rent-tds-india ─────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'nri-rent-tds-india', 'index.html'),
    title: 'NRI Rent & TDS in India | Reeve',
    description: 'Renting out property in India while living abroad? Reeve makes sure the rent, withholding (TDS) and records line up properly.',
    ogTitle: 'NRI Rent & TDS in India | Reeve',
    ogDescription: 'NRI rent and TDS in India — Reeve makes sure the rent, withholding and records line up properly.',
    canonical: BASE + '/nri-rent-tds-india',
    freshness: true,
    service: {
      '@type': 'Service',
      '@id': WWW + '/nri-rent-tds-india#service',
      name: 'NRI Rent & TDS in India',
      serviceType: 'NRI Rent & TDS Coordination',
      provider: ORG_REF,
      areaServed: INDIA_AREA,
      description: 'Reeve helps NRIs renting out property in India make sure the rent, withholding (TDS) and records line up properly.',
    },
    breadcrumb: [
      { name: 'Home', item: WWW + '/' },
      { name: 'NRI Property Services in India', item: WWW + '/nri-property-services-india' },
      { name: 'NRI Rent & TDS', item: WWW + '/nri-rent-tds-india' },
    ],
    bodyHtml: `
<div style="font-family:system-ui,sans-serif">
  <header>
    <a href="/">Reeve</a>
    <nav>
      <a href="/search">Search Properties</a>
      <a href="/property-services-bangalore">Property Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="NRI rent and TDS in India">
      <h1>NRI Rent &amp; TDS in India</h1>
      <p>Renting out property in India while living abroad? Make sure the rent, withholding and records line up properly.</p>
      <p>Reeve coordinates the tenant, CA, records, lower-deduction applications, annual reconciliation and related rental-tax work for NRI property owners across India. Reeve reviews the property, rental history and work required before confirming scope and quote.</p>
      <p>The tenant, the CA and licensed professionals remain responsible for their own statutory obligations; Reeve coordinates rather than replaces them.</p>
      <p>See all <a href="/nri-property-services-india">NRI property services</a>, or <a href="/contact">talk to Reeve</a>.</p>
    </section>
  </main>
</div>`,
  },

];

// ── Write all routes ───────────────────────────────────────────────────────────

let written = 0;

for (const route of routes) {
  const html = buildPage(route);
  writeRoute(route.outFile, html);
  const label = route.outFile.replace(DIST, '').replace(/\\/g, '/') || '/index.html';
  const hasSchema = html.includes('application/ld+json');
  console.log(`✓ pre-rendered ${label}${hasSchema ? ' [+schema]' : ''}`);
  written++;
}

console.log(`\n✓ prerender complete — ${written} routes written (build date ${LAST_UPDATED_ISO} IST)`);
