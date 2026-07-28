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
 *   - dist/owners/index.html  → served for /owners  (pre-rendered, crawlable)
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

const BASE = 'https://reeve.in';
const WWW  = 'https://www.reeve.in';

const BENGALURU_PARENT = {
  '@type': 'City',
  name: 'Bengaluru',
  containedInPlace: { '@type': 'AdministrativeArea', name: 'Karnataka' },
};

const AREA_SERVED = [
  'HSR Layout', 'Koramangala', 'BTM Layout', 'Indiranagar',
  'Whitefield', 'Marathahalli', 'Bellandur', 'Sarjapur Road', 'Electronic City',
].map(name => ({ '@type': 'City', name, containedInPlace: BENGALURU_PARENT }));

const ORG_REF = {
  '@type': 'Organization',
  name: 'Reeve',
  url: WWW,
};

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
          '@type': ['Organization', 'LocalBusiness', 'RealEstateAgent'],
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
          areaServed: AREA_SERVED,
          priceRange: '₹0 for owners',
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
          openingHoursSpecification: [
            {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              opens: '09:00',
              closes: '19:00',
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
      <a href="/owners">For Owners</a>
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
      <p>Every listing shows lister details, response rate, and verified terms before you reach out.</p>
    </section>
    <section aria-label="Contact Without Losing Control">
      <h2>Contact Without Losing Control</h2>
      <p>Send a contact request on your terms. No cold calls, no broker middlemen.</p>
    </section>
    <section aria-label="Different by Design">
      <h2>Different by Design</h2>
      <p>Built for transparency — zero brokerage, 2-month deposit, platform-managed.</p>
    </section>
    <section aria-label="Compact Closing Action">
      <h2>Ready to find your next home?</h2>
      <a href="/search">Search Properties</a>
      <a href="/contact">Contact Us</a>
    </section>
  </main>
</div>`,
  },

  // ── /pms (PMS homepage — previously at /) ───────────────────────────────────
  {
    outFile: path.join(DIST, 'pms', 'index.html'),
    title: 'Reeve | Rentals in Bangalore',
    description: "2-month deposit. Reeve is Bangalore's fully managed rental platform — free for owners, fair for tenants.",
    ogTitle: 'Reeve | Rentals in Bangalore',
    ogDescription: '2-month deposit. Free property management for owners. No brokers. No hidden fees.',
    canonical: BASE + '/pms',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Managed Rentals', item: WWW + '/pms' },
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
      <a href="/owners">For Owners</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Hero">
      <p>Now live in Bangalore</p>
      <h1>Zero brokerage. Two month deposit. Free property management.</h1>
      <p>Reeve manages everything between owners and tenants — at no cost to owners. No brokers. No hidden fees.</p>
      <a href="/search">Search Properties</a>
      <a href="/my-properties/new">List Your Property</a>
    </section>
    <section aria-label="For tenants and owners">
      <article>
        <h2>For Tenants — Save ₹1L+ on day one</h2>
        <p>We charge a 7% Reeve Fee on each month's rent (dropping to 4% when you renew) — instead of a broker's 1–2 months.</p>
        <ul>
          <li>2 month deposit only — not 3</li>
          <li>Zero brokerage, always</li>
          <li>Platform-managed home, no middlemen</li>
        </ul>
        <a href="/savings/tenant">Calculate My Savings</a>
      </article>
      <article>
        <h2>For Owners — ₹0 in fees. Always.</h2>
        <p>Your rent arrives in full, every month.</p>
        <ul>
          <li>Free listing, zero commission</li>
          <li>We handle all tenants — you just get paid</li>
          <li>No visits, no calls, no broker</li>
        </ul>
        <a href="/owners">See Owner Savings</a>
      </article>
    </section>
    <section aria-label="Call to action">
      <h2>Ready to rent smarter?</h2>
      <p>Join Bangalore's only zero-brokerage, fully managed rental platform.</p>
      <a href="/search">Search Properties</a>
      <a href="/my-properties/new">List Your Property</a>
    </section>
  </main>
</div>`,
  },

  // ── /owners ──────────────────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'owners', 'index.html'),
    title: 'For Property Owners in Bangalore | Reeve — Zero Fees, Full Management',
    description: 'Reeve manages your Bangalore rental property end-to-end at ₹0 cost to you. No listing fee, no commission, no broker. Verified tenants, rent collected, exit handled.',
    ogTitle: 'For Property Owners in Bangalore | Reeve',
    ogDescription: 'Zero listing fee. Zero commission. Reeve handles everything — tenant screening, rent collection, maintenance, and exit — at no cost to you.',
    canonical: BASE + '/owners',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/owners#service',
          name: 'Rental Property Management',
          serviceType: 'Rental Property Management',
          provider: ORG_REF,
          areaServed: AREA_SERVED,
          description: 'Reeve manages your Bangalore rental property end-to-end at ₹0 cost to you. Tenant screening, rent collection, maintenance, inspections, and exit all handled by Reeve.',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'For Owners', item: WWW + '/owners' },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What does Reeve charge property owners?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Nothing. Reeve charges property owners ₹0 — zero listing fee, zero commission, and zero monthly owner-side charge. The tenant pays a 7% Reeve Fee on top of the agreed base rent, so your rent is not reduced.',
              },
            },
            {
              '@type': 'Question',
              name: 'Who pays for repainting and deep cleaning at exit?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Reeve bears the cost of standard deep cleaning and standard interior repainting at exit, subject to the service agreement terms. This is at no cost to the owner.',
              },
            },
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
      <a href="/owners">For Owners</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Owner hero">
      <p>For Property Owners</p>
      <h1>₹0 in fees. Your rent, in full, every month.</h1>
      <p>Reeve is Bangalore's fully managed rental platform. We handle everything between you and your tenant — at no cost to you. Zero listing fee, zero commission, zero monthly charge.</p>
      <a href="/my-properties/new">List Your Property Free</a>
      <a href="/contact">Talk to Us</a>
    </section>
    <section aria-label="Owner value proposition">
      <h2>What you get as an owner</h2>
      <ul>
        <li>Free listing — zero listing fee, zero commission</li>
        <li>Verified tenants — Aadhaar, PAN, income, employment, CIBIL range checked</li>
        <li>Rent collected and transferred within 2 business days</li>
        <li>Automated escalation for late payment — you are notified, never asked to chase</li>
        <li>Maintenance portal — coordinated without your involvement for minor items</li>
        <li>All owner–tenant communication routes through Reeve</li>
        <li>Standard deep cleaning and repainting at exit — funded by Reeve</li>
      </ul>
    </section>
    <section aria-label="Full lifecycle management">
      <h2>How Reeve manages your property end-to-end</h2>
      <ol>
        <li>
          <h3>Listing</h3>
          <p>We inspect the property, photograph every room, list the property, and show it to every screened applicant. You are never asked to attend a showing or take a broker call.</p>
        </li>
        <li>
          <h3>Screening</h3>
          <p>Every applicant is verified for Aadhaar, PAN, income, employment, and CIBIL range before their profile reaches you. We filter by qualification standard — not by who responded fastest.</p>
        </li>
        <li>
          <h3>Documentation</h3>
          <p>Move-in condition report signed by the tenant on possession day. Tripartite leave-and-licence agreement executed digitally with eStamp. Move-in inventory record covering every item, key, and remote.</p>
        </li>
        <li>
          <h3>Rent Flow</h3>
          <p>Tenant pays Reeve directly. Your base rent is transferred to your account within 2 business days of collection. Automated escalation handles any late payment.</p>
        </li>
        <li>
          <h3>Maintenance</h3>
          <p>Tenant raises issues via maintenance portal. Reeve acknowledges within 4 hours. Minor items handled without your approval. Larger items need your sign-off within a defined window.</p>
        </li>
        <li>
          <h3>Inspections</h3>
          <p>Inspections at months 5–6 and 10–11 of the tenancy. Every room photographed against the Move In Condition Report. Findings shared with you in a condition update report.</p>
        </li>
        <li>
          <h3>Exit</h3>
          <p>Move-out inspection comparing exit photos against the signed Move In Condition Report. Reeve coordinates all repairs. Standard repainting and deep cleaning funded by Reeve at exit.</p>
        </li>
      </ol>
    </section>
    <section aria-label="FAQ">
      <h2>Frequently asked questions</h2>
      <dl>
        <dt>What does Reeve charge property owners?</dt>
        <dd>Nothing. Reeve charges property owners ₹0 — zero listing fee, zero commission, and zero monthly owner-side charge. The tenant pays a 7% Reeve Fee on top of the agreed base rent, so your rent is not reduced by Reeve's fee.</dd>
        <dt>Do I still approve who moves into my property?</dt>
        <dd>Yes. You receive a clean, verified tenant profile and you decide to accept, reject, or make one counter-offer. You never see raw documents or get direct calls from applicants.</dd>
        <dt>Who pays for repainting and deep cleaning at exit?</dt>
        <dd>Reeve bears the cost of standard deep cleaning and standard interior repainting at exit, subject to the service agreement terms.</dd>
        <dt>When can I take my property back?</dt>
        <dd>Give 2 months' written notice through Reeve and we manage the tenant's exit per the lease terms. There is no penalty after the minimum lock-in period has passed.</dd>
      </dl>
    </section>
    <section aria-label="Owner CTA">
      <h2>List your Bangalore property — free, forever</h2>
      <a href="/my-properties/new">List Your Property</a>
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
      <a href="/owners">For Owners</a>
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

  // ── /savings/tenant ───────────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'savings', 'tenant', 'index.html'),
    title: 'Tenant Savings Calculator | Reeve — See How Much You Save vs a Broker',
    description: 'Calculate how much you save renting through Reeve vs a traditional broker. 2-month deposit, 7% Reeve Fee. Most tenants save ₹1 lakh or more on day one.',
    ogTitle: 'Tenant Savings Calculator | Reeve',
    ogDescription: 'See exactly how much you save renting through Reeve vs a traditional broker. 2-month deposit, no hidden fees.',
    canonical: BASE + '/savings/tenant',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          '@id': WWW + '/savings/tenant#app',
          name: 'Reeve Tenant Savings Calculator',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'All',
          url: WWW + '/savings/tenant',
          description: 'Calculate how much you save renting through Reeve vs a traditional broker in Bangalore. Compare brokerage, deposit, and monthly costs.',
          provider: ORG_REF,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Tenant Savings Calculator', item: WWW + '/savings/tenant' },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'How much does Reeve charge tenants?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Reeve charges a 7% Reeve Fee per month on the base rent during the first lease term, dropping to 4% from the second term onwards. There is no brokerage fee and the security deposit is capped at 2 months.',
              },
            },
            {
              '@type': 'Question',
              name: 'How much do tenants save compared to a traditional broker?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'At ₹50,000/month rent, tenants save ₹50,000–₹1,00,000 in brokerage and ₹50,000 in deposit (2 months vs 3), for a total upfront saving of ₹1 lakh or more on day one.',
              },
            },
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
      <a href="/owners">For Owners</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Tenant savings calculator">
      <h1>How Much Do You Save Renting Through Reeve?</h1>
      <p>Traditional brokers charge 1–2 months' rent as brokerage plus a 3-month deposit. Reeve charges a 7% Reeve Fee per month (dropping to 4% on renewal), and only a 2-month deposit.</p>
      <h2>What Reeve charges tenants</h2>
      <ul>
        <li>Save 1–2 months' rent immediately</li>
        <li>2-month deposit (not 3) — save 1 extra month upfront</li>
        <li>7% Reeve Fee per month on base rent (4% from year 2)</li>
        <li>No hidden fees</li>
      </ul>
      <h2>Example savings at ₹50,000/month rent</h2>
      <table>
        <thead>
          <tr><th>Item</th><th>Traditional (broker)</th><th>Reeve</th><th>You save</th></tr>
        </thead>
        <tbody>
          <tr><td>Brokerage</td><td>₹50,000–₹1,00,000</td><td>₹0</td><td>₹50,000–₹1,00,000</td></tr>
          <tr><td>Security deposit</td><td>₹1,50,000 (3 months)</td><td>₹1,00,000 (2 months)</td><td>₹50,000</td></tr>
          <tr><td>Reeve Fee (monthly)</td><td>—</td><td>₹3,500 (7% of rent)</td><td>—</td></tr>
        </tbody>
      </table>
      <p>Use the interactive calculator on this page to enter your specific rent and see your personalised savings breakdown.</p>
      <a href="/search">Find a Property</a>
    </section>
  </main>
