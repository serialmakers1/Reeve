import Layout from "@/components/Layout";

const tocLinks = [
  { id: "introduction", label: "Introduction" },
  { id: "eligibility", label: "Eligibility" },
  { id: "platform-rules", label: "Platform Rules" },
  { id: "account-deletion", label: "Account Deletion" },
  { id: "tenant-obligations", label: "Tenant Obligations" },
  { id: "owner-obligations", label: "Owner Obligations" },
  { id: "service-fee", label: "Service Fee" },
  { id: "payments", label: "Payments & Receipts" },
  { id: "rent-stability", label: "Rent Stability" },
  { id: "non-discrimination", label: "Non-Discrimination" },
  { id: "prohibited-conduct", label: "Prohibited Conduct" },
  { id: "platform-liability", label: "Platform Liability" },
  { id: "ip", label: "Intellectual Property" },
  { id: "governing-law", label: "Governing Law" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

const h2 = "text-lg font-semibold text-slate-900 mt-12 mb-3 scroll-mt-8";
const p = "text-base text-slate-600 leading-8 mt-3";
const ul = "list-disc list-outside pl-5 space-y-2 text-base text-slate-600 leading-7 mt-3";
const hb = "rounded-xl border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-sm text-slate-700 leading-7 my-6";
const dm = { fontFamily: "'DM Sans', sans-serif" };

const Terms = () => {
  return (
    <Layout>
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
            {/* TOC */}
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
                Terms of Service
              </h1>
              <p className="text-sm mt-2" style={{ color: "#64748B" }}>
                Last updated: March 2026
              </p>
              <hr className="border-t mt-8 mb-10" style={{ borderColor: "#E2E8F0" }} />

              {/* 1 */}
              <h2 id="introduction" className={h2} style={dm}>
                Introduction and Platform Role
              </h2>
              <p className={p} style={dm}>
                Serial Makers Private Limited ("Reeve", "Platform", "we") operates a technology-enabled property
                management and rental placement service at reeve.in. These Terms of Service govern your use of the Reeve
                platform, whether you are a prospective tenant, a property owner, or a visitor.
              </p>
              <div className={hb}>
                Reeve acts as an intermediary property manager and placement agent — not as a landlord, tenant, or party
                to any Leave and Licence Agreement. The signed Leave and Licence Agreement and Property Management
                Agreement govern the tenancy relationship. These Terms govern your use of the platform itself.
              </div>
              <p className={p} style={dm}>
                By creating an account or using the platform, you agree to these Terms.
              </p>

              {/* 2 */}
              <h2 id="eligibility" className={h2} style={dm}>
                Eligibility
              </h2>
              <p className={p} style={dm}>
                To use the Reeve platform you must:
              </p>
              <ul className={ul} style={dm}>
                <li>Be at least 18 years of age</li>
                <li>Provide truthful, accurate, and complete information at all stages</li>
                <li>
                  Be a resident of India, or disclose your foreign citizen status where requested (foreign citizen
                  tenants are subject to additional verification requirements including police verification)
                </li>
              </ul>

              {/* 3 */}
              <h2 id="platform-rules" className={h2} style={dm}>
                Platform Rules
              </h2>
              <p className={p} style={dm}>
                The following rules apply to all users of the platform:
              </p>
              <p className={p} style={dm}>
                <strong className="text-slate-800">No direct owner-tenant contact:</strong> Tenants and property owners
                may not contact each other directly at any stage — before, during, or after a tenancy. All communication
                must occur through the Reeve platform. This policy exists to protect both parties and to ensure all
                interactions are documented.
              </p>
              <p className={p} style={dm}>
                <strong className="text-slate-800">One account per user:</strong> Each individual may maintain only one
                active account. Creating duplicate accounts to circumvent eligibility checks or platform decisions is
                prohibited.
              </p>

              {/* 4 */}
              <h2 id="account-deletion" className={h2} style={dm}>
                Account Deletion
              </h2>
              <div className={hb}>
                Account deletion requests must be submitted to{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">
                  support@reeve.in
                </a>
                . Reeve does not offer self-serve account deletion. All requests are processed after identity
                verification.
              </div>
              <p className={p} style={dm}>
                If you have no active lease, pending application, or listed property under inspection or management,
                your account will be deleted within 7 business days.
              </p>
              <p className={p} style={dm}>
                If you are an active tenant under a signed Leave and Licence Agreement, or a property owner whose
                property has completed a Reeve inspection, your account and associated data will be retained for a
                minimum of 12 months from the date of your request — or until all active agreements, obligations, and
                any open disputes are fully concluded, whichever is later. This retention is required for legal, audit,
                and dispute resolution purposes. You will not be able to use the platform during this period, but your
                data cannot be fully erased until the retention period lapses.
              </p>

              {/* 5 */}
              <h2 id="tenant-obligations" className={h2} style={dm}>
                Tenant Obligations
              </h2>
              <p className={p} style={dm}>
                As a tenant on the platform, you agree to:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Provide truthful and accurate information in your eligibility questionnaire and rental application
                </li>
                <li>Submit only genuine, unaltered identity and income documents</li>
                <li>Disclose all co-residents who will live in the property</li>
                <li>Disclose your foreign citizen status if applicable</li>
                <li>Complete KYC verification within the required timeframe after payment</li>
                <li>Comply with all terms of your signed Leave and Licence Agreement</li>
                <li>Not engage in any conduct that would cause harm to the property, its owner, or other residents</li>
              </ul>
              <div className={hb}>
                <p className="font-medium mb-2">Background Disclosure Declaration</p>
                By submitting a rental application, you declare that all information provided is true to the best of
                your knowledge. You understand that any misrepresentation — including false documents, falsified income,
                or undisclosed residents — constitutes grounds for immediate termination of your tenancy without notice
                and forfeiture of your security deposit, without prejudice to any other legal remedies available to the
                property owner or Reeve.
              </div>

              {/* 6 */}
              <h2 id="owner-obligations" className={h2} style={dm}>
                Owner Obligations
              </h2>
              <p className={p} style={dm}>
                As a property owner on the platform, you agree to:
              </p>
              <ul className={ul} style={dm}>
                <li>Provide accurate information about your property at all stages</li>
                <li>Comply with the terms of your signed Property Management Agreement</li>
                <li>Not list your property independently or with another broker during the agreement period</li>
                <li>Not contact tenants directly at any stage</li>
                <li>
                  Not instruct Reeve to implement tenant selection criteria based on religion, caste, sex, place of
                  birth, or any other characteristic protected under Article 15 of the Constitution of India
                </li>
              </ul>

              {/* 7 */}
              <h2 id="service-fee" className={h2} style={dm}>
                Service Fee
              </h2>
              <p className={p} style={dm}>
                Reeve charges tenants a platform service fee on top of monthly rent. This fee is not charged to property
                owners.
              </p>
              <div className={hb}>
                The service fee ranges from 7% to 9% of monthly rent + GST, depending on your eligibility profile as
                assessed during the application process. Your exact rate will be confirmed clearly before you commit to
                anything — it will be stated in your application approval and in your signed Leave and Licence
                Agreement. On renewal, the service fee reduces to 4% for tenants who have maintained the property in
                good condition throughout their tenancy. This renewal rate is guaranteed for qualifying tenants and will
                be stated in the renewal agreement.
              </div>
              <p className={p} style={dm}>
                The service fee is always calculated on the base rent — never on a TDS-adjusted or reduced figure.
              </p>

              {/* 8 */}
              <h2 id="payments" className={h2} style={dm}>
                Payments and Receipts
              </h2>
              <p className={p} style={dm}>
                Rent receipts are a statutory right of the tenant under Section 13 of the Model Tenancy Act, 2021. Reeve
                issues a receipt for every payment made through the platform. Receipts accurately reflect the amounts
                received and may not be altered retroactively.
              </p>
              <p className={p} style={dm}>
                Monthly rent is paid to the property owner. Reeve's service fee is a separate charge paid to Reeve.
                These are always itemised separately — the service fee is never embedded in the base rent figure.
              </p>
              <p className={p} style={dm}>
                Reeve accepts payments via UPI and Net Banking only. Credit card payments are not accepted.
              </p>

              {/* 9 */}
              <h2 id="rent-stability" className={h2} style={dm}>
                Rent Stability
              </h2>
              <div className={hb}>
                Under Section 8 of the Model Tenancy Act, 2021, a property owner cannot unilaterally increase rent
                during an active tenancy term. Rent revision is only permissible at renewal. Any mid-tenancy rent
                revision requires a formal written amendment executed by all parties. Reeve will not implement any rent
                change without a signed amendment. Attempting to collect more than the contracted rent amount during an
                active term is a violation of your rights as a tenant.
              </div>

              {/* 10 */}
              <h2 id="non-discrimination" className={h2} style={dm}>
                Non-Discrimination Policy
              </h2>
              <div className={hb}>
                Discrimination in housing on the basis of religion, caste, sex, place of origin, or any other
                characteristic protected under Article 15 of the Constitution of India is unlawful. Reeve will not
                execute tenant rejection instructions that are based on any such protected characteristic. Documented
                evidence of repeated discriminatory rejection instructions from an owner is grounds for termination of
                the Property Management Agreement without liability to Reeve.
              </div>
              <p className={p} style={dm}>
                Reeve's eligibility screening — including the minimum stay duration requirement — is an economic filter
                based solely on platform cost recovery logic and declared duration of stay. It does not discriminate on
                the basis of religion, gender, caste, national origin, marital status, or any other protected
                characteristic. All application rejections are documented with the specific reason.
              </p>

              {/* 11 */}
              <h2 id="prohibited-conduct" className={h2} style={dm}>
                Prohibited Conduct
              </h2>
              <p className={p} style={dm}>
                The following conduct is strictly prohibited on the Reeve platform:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Submitting forged, altered, or falsified identity documents, income proof, or credentials. This may
                  constitute offences under the Bharatiya Nyaya Sanhita, 2023, including Section 318 (cheating), Section
                  336 (forgery), and Section 340 (using a forged document as genuine). Reeve reserves the right to
                  report such incidents to the appropriate authorities.
                </li>
                <li>
                  Circumventing the no-direct-contact policy by obtaining or sharing contact details through any means
                </li>
                <li>Creating multiple accounts to bypass eligibility checks or platform decisions</li>
                <li>Using the platform for any unlawful purpose</li>
                <li>Misrepresenting your identity, income, employment, or any other material fact</li>
              </ul>

              {/* 12 */}
              <h2 id="platform-liability" className={h2} style={dm}>
                Platform Liability
              </h2>
              <p className={p} style={dm}>
                Reeve conducts thorough KYC verification, income checks, and eligibility screening for all tenants.
                However, the platform cannot guarantee against all unlawful conduct by any party following the execution
                of a tenancy agreement.
              </p>
              <p className={p} style={dm}>
                In the event of any criminal activity involving a tenant or property, Reeve commits to full cooperation
                with law enforcement authorities, including filing a First Information Report (FIR) on behalf of the
                property owner where requested and where grounds exist.
              </p>
              <p className={p} style={dm}>
                Reeve's liability is limited to the service fee amounts paid to Reeve. Reeve is not liable for any loss,
                damage, or legal cost arising from the conduct of tenants, owners, or third parties beyond what is
                stated in the signed agreements.
              </p>

              {/* 13 */}
              <h2 id="ip" className={h2} style={dm}>
                Intellectual Property
              </h2>
              <p className={p} style={dm}>
                All content, design, code, and materials on the Reeve platform are the intellectual property of Serial
                Makers Private Limited You may not reproduce, copy, or distribute any part of the platform without prior
                written consent.
              </p>

              {/* 14 */}
              <h2 id="governing-law" className={h2} style={dm}>
                Governing Law and Disputes
              </h2>
              <p className={p} style={dm}>
                These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the
                platform shall be subject to the exclusive jurisdiction of the courts of Bangalore, Karnataka. Where
                disputes arise from the tenancy relationship, the arbitration clause in your signed Leave and Licence
                Agreement or Property Management Agreement shall govern.
              </p>

              {/* 15 */}
              <h2 id="changes" className={h2} style={dm}>
                Changes to These Terms
              </h2>
              <p className={p} style={dm}>
                We may update these Terms from time to time. We will update the "Last updated" date when we do. For
                material changes, we will notify you via email or platform notification. Continued use of the platform
                after any update constitutes acceptance of the revised Terms.
              </p>

              {/* 16 */}
              <h2 id="contact" className={h2} style={dm}>
                Contact
              </h2>
              <p className={p} style={dm}>
                For questions about these Terms, contact us at{" "}
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

export default Terms;
