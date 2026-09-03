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
 * Vercel serves static files before applying rewrites, so:
 *   - dist/property-management-bangalore/index.html → served for /property-management-bangalore (pre-rendered, crawlable)
 *   - dist/index.html         → patched in-place for /
 *   - All auth routes         → no static file → catch-all rewrite → CSR as before
 *
 * React uses createRoot (not hydrateRoot), so it replaces static HTML on mount.
 * No hydration mismatch issues.
 *
 * JSON-LD notes:
 *   - Schema is injected here at build time, NOT in React components.
 *   - aggregateRating must not be added until 5+ Google reviews exist.
 *   - safeJsonLd() Unicode-escapes <, >, & so the JSON is safe inside <script> tags.
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

/**
 * Build a complete HTML page by patching the Vite-built shell.
 * @param {object} opts
 * @param {string} opts.title         <title> content
 * @param {string} opts.description   <meta name="description">
 * @param {string} opts.ogTitle       og:title
 * @param {string} opts.ogDescription og:description
 * @param {string} opts.canonical     canonical URL
 * @param {string} opts.bodyHtml      HTML to inject inside <div id="root">
 * @param {object} [opts.jsonLd]      JSON-LD schema object (injected before </head>)
 */
function buildPage({ title, description, ogTitle, ogDescription, canonical, bodyHtml, jsonLd }) {
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

  // JSON-LD schema — injected just before </head> so it never conflicts
  // with existing <meta> or <title> tags already written above.
  if (jsonLd) {
    const scriptBlock = `\n  <script type="application/ld+json">\n${safeJsonLd(jsonLd)}\n  </script>`;
    html = html.replace('</head>', `${scriptBlock}\n</head>`);
  }

  // inject pre-rendered body into #root
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${bodyHtml}</div>`
  );

  return html;
}

function writeRoute(outPath, html) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf-8');
}

// ── Shared data ───────────────────────────────────────────────────────────────

// Canonical host is www. Single source of truth; WWW kept as an alias so existing
// schema references (url/@id/breadcrumb item) resolve to the same canonical host.
const BASE = 'https://www.reeve.in';
const WWW  = BASE;

const ORG_REF = {
  '@type': 'Organization',
  name: 'Reeve',
  url: WWW,
};

// areaServed values, matched to each page's actual geography.
const BENGALURU_AREA = {
  '@type': 'City',
  name: 'Bengaluru',
  containedInPlace: { '@type': 'AdministrativeArea', name: 'Karnataka' },
};
const INDIA_AREA = { '@type': 'Country', name: 'India' };

// ── Route definitions ─────────────────────────────────────────────────────────

const routes = [
  // ── / (homepage) — patched in-place ────────────────────────────────────────
  {
    outFile: path.join(DIST, 'index.html'),
    title: 'Reeve — See More Before You Contact',
    description: 'Reeve is a transparent property marketplace. See lister info, responsiveness, terms, and history before you make contact.',
    ogTitle: 'Reeve — See More Before You Contact',
    ogDescription: 'Reeve is a transparent property marketplace. See lister info, responsiveness, terms, and history before you make contact.',
    canonical: BASE + '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': WWW + '/#organization',
          name: 'Reeve',
          legalName: 'Serial Makers Private Limited',
          url: WWW,
          telephone: '+917899874281',
          email: 'support@reeve.in',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Shubh Encl, HSR Layout',
            addressLocality: 'Bengaluru',
            addressRegion: 'Karnataka',
            postalCode: '560102',
            addressCountry: 'IN',
          },
          areaServed: INDIA_AREA,
          image: WWW + '/icon-192.png',
          sameAs: [
            'https://www.linkedin.com/company/reeve-pm/',
            'https://x.com/reeve_pm',
          ],
          founder: [
            {
              '@type': 'Person',
              name: 'Lohit Agarwal',
              jobTitle: 'Co-founder',
              sameAs: 'https://www.linkedin.com/in/lohit24a/',
              worksFor: { '@id': WWW + '/#organization' },
            },
            {
              '@type': 'Person',
              name: 'Daksh Jain',
              jobTitle: 'Co-founder',
              sameAs: 'https://www.linkedin.com/in/dakshjain127/',
              worksFor: { '@id': WWW + '/#organization' },
            },
          ],
        },
        {
          '@type': 'WebSite',
          '@id': WWW + '/#website',
          name: 'Reeve',
          url: WWW,
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Search Properties', item: WWW + '/search' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': WWW + '/#organization',
          name: 'Reeve',
          legalName: 'Serial Makers Private Limited',
          url: WWW,
          image: WWW + '/icon-192.png',
          telephone: '+917899874281',
          email: 'support@reeve.in',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Shubh Encl, HSR Layout',
            addressLocality: 'Bengaluru',
            addressRegion: 'Karnataka',
            postalCode: '560102',
            addressCountry: 'IN',
          },
          areaServed: INDIA_AREA,
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
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Contact', item: WWW + '/contact' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/property-services-bangalore#service',
          name: 'Reeve Property Services in Bangalore',
          serviceType: 'Property Services',
          provider: ORG_REF,
          areaServed: BENGALURU_AREA,
          description: 'Reeve manages rented properties, looks after empty ones, and finds tenants in Bangalore. Ongoing services start at ₹2,000/month.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/property-management-bangalore#service',
          name: 'Reeve Managed — Property Management in Bangalore',
          serviceType: 'Property Management',
          provider: ORG_REF,
          areaServed: BENGALURU_AREA,
          description: 'Reeve handles tenant communication, property visits, repairs and records in Bangalore through one accountable Reeve contact, wherever you live.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
            { '@type': 'ListItem', position: 3, name: 'Property Management', item: WWW + '/property-management-bangalore' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/vacant-property-care-bangalore#service',
          name: 'Reeve Watch — Vacant Property Care in Bangalore',
          serviceType: 'Vacant Property Care',
          provider: ORG_REF,
          areaServed: BENGALURU_AREA,
          description: 'Reeve looks after empty homes in Bangalore with monthly visits, preventive checks, and coordination of anything that needs attention.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
            { '@type': 'ListItem', position: 3, name: 'Vacant Property Care', item: WWW + '/vacant-property-care-bangalore' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/find-tenant-bangalore#service',
          name: 'Reeve Let — Tenant Placement in Bangalore',
          serviceType: 'Tenant Placement',
          provider: ORG_REF,
          areaServed: BENGALURU_AREA,
          description: 'Reeve finds a tenant for your Bangalore property with professional listing, Reeve-conducted viewings, negotiation, agreement and documented handover.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
            { '@type': 'ListItem', position: 3, name: 'Find a Tenant', item: WWW + '/find-tenant-bangalore' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/khata-transfer-bangalore#service',
          name: 'Khata Transfer & Mutation in Bangalore',
          serviceType: 'Property Record Transfer',
          provider: ORG_REF,
          areaServed: BENGALURU_AREA,
          description: 'Reeve helps with Khata transfer and mutation in Bangalore when the recorded owner is wrong, an application has come back, ownership changed through inheritance, or the property record cannot be found or matched cleanly.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Property Services in Bangalore', item: WWW + '/property-services-bangalore' },
            { '@type': 'ListItem', position: 3, name: 'Khata Transfer', item: WWW + '/khata-transfer-bangalore' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/nri-property-services-india#service',
          name: 'NRI Property Services in India',
          serviceType: 'NRI Property Services',
          provider: ORG_REF,
          areaServed: INDIA_AREA,
          description: 'Reeve is one point of contact in India for an NRI-owned property — sale coordination, rent and TDS, documents and professionals.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'NRI Property Services in India', item: WWW + '/nri-property-services-india' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/nri-property-sale-india#service',
          name: 'NRI Property Sale in India',
          serviceType: 'NRI Property Sale Coordination',
          provider: ORG_REF,
          areaServed: INDIA_AREA,
          description: 'Reeve coordinates an NRI property sale in India — sale readiness, documents, professionals, buyers and execution — as one point of contact.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'NRI Property Services in India', item: WWW + '/nri-property-services-india' },
            { '@type': 'ListItem', position: 3, name: 'NRI Property Sale', item: WWW + '/nri-property-sale-india' },
          ],
        },
      ],
    },
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
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/nri-rent-tds-india#service',
          name: 'NRI Rent & TDS in India',
          serviceType: 'NRI Rent & TDS Coordination',
          provider: ORG_REF,
          areaServed: INDIA_AREA,
          description: 'Reeve helps NRIs renting out property in India make sure the rent, withholding (TDS) and records line up properly.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'NRI Property Services in India', item: WWW + '/nri-property-services-india' },
            { '@type': 'ListItem', position: 3, name: 'NRI Rent & TDS', item: WWW + '/nri-rent-tds-india' },
          ],
        },
      ],
    },
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

console.log(`\n✓ prerender complete — ${written} routes written`);