</div>`,
  },

  // ── /contact ──────────────────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'contact', 'index.html'),
    title: 'Contact Reeve | Bangalore Rental Platform',
    description: "Get in touch with Reeve — Bangalore's fully managed rental platform. Call, WhatsApp, or email us. We're a small team and we read every message.",
    ogTitle: 'Contact Reeve | Bangalore Rental Platform',
    ogDescription: "Get in touch with Reeve. Call, WhatsApp, or email — we're a small team and we read every message.",
    canonical: BASE + '/contact',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'LocalBusiness',
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
          areaServed: AREA_SERVED,
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
      <a href="/owners">For Owners</a>
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
          <p><a href="mailto:hello@reeve.in">hello@reeve.in</a></p>
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

  // ── /move-in-audit ─────────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'move-in-audit', 'index.html'),
    title: 'Move-in Audit — Rental Handover Documentation | Reeve',
    description: 'Reeve documents the visible condition of your rented flat before possession — photos, videos, room-wise notes, and a neutral PDF report shared with all parties. Bengaluru rentals.',
    ogTitle: 'Move-in Audit — Document Your Rental Before Possession',
    ogDescription: 'A neutral handover record so deposit discussions are based on evidence, not memory. For tenants, owners, and brokers in Bengaluru.',
    canonical: BASE + '/move-in-audit',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Service',
          '@id': WWW + '/move-in-audit#service',
          name: 'Reeve Move-in Audit',
          serviceType: 'Rental Handover Documentation',
          description: 'A neutral room-wise documentation of a rented flat\'s visible condition at handover, with photos, videos, and a PDF report shared with tenant and owner.',
          provider: ORG_REF,
          areaServed: AREA_SERVED,
          offers: [
            { '@type': 'Offer', name: '1 BHK Move-in Audit', price: '1199', priceCurrency: 'INR' },
            { '@type': 'Offer', name: '2 BHK Move-in Audit', price: '2199', priceCurrency: 'INR' },
            { '@type': 'Offer', name: '3 BHK+ Move-in Audit', price: '2999', priceCurrency: 'INR' },
          ],
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home',         item: WWW + '/' },
            { '@type': 'ListItem', position: 2, name: 'Move-in Audit', item: WWW + '/move-in-audit' },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Is this a structural inspection?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. A Reeve Move-in Audit documents what is visibly observable during the handover visit. It does not cover hidden defects, structural integrity, electrical compliance, plumbing pressure, pest presence, or property valuation. It is a documentation service, not a technical inspection.',
              },
            },
            {
              '@type': 'Question',
              name: 'Who should pay for it?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Anyone — the tenant, the owner, or the broker. Many tenants book it to protect their deposit. Some owners book it to have a clean record from day one. Brokers sometimes include it as part of a premium handover. The report remains neutral regardless of who pays.',
              },
            },
            {
              '@type': 'Question',
              name: 'Will this guarantee my deposit is returned?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. A Move-in Audit creates a documented baseline — a neutral record of the property\'s condition on the day of possession. It does not guarantee any outcome. What it does is replace guesswork with evidence, so that any deposit discussion is based on a shared, dated record rather than conflicting memories.',
              },
            },
            {
              '@type': 'Question',
              name: 'Do both owner and tenant get the report?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. The same report is shared with both parties. Neither the owner nor the tenant receives a version that differs from the other.',
              },
            },
            {
              '@type': 'Question',
              name: 'Can brokers book this for their clients?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Brokers can book a Move-in Audit for any rental handover they are facilitating. The booking process is the same — you select the BHK size, share the property address, and choose a date. An optional co-branded report mention is available for brokers who complete multiple handovers through Reeve.',
              },
            },
            {
              '@type': 'Question',
              name: 'Do you inspect fully furnished homes?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Fully furnished homes are covered, with an additional fee of ₹500 to ₹750 depending on scope. This applies when the flat has extensive furniture, multiple appliances, or requires item-level documentation beyond standard scope.',
              },
            },
            {
              '@type': 'Question',
              name: 'When should I book it?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Ideally, after the rental agreement is finalised but before physical possession is taken — specifically before keys are handed over, before the tenant moves furniture in, and before the first night in the flat. This ensures the condition is documented before the tenant occupies the space. A Move-in Audit can also be conducted at move-out to compare exit condition against the move-in baseline.',
              },
            },
            {
              '@type': 'Question',
              name: 'What if the owner or tenant disagrees with an observation?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Any party who disagrees with a specific observation in the report can raise it formally. The disagreement is recorded as a signed addendum attached to the original report. The original report is not changed — the addendum becomes part of the record alongside it.',
              },
            },
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
      <a href="/owners">For Owners</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section aria-label="Move-in Audit hero">
      <p>For tenants, owners, and brokers in Bengaluru</p>
      <h1>Move in with clarity, not confusion.</h1>
      <p>Reeve documents the visible condition of a rented flat before possession — room by room, with photos, videos, and a neutral PDF report shared with all parties.</p>
      <a href="/contact?service=move-in-audit">Book a Move-in Audit</a>
    </section>
    <section aria-label="What we document">
      <h2>What Reeve captures during a Move-in Audit</h2>
      <ul>
        <li>Room-wise condition — walls, flooring, ceiling, doors, windows, electrical, and plumbing</li>
        <li>Photo and video evidence — captured during the visit and shared via a secure link</li>
        <li>Keys and locks — number of keys, lock type, brand, and condition</li>
        <li>Utilities and meters — electricity, water, gas consumer IDs and readings</li>
        <li>Fixtures and fittings — light fixtures, fans, geysers, exhaust fans</li>
        <li>Appliances and furniture — inventory with brand, model, condition, and ownership</li>
        <li>Pre-existing damages — documented with location, type, and severity</li>
        <li>PDF handover report — structured, branded, shared after the visit</li>
      </ul>
    </section>
    <section aria-label="Pricing">
      <h2>Simple pricing. No hidden costs.</h2>
      <ul>
        <li>1 BHK: ₹1,199</li>
        <li>2 BHK: ₹2,199</li>
        <li>3 BHK+: ₹2,999</li>
      </ul>
      <p>Fully furnished or heavy inventory: +₹500 to ₹750 depending on scope.</p>
      <p>Anyone can pay — tenant, owner, broker, or split between parties. The report remains neutral regardless of who pays.</p>
    </section>
    <section aria-label="Call to action">
      <h2>Moving in soon? Document it before you take the keys.</h2>
      <a href="/contact?service=move-in-audit">Book a Move-in Audit</a>
      <a href="/contact">Talk to Reeve</a>
    </section>
    <section aria-label="FAQ">
      <h2>Common questions</h2>
      <dl>
        <dt>Is this a structural inspection?</dt>
        <dd>No. A Reeve Move-in Audit documents what is visibly observable during the handover visit. It does not cover hidden defects, structural integrity, electrical compliance, plumbing pressure, pest presence, or property valuation. It is a documentation service, not a technical inspection.</dd>
        <dt>Who should pay for it?</dt>
        <dd>Anyone — the tenant, the owner, or the broker. Many tenants book it to protect their deposit. Some owners book it to have a clean record from day one. Brokers sometimes include it as part of a premium handover. The report remains neutral regardless of who pays.</dd>
        <dt>Will this guarantee my deposit is returned?</dt>
        <dd>No. A Move-in Audit creates a documented baseline — a neutral record of the property's condition on the day of possession. It does not guarantee any outcome. What it does is replace guesswork with evidence, so that any deposit discussion is based on a shared, dated record rather than conflicting memories.</dd>
        <dt>Do both owner and tenant get the report?</dt>
        <dd>Yes. The same report is shared with both parties. Neither the owner nor the tenant receives a version that differs from the other.</dd>
        <dt>Can brokers book this for their clients?</dt>
        <dd>Yes. Brokers can book a Move-in Audit for any rental handover they are facilitating. The booking process is the same — you select the BHK size, share the property address, and choose a date. An optional co-branded report mention is available for brokers who complete multiple handovers through Reeve.</dd>
        <dt>Do you inspect fully furnished homes?</dt>
        <dd>Yes. Fully furnished homes are covered, with an additional fee of ₹500 to ₹750 depending on scope. This applies when the flat has extensive furniture, multiple appliances, or requires item-level documentation beyond standard scope.</dd>
        <dt>When should I book it?</dt>
        <dd>Ideally, after the rental agreement is finalised but before physical possession is taken — specifically before keys are handed over, before the tenant moves furniture in, and before the first night in the flat. This ensures the condition is documented before the tenant occupies the space. A Move-in Audit can also be conducted at move-out to compare exit condition against the move-in baseline.</dd>
        <dt>What if the owner or tenant disagrees with an observation?</dt>
        <dd>Any party who disagrees with a specific observation in the report can raise it formally. The disagreement is recorded as a signed addendum attached to the original report. The original report is not changed — the addendum becomes part of the record alongside it.</dd>
      </dl>
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
