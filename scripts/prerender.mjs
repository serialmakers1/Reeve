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
    title: 'Reeve | Zero Brokerage Rentals in Bangalore',
    description: "Zero brokerage. 2-month deposit. Reeve is Bangalore's fully managed rental platform — free for owners, fair for tenants.",
    ogTitle: 'Reeve | Zero Brokerage Rentals in Bangalore',
    ogDescription: 'Zero brokerage. 2-month deposit. Free property management for owners. No brokers. No hidden fees.',
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
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Does the owner pay any fee to Reeve?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. Owners pay nothing to Reeve. The Reeve Service Fee of 7% (first term) or 4% (renewal) is charged to the tenant only.',
              },
            },
            {
              '@type': 'Question',
              name: 'What is the security deposit cap on Reeve?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Reeve enforces a 2-month security deposit cap on all properties. No property on the platform can demand more.',
              },
            },
            {
              '@type': 'Question',
              name: 'Which areas in Bengaluru does Reeve serve?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Reeve currently operates in HSR Layout, Koramangala, BTM Layout, Indiranagar, Whitefield, Marathahalli, Bellandur, Sarjapur Road, and Electronic City.',
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
    <section aria-label="Hero">
      <p>Now live in Bangalore</p>
      <p>Reeve is Bangalore's fully managed rental platform — for tenants who want a fair deal, and owners who want their time back.</p>
      <h1>Zero brokerage. Two month deposit. Free property management.</h1>
      <p>Reeve manages everything between owners and tenants — at no cost to owners. No brokers. No hidden fees. Just a great home and a stress-free tenancy.</p>
      <a href="/search">Search Properties</a>
      <a href="/my-properties/new">List Your Property</a>
    </section>
    <section aria-label="For tenants and owners">
      <article>
        <h2>For Tenants — Save ₹1L+ on day one</h2>
        <p>We charge a 7% Reeve Fee on each month's rent (dropping to 4% when you renew) — instead of a broker's 1–2 months. You save significantly on day one.</p>
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
      <p>₹0 Brokerage · 2 Month Deposit · Fully Managed for Free</p>
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
    title: 'Search Rental Properties in Bangalore | Reeve — Zero Brokerage',
    description: 'Browse zero-brokerage rental properties in Bangalore. Filter by BHK, locality, and rent range. Fully managed homes — no broker, no hidden fees, 2-month deposit.',
    ogTitle: 'Search Rental Properties in Bangalore | Reeve',
    ogDescription: 'Zero brokerage rental properties in Bangalore. Fully managed, professionally screened. No broker fees, 2-month deposit.',
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
      <h1>Rental Properties in Bangalore — Zero Brokerage</h1>
      <p>Browse Reeve-managed rental homes in Bangalore. Every property is professionally managed — tenant screening, rent collection, maintenance, and exit handled by Reeve. No broker, no hidden fees, 2-month deposit only.</p>
      <p>Filter by BHK, locality, furnishing, and rent range to find your ideal home. All listed properties are actively managed and ready for verified applicants.</p>
      <ul>
        <li>Zero brokerage on every property</li>
        <li>2-month deposit — not 3</li>
        <li>Fully managed: no direct landlord contact needed</li>
        <li>Aadhaar + PAN + income verification before move-in</li>
      </ul>
    </section>
  </main>
</div>`,
  },

  // ── /savings/tenant ───────────────────────────────────────────────────────────
  {
    outFile: path.join(DIST, 'savings', 'tenant', 'index.html'),
    title: 'Tenant Savings Calculator | Reeve — See How Much You Save vs a Broker',
    description: 'Calculate how much you save renting through Reeve vs a traditional broker. Zero brokerage, 2-month deposit, 7% Reeve Fee. Most tenants save ₹1 lakh or more on day one.',
    ogTitle: 'Tenant Savings Calculator | Reeve',
    ogDescription: 'See exactly how much you save renting through Reeve vs a traditional broker. Zero brokerage, 2-month deposit, no hidden fees.',
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
      <p>Traditional brokers charge 1–2 months' rent as brokerage plus a 3-month deposit. Reeve charges zero brokerage, a 7% Reeve Fee per month (dropping to 4% on renewal), and only a 2-month deposit.</p>
      <h2>What Reeve charges tenants</h2>
      <ul>
        <li>Zero brokerage — save 1–2 months' rent immediately</li>
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
    description: "Get in touch with Reeve — Bangalore's zero-brokerage rental platform. Call, WhatsApp, or email us. We're a small team and we read every message.",
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
