import Layout from "@/components/Layout";

const tocLinks = [
  { id: "introduction", label: "Introduction" },
  { id: "data-we-collect", label: "Data We Collect" },
  { id: "how-we-use", label: "How We Use It" },
  { id: "data-sharing", label: "Data Sharing" },
  { id: "data-retention", label: "Data Retention" },
  { id: "account-deletion", label: "Account Deletion" },
  { id: "aadhaar-pan", label: "Aadhaar & PAN" },
  { id: "your-rights", label: "Your Rights" },
  { id: "cookies", label: "Cookies & Analytics" },
  { id: "data-security", label: "Data Security" },
  { id: "grievance", label: "Grievance Officer" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

const h2 = "text-lg font-semibold text-slate-900 mt-12 mb-3 scroll-mt-8";
const h3 = "text-base font-semibold text-slate-800 mt-6 mb-2";
const p = "text-base text-slate-600 leading-8 mt-3";
const ul = "list-disc list-outside pl-5 space-y-2 text-base text-slate-600 leading-7 mt-3";
const highlight = "rounded-xl border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-sm text-slate-700 leading-7 my-6";
const dm = { fontFamily: "'DM Sans', sans-serif" };

const Privacy = () => {
  return (
    <Layout>
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
            {/* TOC sidebar */}
            <aside className="hidden lg:block">
              <nav className="sticky top-8">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 mb-4">ON THIS PAGE</p>
                {tocLinks.map((l) => (
                  <a
                    key={l.id}
                    href={`#${l.id}`}
                    className="block text-sm text-slate-500 hover:text-blue-600 py-1.5 border-l-2 border-transparent hover:border-blue-400 pl-3 transition-all duration-150"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">LEGAL</p>
              <h1
                className="mt-3"
                style={{ fontFamily: "'Instrument Serif', serif", fontSize: "40px", color: "#0F172A" }}
              >
                Privacy Policy
              </h1>
              <p className="text-sm mt-2" style={{ color: "#64748B" }}>
                Last updated: March 2026
              </p>
              <hr className="border-t mt-8 mb-10" style={{ borderColor: "#E2E8F0" }} />

              {/* 1 */}
              <h2 id="introduction" className={h2} style={dm}>
                Introduction
              </h2>
              <p className={p} style={dm}>
                Serial Makers Private Limited ("Reeve", "we", "us") operates the Reeve platform at reeve.in — a property
                management and rental placement service operating in Bangalore, India. This Privacy Policy explains what
                personal data we collect, why we collect it, how we use it, who we share it with, and your rights under
                applicable Indian law including the Digital Personal Data Protection Act, 2023 (DPDPA).
              </p>
              <p className={p} style={dm}>
                By using the Reeve platform, you agree to the collection and use of your data as described in this
                policy.
              </p>

              {/* 2 */}
              <h2 id="data-we-collect" className={h2} style={dm}>
                Data We Collect
              </h2>
              <p className={p} style={dm}>
                We collect the following categories of personal data depending on your role on the platform:
              </p>

              <h3 className={h3} style={dm}>
                Tenants
              </h3>
              <ul className={ul} style={dm}>
                <li>Full name, phone number, email address</li>
                <li>Date of birth, gender, marital status, occupation</li>
                <li>Aadhaar number; (full number handled under UIDAI-compliant protocols)</li>
                <li>PAN number</li>
                <li>Salary slips, employment letters, ITR, or bank statements (income verification)</li>
                <li>Self-declared CIBIL score range</li>
                <li>Resident details (names, ages, relationship of co-residents)</li>
                <li>Photo ID documents</li>
                <li>Move-in condition report photos</li>
              </ul>

              <h3 className={h3} style={dm}>
                Property Owners
              </h3>
              <ul className={ul} style={dm}>
                <li>Full name, phone number, email address</li>
                <li>Aadhaar number (for eKYC)</li>
                <li>PAN number (mandatory for TDS compliance)</li>
                <li>Bank account details (for rent payouts)</li>
                <li>Property ownership documents (sale deed, society NOC)</li>
              </ul>

              <h3 className={h3} style={dm}>
                All Users
              </h3>
              <ul className={ul} style={dm}>
                <li>Device type, browser type, pages visited, time on page (via PostHog analytics)</li>
                <li>Error logs (via Sentry error monitoring)</li>
                <li>Login timestamps and session data</li>
              </ul>

              {/* 3 */}
              <h2 id="how-we-use" className={h2} style={dm}>
                How We Use Your Data
              </h2>
              <p className={p} style={dm}>
                We use your data for the following purposes:
              </p>
              <ul className={ul} style={dm}>
                <li>Verifying your identity and eligibility to use the platform</li>
                <li>Processing and evaluating rental applications</li>
                <li>Executing digitally signed Leave and Licence Agreements and Service Agreements</li>
                <li>Collecting and remitting rent payments</li>
                <li>Coordinating property visits, maintenance, and move-in/move-out processes</li>
                <li>Communicating with you about your application, tenancy, or listing</li>
                <li>
                  Complying with legal obligations including TDS (Section 194IB), DPDPA, and applicable tenancy laws
                </li>
                <li>Detecting and preventing fraud and misrepresentation</li>
                <li>Improving platform performance and user experience (using anonymised analytics data)</li>
              </ul>

              {/* 4 */}
              <h2 id="data-sharing" className={h2} style={dm}>
                Who We Share Your Data With
              </h2>
              <div className={highlight}>
                Property owners never receive copies of tenant identity documents, KYC documents, or financial records.
                Owners receive only the tenant's name, occupation, employer name, self-declared CIBIL range, resident
                count, and proposed rent when reviewing an application.
              </div>
              <p className={p} style={dm}>
                We share data with third parties only where necessary:
              </p>
              <ul className={ul} style={dm}>
                <li>Payment processors — for rent collection and payouts</li>
                <li>KYC and eSign providers — for identity verification and digital agreement execution</li>
                <li>
                  Government authorities — where required by law (e.g. police verification for foreign citizen tenants,
                  tax authorities)
                </li>
                <li>
                  Analytics and monitoring tools — PostHog (usage analytics) and Sentry (error monitoring). Both process
                  anonymised or pseudonymised data.
                </li>
              </ul>
              <p className={p} style={dm}>
                We do not sell, rent, or trade your personal data to any third party for commercial purposes. Ever.
              </p>

              {/* 5 */}
              <h2 id="data-retention" className={h2} style={dm}>
                Data Retention
              </h2>
              <p className={p} style={dm}>
                We retain your personal data for the duration of your active tenancy or listing on the platform, plus
                two years following the closure of your last lease or management agreement. After this period, your data
                is deleted or anonymised unless we are required to retain it by law.
              </p>
              <p className={p} style={dm}>
                Documents submitted for KYC are retained for the same period and are stored in encrypted cloud storage
                with access restricted to authorised Reeve personnel only.
              </p>

              {/* 6 */}
              <h2 id="account-deletion" className={h2} style={dm}>
                Account Deletion
              </h2>
              <p className={p} style={dm}>
                You may request deletion of your Reeve account at any time by contacting us at{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">
                  support@reeve.in
                </a>
                . We do not offer self-serve account deletion through the platform — all deletion requests must go
                through our support team so we can verify your identity and assess any active obligations.
              </p>
              <div className={highlight}>
                <p className="mb-2 font-medium">Account deletion timelines depend on your status on the platform:</p>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li>
                    If you have no active lease, no pending application, and no listed property under management — your
                    account will be deleted within 7 business days of your verified request.
                  </li>
                  <li>
                    If you are an active tenant under a signed Leave and Licence Agreement, or a property owner whose
                    property has undergone a Reeve inspection — your account and associated property data cannot be
                    fully deleted for a minimum of 12 months from the date of your request, or until all active
                    agreements and legal obligations have been concluded, whichever is later. This is required for legal
                    compliance, dispute resolution, and audit purposes.
                  </li>
                </ul>
                <p className="mt-2">
                  After the applicable retention period, your personal data will be deleted or anonymised in accordance
                  with our Data Retention policy above.
                </p>
              </div>

              {/* 7 */}
              <h2 id="aadhaar-pan" className={h2} style={dm}>
                Aadhaar and PAN Compliance
              </h2>
              <div className={highlight}>
                Aadhaar numbers are never stored in plain text in any Reeve database. Full Aadhaar processing is handled
                in compliance with the Aadhaar Act, 2016 and UIDAI regulations. Aadhaar data is used solely for identity
                and address verification — never for profiling, targeting, or any other purpose.
              </div>
              <p className={p} style={dm}>
                PAN data is collected and handled in compliance with the Income Tax Act and CBDT guidelines. PAN is used
                solely for TDS compliance (Section 194IB) and identity verification purposes.
              </p>

              {/* 8 */}
              <h2 id="your-rights" className={h2} style={dm}>
                Your Rights Under DPDPA 2023
              </h2>
              <div className={highlight}>
                <p className="mb-2">
                  Under the Digital Personal Data Protection Act, 2023, you have the following rights:
                </p>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li>Right to access the personal data we hold about you</li>
                  <li>Right to correction of inaccurate or incomplete data</li>
                  <li>Right to erasure of your data, subject to legal retention requirements</li>
                  <li>Right to grievance redressal within 30 days of raising a complaint</li>
                  <li>Right to nominate another individual to exercise your rights on your behalf</li>
                </ul>
              </div>
              <p className={p} style={dm}>
                To exercise any of these rights, contact our Grievance Officer at{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">
                  support@reeve.in
                </a>
                . We will respond within 30 days.
              </p>

              {/* 9 */}
              <h2 id="cookies" className={h2} style={dm}>
                Cookies and Analytics
              </h2>
              <p className={p} style={dm}>
                The Reeve platform uses the following tools that may set cookies or collect usage data:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  PostHog — product analytics. Tracks page views, feature usage, and conversion events. Data is used
                  solely to improve the platform experience.
                </li>
                <li>
                  Sentry — error monitoring. Captures anonymised error reports to help us identify and fix platform
                  issues.
                </li>
              </ul>
              <p className={p} style={dm}>
                We do not use advertising cookies, tracking pixels, or any third-party marketing analytics.
              </p>

              {/* 10 */}
              <h2 id="data-security" className={h2} style={dm}>
                Data Security
              </h2>
              <p className={p} style={dm}>
                We implement the following security measures to protect your personal data:
              </p>
              <ul className={ul} style={dm}>
                <li>All data is stored in encrypted databases hosted in AWS ap-south-1, Mumbai region</li>
                <li>Documents are stored in encrypted cloud storage (Cloudflare R2) with restricted access</li>
                <li>Row-level security policies ensure users can only access their own data</li>
                <li>All platform connections are served over HTTPS</li>
                <li>Access to production data is restricted to authorised Reeve personnel only</li>
              </ul>
              <p className={p} style={dm}>
                Despite these measures, no system is completely secure. In the event of a data breach that affects your
                rights, we will notify you as required by applicable law.
              </p>

              {/* 11 */}
              <h2 id="grievance" className={h2} style={dm}>
                Grievance Officer
              </h2>
              <div className={highlight}>
                <p className="mb-2">
                  In accordance with the Digital Personal Data Protection Act, 2023, Reeve has designated a Grievance
                  Officer for data-related complaints:
                </p>
                <p className="mt-2">Grievance Officer: Serial Makers Private Limited.</p>
                <p>
                  Email:{" "}
                  <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">
                    support@reeve.in
                  </a>
                </p>
                <p>Response time: Within 30 days of receiving your complaint</p>
                <p className="mt-2">
                  If your complaint is not resolved to your satisfaction, you may escalate to the Data Protection Board
                  of India once operational under the DPDPA framework.
                </p>
              </div>

              {/* 12 */}
              <h2 id="changes" className={h2} style={dm}>
                Changes to This Policy
              </h2>
              <p className={p} style={dm}>
                We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date
                at the top of this page. For significant changes, we will notify you via email or a platform
                notification. Continued use of the platform after any changes constitutes acceptance of the updated
                policy.
              </p>

              {/* 13 */}
              <h2 id="contact" className={h2} style={dm}>
                Contact
              </h2>
              <p className={p} style={dm}>
                For any questions about this Privacy Policy or how we handle your data, contact us at{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">
                  support@reeve.in
                </a>
                .
              </p>

              {/* Footer */}
              <hr className="mt-16 border-t" style={{ borderColor: "#E2E8F0" }} />
              <div className="flex justify-between flex-wrap gap-4 mt-8">
                <span className="text-sm" style={{ color: "#64748B" }}>
                  Questions? Email{" "}
                  <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">
                    support@reeve.in
                  </a>
                </span>
                <span
                  className="text-sm text-blue-600 hover:underline cursor-pointer"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  Back to top ↑
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
