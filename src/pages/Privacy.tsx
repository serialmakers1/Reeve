import Layout from "@/components/Layout";

const tocLinks = [
  { id: "introduction", label: "Introduction" },
  { id: "plain-english-summary", label: "Plain-English Summary" },
  { id: "scope", label: "Scope" },
  { id: "who-we-are", label: "Who We Are" },
  { id: "who-this-applies-to", label: "Who This Applies To" },
  { id: "info-we-collect", label: "Information We Collect" },
  { id: "how-we-collect", label: "How We Collect" },
  { id: "how-we-use", label: "How We Use Information" },
  { id: "consent", label: "Consent & Withdrawal" },
  { id: "data-sharing", label: "How We Share Information" },
  { id: "service-providers", label: "Service Providers" },
  { id: "cookies", label: "Cookies & Analytics" },
  { id: "payments", label: "Payments & Transactions" },
  { id: "documents", label: "Documents & Inspections" },
  { id: "data-security", label: "Storage, Security & Retention" },
  { id: "data-breach", label: "Data Breach Notifications" },
  { id: "your-rights", label: "Your Rights" },
  { id: "children", label: "Children & Minors" },
  { id: "cross-border", label: "Cross-Border Processing" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact & Grievance" },
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
                Last updated: 1 May 2026
              </p>
              <hr className="border-t mt-8 mb-10" style={{ borderColor: "#E2E8F0" }} />

              {/* 1 — Introduction */}
              <h2 id="introduction" className={h2} style={dm}>
                1. Introduction
              </h2>
              <p className={p} style={dm}>
                This Privacy Policy explains how Serial Makers Private Limited (CIN: U62099KA2026PTC216343), operating
                under the brand name "Reeve" ("Reeve", "we", "us", or "our"), collects, uses, shares, stores, and
                otherwise processes personal information in connection with the Reeve website, mobile-friendly web
                application, communication channels, and related services (together, the "Platform").
              </p>
              <p className={p} style={dm}>
                Reeve operates a technology-enabled residential rental management platform headquartered in Bengaluru,
                Karnataka, India. We process personal information of property owners, prospective and current tenants,
                visitors, and other users of the Platform.
              </p>
              <p className={p} style={dm}>
                This is a public-facing website policy. It does not replace any executed Rental Agreement, Property
                Management Service Agreement (PMSA), or other signed agreement between Reeve and a user. Where a signed
                agreement applies and conflicts with this Policy in respect of a specific property or service
                relationship, the signed agreement controls for that relationship.
              </p>
              <p className={p} style={dm}>
                By using the Platform, you acknowledge that you have read this Privacy Policy and consent to the
                processing of your personal information as described, to the extent permitted by applicable law.
              </p>

              {/* 2 — Plain-English Summary */}
              <h2 id="plain-english-summary" className={h2} style={dm}>
                2. Plain-English Summary
              </h2>
              <div className={highlight}>
                <p className="mb-3 font-medium">In simple terms:</p>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li>We are Reeve, a Bengaluru-based rental management platform run by Serial Makers Private Limited.</li>
                  <li>
                    We collect information you give us (such as your name, contact details, identity documents, property
                    details, application information, and payment-related details), information generated when you use the
                    Platform (such as visits, applications, inspection reports, maintenance requests, and communications),
                    and certain technical information from your device.
                  </li>
                  <li>
                    We use this information to verify users, list and manage properties, screen tenant applications,
                    schedule visits, prepare and execute agreements, route payments, coordinate maintenance, conduct
                    inspections, manage exits and settlements, and operate, secure, and improve the Platform.
                  </li>
                  <li>
                    We rely on a small set of carefully selected service providers (for example, hosting, communication,
                    payments, eSign and eStamp, analytics, and error monitoring).
                  </li>
                  <li>
                    We apply reasonable technical and organisational safeguards. We do not promise that any system can be
                    made fully secure.
                  </li>
                  <li>
                    You have rights over your personal information under applicable law, including the right to access,
                    correct, update, withdraw consent (where processing is based on consent), and request erasure where
                    applicable. Some information may need to be retained for legal, tax, dispute, fraud-prevention, or
                    rental-lifecycle reasons.
                  </li>
                  <li>
                    You can contact us at{" "}
                    <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a> or
                    our Grievance Officer at{" "}
                    <a href="mailto:daksh@reeve.in" className="text-blue-600 hover:underline">daksh@reeve.in</a> for any
                    privacy-related questions or concerns.
                  </li>
                </ul>
              </div>

              {/* 3 — Scope */}
              <h2 id="scope" className={h2} style={dm}>
                3. Scope of this Privacy Policy
              </h2>
              <p className={p} style={dm}>
                This Privacy Policy applies to:
              </p>
              <ul className={ul} style={dm}>
                <li>The Reeve website and any subdomains operated by Reeve.</li>
                <li>The mobile-responsive web application accessed through that website.</li>
                <li>
                  Communications between Reeve and users over email, WhatsApp, SMS, and similar channels operated through
                  Reeve's service providers.
                </li>
                <li>
                  The processing of personal information by Reeve in the course of providing services described in our
                  agreements and in our public-facing materials.
                </li>
              </ul>
              <p className={p} style={dm}>
                This Policy does not apply to:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Third-party websites, applications, or services that may be linked from the Platform but are not
                  operated by Reeve. Those services have their own privacy policies.
                </li>
                <li>
                  Any processing carried out by an Owner, a Tenant, a society, a vendor, a government authority, or any
                  other third party in their independent capacity.
                </li>
                <li>
                  Any processing carried out under an executed Rental Agreement, PMSA, or other signed agreement that
                  sets out specific data terms; the signed agreement controls for that specific relationship.
                </li>
              </ul>

              {/* 4 — Who We Are */}
              <h2 id="who-we-are" className={h2} style={dm}>
                4. Who We Are
              </h2>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg" style={dm}>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800 bg-slate-50 w-44">Legal entity</td>
                      <td className="px-4 py-3">Serial Makers Private Limited</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800 bg-slate-50">Brand name</td>
                      <td className="px-4 py-3">Reeve</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800 bg-slate-50">CIN</td>
                      <td className="px-4 py-3">U62099KA2026PTC216343</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-800 bg-slate-50">Registered address</td>
                      <td className="px-4 py-3">Shubh Encl, HSR Layout, Bangalore South, Bangalore - 560102, Karnataka, India</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-800 bg-slate-50">Support email</td>
                      <td className="px-4 py-3">
                        <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={p} style={dm}>
                For the purposes of India's Digital Personal Data Protection Act, 2023 (the "DPDP Act") and the Digital
                Personal Data Protection Rules, 2025, Reeve generally acts as a Data Fiduciary in respect of personal
                data it processes through the Platform.
              </p>

              {/* 5 — Who This Applies To */}
              <h2 id="who-this-applies-to" className={h2} style={dm}>
                5. Who This Policy Applies To
              </h2>
              <p className={p} style={dm}>
                This Privacy Policy applies to:
              </p>
              <ul className={ul} style={dm}>
                <li>Visitors who browse the Platform without creating an account.</li>
                <li>
                  Users who create an account on the Platform (whether they later act as Owners, Tenants, prospective
                  Tenants, or both).
                </li>
                <li>
                  Property Owners (and their authorised representatives where applicable) who list, onboard, or manage a
                  property through the Platform.
                </li>
                <li>
                  Prospective Tenants who view properties, schedule visits, submit applications, or transact through the
                  Platform.
                </li>
                <li>Tenants who occupy properties under tripartite arrangements managed through the Platform.</li>
                <li>
                  Persons who contact Reeve through callbacks, email, WhatsApp, SMS, or our support channels.
                </li>
                <li>
                  Persons whose details are submitted to Reeve by another user (for example, co-occupants, emergency
                  contacts, or representatives) where such submission is permitted under applicable law.
                </li>
              </ul>
              <p className={p} style={dm}>
                If you submit personal information about another person (such as a co-occupant, family member, or
                emergency contact), you confirm that you are authorised to do so and that the other person is aware of,
                and consents to, the processing described in this Policy.
              </p>

              {/* 6 — Information We Collect */}
              <h2 id="info-we-collect" className={h2} style={dm}>
                6. Information We Collect
              </h2>
              <p className={p} style={dm}>
                We collect different categories of personal information depending on how you use the Platform.
              </p>

              <h3 className={h3} style={dm}>6.1 Account and Identity Information</h3>
              <ul className={ul} style={dm}>
                <li>Full name.</li>
                <li>Mobile phone number (used for OTP-based authentication).</li>
                <li>Email address (used for account verification and communication).</li>
                <li>
                  Government-issued identity references (for example, Aadhaar reference and PAN) collected for KYC and
                  statutory purposes, where required for service delivery.
                </li>
                <li>Date of birth or age, where required for eligibility checks.</li>
                <li>Profile preferences and notification settings.</li>
              </ul>

              <h3 className={h3} style={dm}>6.2 Owner Information</h3>
              <ul className={ul} style={dm}>
                <li>
                  Ownership documents (for example, sale deed, conveyance, latest property tax receipt, utility bill,
                  encumbrance certificate, and lender No Objection Certificate where applicable).
                </li>
                <li>Identity and KYC documents.</li>
                <li>Bank account details used for routing of rent payouts.</li>
                <li>Property details, condition information, appliance and inventory details.</li>
                <li>Owner preferences for tenant selection, house rules, and property-specific terms.</li>
                <li>Communication and instruction history with Reeve.</li>
              </ul>

              <h3 className={h3} style={dm}>6.3 Tenant and Applicant Information</h3>
              <ul className={ul} style={dm}>
                <li>Identity and contact information.</li>
                <li>
                  Employment, occupation, and income-related documents (for example, salary slips, bank statements, ITR,
                  GST registration, or business registration where applicable).
                </li>
                <li>
                  Self-declared credit information (such as a CIBIL band) and consent-based credit checks where
                  applicable.
                </li>
                <li>Resident details and co-occupant information disclosed in the application.</li>
                <li>Application and offer history.</li>
                <li>Crime record self-attestation and background disclosures.</li>
                <li>
                  Documents required for tenant verification, including police verification filings where mandated by
                  the applicable state.
                </li>
              </ul>

              <h3 className={h3} style={dm}>6.4 Property and Tenancy Information</h3>
              <ul className={ul} style={dm}>
                <li>
                  Property address, configuration, photographs, video walkthroughs, floor plans, and amenity information.
                </li>
                <li>
                  Property Baseline Report (PBR), Move-In Report (MIR), Bi-Annual Inspection Report (BIR), Move-Out
                  Condition Report (MOCR), and Damage Assessment Report (RA-001) data.
                </li>
                <li>Maintenance requests, vendor visit logs, and resolution history.</li>
                <li>Visit scheduling, attendance, and no-show records.</li>
              </ul>

              <h3 className={h3} style={dm}>6.5 Payment and Financial Information</h3>
              <ul className={ul} style={dm}>
                <li>
                  Records of payments made to Reeve (such as Confirmation Token, first-month Total Monthly Payment,
                  monthly rent collected on behalf of an Owner, and applicable delay charges).
                </li>
                <li>Payment references (such as UTR, UPI reference) shared with us.</li>
                <li>Payout records to Owners (with bank reference).</li>
                <li>
                  Tax-related references including PAN of Owners and Tenants, and TDS-related documentation submitted
                  by Tenants.
                </li>
              </ul>
              <p className={p} style={dm}>
                We do not store full card numbers, CVV, UPI PIN, or net banking credentials. Where payments are processed
                by third-party payment providers, those providers handle and protect that information under their own
                terms.
              </p>

              <h3 className={h3} style={dm}>6.6 Communications and Support Records</h3>
              <ul className={ul} style={dm}>
                <li>Email exchanges with Reeve.</li>
                <li>WhatsApp and SMS exchanges initiated through Reeve's messaging providers.</li>
                <li>Callback requests submitted on the Platform.</li>
                <li>Support tickets, complaints, grievance submissions, and related correspondence.</li>
              </ul>

              <h3 className={h3} style={dm}>6.7 Device, Usage, and Technical Information</h3>
              <ul className={ul} style={dm}>
                <li>Device, browser, and operating system details.</li>
                <li>IP address and approximate location derived from network information.</li>
                <li>Pages visited, features used, search and filter activity, and other usage analytics.</li>
                <li>Error logs, crash reports, and performance information.</li>
                <li>Cookie identifiers and similar technical identifiers (see Section 12).</li>
              </ul>

              {/* 7 — How We Collect */}
              <h2 id="how-we-collect" className={h2} style={dm}>
                7. How We Collect Information
              </h2>
              <p className={p} style={dm}>
                We collect information through:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Direct submission by you when you create an account, sign in, fill out a form, schedule a visit,
                  submit an application, upload a document, make a payment, sign a digital document, or contact our
                  support channels.
                </li>
                <li>
                  Verification flows on the Platform (for example, mobile OTP via SMS, Google sign-in for email
                  verification, and document upload for KYC).
                </li>
                <li>
                  Automated collection through cookies, analytics tools, and similar technologies as described in
                  Section 12.
                </li>
                <li>
                  Service providers acting on our instructions (for example, payment, communication, eStamp, eSign,
                  and analytics providers).
                </li>
                <li>
                  Lawfully obtained sources where applicable (for example, government portals used for ownership or
                  PAN-related verification).
                </li>
                <li>
                  Other users who include your information in their submissions, where they are authorised to do so.
                </li>
              </ul>

              {/* 8 — How We Use */}
              <h2 id="how-we-use" className={h2} style={dm}>
                8. How We Use Information
              </h2>
              <p className={p} style={dm}>
                We use personal information for the following purposes, to the extent permitted by applicable law:
              </p>
              <ul className={ul} style={dm}>
                <li>Verifying user identity, eligibility, and account ownership.</li>
                <li>Onboarding properties and Owners, and preparing the Property Baseline Report (PBR).</li>
                <li>Listing properties on the Platform and presenting them to prospective Tenants.</li>
                <li>
                  Screening Tenant applications (including identity verification, income adequacy assessment,
                  self-declared credit information review, background self-declaration review, and police verification
                  filing where mandated).
                </li>
                <li>Scheduling and conducting property visits and inspections.</li>
                <li>
                  Drafting, executing, eStamping, eSigning, and storing the tripartite Rental Agreement and related
                  documents.
                </li>
                <li>
                  Routing and reconciling rent and platform-collected payments, and coordinating Owner payouts.
                </li>
                <li>
                  Coordinating maintenance, including emergency, pre-authorised, and Owner-approved repairs.
                </li>
                <li>
                  Conducting move-in, mid-tenancy, and exit inspections, and producing the related condition records.
                </li>
                <li>
                  Facilitating settlement and disbursement of the Security Deposit through the Damage Assessment Report
                  (RA-001) process described in the applicable signed agreement.
                </li>
                <li>Preparing rent receipts, payout statements, and annual summaries.</li>
                <li>
                  Operating, securing, monitoring, and improving the Platform (including error tracking, analytics,
                  fraud detection, and security operations).
                </li>
                <li>Communicating with users about transactional, service, account, and policy matters.</li>
                <li>Sending operational notifications, reminders, and status updates.</li>
                <li>Responding to user queries, complaints, and grievances.</li>
                <li>
                  Complying with applicable laws (including taxation, anti-money-laundering, consumer protection, and
                  data protection laws), responding to lawful requests from authorities, and enforcing our terms and
                  agreements.
                </li>
              </ul>

              {/* 9 — Consent */}
              <h2 id="consent" className={h2} style={dm}>
                9. Consent, Withdrawal, and Required Processing
              </h2>
              <p className={p} style={dm}>
                Where we rely on your consent to process personal information, we obtain that consent through clear,
                affirmative actions on the Platform (for example, ticking a consent box during signup, KYC upload, or
                application submission). You may withdraw consent at any time by contacting us through the channels in
                Section 21.
              </p>
              <p className={p} style={dm}>
                Withdrawing consent will not affect the lawfulness of processing carried out before the withdrawal.
                Where processing is necessary for compliance with a legal obligation, performance of a contract you are
                party to, fraud prevention, dispute resolution, or any other lawful basis recognised under applicable
                law, we may continue to process your information on that basis even if consent is withdrawn.
              </p>
              <p className={p} style={dm}>
                If you withdraw consent for processing that is necessary to deliver the service, we may not be able to
                continue providing all or part of the Platform to you.
              </p>

              {/* 10 — Data Sharing */}
              <h2 id="data-sharing" className={h2} style={dm}>
                10. How We Share Information
              </h2>
              <p className={p} style={dm}>
                We share personal information only as reasonably necessary to operate the Platform and to deliver the
                services described in this Policy and the applicable agreements. Categories of recipients include:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  <strong>Other parties to the same transaction.</strong> For example, an Owner whose property an
                  applicant has applied to may receive a verified, anonymised or summarised tenant profile through the
                  Platform's owner portal in line with the applicable agreement and SOPs. Direct contact details are not
                  shared between parties before agreement execution unless both parties consent or in emergency
                  situations.
                </li>
                <li>
                  <strong>Service providers</strong> that support the Platform (see Section 11).
                </li>
                <li>
                  <strong>Vendors and inspection partners</strong> for maintenance, repair, deep cleaning, painting,
                  pest control, photography, and similar services we coordinate.
                </li>
                <li>
                  <strong>eStamp and eSign providers</strong> for execution of agreements (currently SHCIL Karnataka
                  for stamping and Leegality for Aadhaar-based digital signatures).
                </li>
                <li>
                  <strong>Payment service providers and banks</strong> to enable rent collection, Owner payouts,
                  refunds, and reconciliation.
                </li>
                <li>
                  <strong>Government and regulatory authorities</strong> where required by law (for example, police
                  verification, tax authorities, courts, tribunals, and arbitral forums).
                </li>
                <li>
                  <strong>Professional advisers</strong> (such as legal, tax, accounting, audit, and compliance
                  advisers) under appropriate confidentiality obligations.
                </li>
                <li>
                  <strong>Successors</strong> in the event of a merger, acquisition, restructuring, or sale of assets,
                  subject to applicable law.
                </li>
              </ul>
              <div className={highlight}>
                We do not sell personal information.
              </div>

              {/* 11 — Service Providers */}
              <h2 id="service-providers" className={h2} style={dm}>
                11. Third-Party Service Providers
              </h2>
              <p className={p} style={dm}>
                We rely on a carefully selected set of third-party service providers, including categories such as:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Hosting, database, authentication, and storage providers (for example, providers offering managed
                  Postgres, authentication, and object storage services).
                </li>
                <li>Image storage and content delivery providers used for property photographs.</li>
                <li>
                  Communication providers (for example, email, WhatsApp, and SMS providers used for OTP, transactional
                  notifications, and reminders).
                </li>
                <li>eStamp and eSign service providers used for executing agreements.</li>
                <li>
                  Payment service providers, payment aggregators, and banks used for collecting and routing payments.
                </li>
                <li>KYC and identity-verification providers used for document and identity validation.</li>
                <li>Error monitoring providers used to detect and diagnose technical issues.</li>
                <li>
                  Analytics providers used to understand Platform usage in aggregate and improve the user experience.
                </li>
                <li>
                  AI assistant tooling (such as Claude AI by Anthropic) used by Reeve in a limited operational capacity
                  for internal tasks like document drafting, content review, and process automation. Such tooling is
                  configured to operate on a least-privilege basis with limited and restricted access to personal
                  information; access is granted only as reasonably required for a specific operational task and is not
                  used for advertising, profiling, or sale of personal information.
                </li>
              </ul>
              <p className={p} style={dm}>
                These providers are bound by their own terms and security obligations. Where required by applicable law,
                we put in place data processing terms with such providers limiting use of personal information to the
                purposes for which it was disclosed.
              </p>

              {/* 12 — Cookies */}
              <h2 id="cookies" className={h2} style={dm}>
                12. Cookies, Analytics, and Tracking
              </h2>
              <p className={p} style={dm}>
                We and our service providers use cookies and similar technologies (such as local storage, pixels, and
                SDKs) on the Platform for purposes including:
              </p>
              <ul className={ul} style={dm}>
                <li>Maintaining authentication sessions and remembering preferences.</li>
                <li>Measuring usage of pages and features on an aggregated basis.</li>
                <li>Detecting and diagnosing errors.</li>
                <li>Operating security features and preventing abuse.</li>
              </ul>
              <p className={p} style={dm}>
                You can manage cookies through your browser settings. Disabling certain cookies may affect the
                functioning of the Platform.
              </p>
              <p className={p} style={dm}>
                We use product analytics tools to understand how the Platform is used. These tools may capture
                interaction data such as page views, button clicks, search behaviour, and similar usage patterns. Where
                applicable, we configure such tools to limit the collection of identifying information.
              </p>

              {/* 13 — Payments */}
              <h2 id="payments" className={h2} style={dm}>
                13. Payments and Transaction Data
              </h2>
              <p className={p} style={dm}>
                Reeve operates as a payment collection and routing intermediary in respect of certain payments described
                in the applicable signed agreement (for example, the Total Monthly Payment, Confirmation Token, and
                applicable delay charges).
              </p>
              <p className={p} style={dm}>
                The Security Deposit is paid by the Tenant directly to the Owner before possession, as described in the
                applicable agreement. Reeve receives the Security Deposit only on service of notice in accordance with
                the agreement and holds it for limited custodial purposes during the Settlement Window for disbursement
                in accordance with the Damage Assessment Report.
              </p>
              <p className={p} style={dm}>
                Card data, UPI PINs, and net banking credentials are handled by the relevant payment service providers
                and are not stored by Reeve. We retain payment references, amounts, dates, and related transactional
                information as required for service delivery, reconciliation, dispute resolution, statutory compliance,
                and the rental lifecycle.
              </p>
              <p className={p} style={dm}>
                Tax-related processing (including TDS) is the responsibility of the parties identified in the applicable
                agreement; Reeve is not a withholding agent and does not perform TDS reconciliation.
              </p>

              {/* 14 — Documents */}
              <h2 id="documents" className={h2} style={dm}>
                14. Uploaded Documents, Property Images, and Inspection Records
              </h2>
              <p className={p} style={dm}>
                The Platform allows authorised users to upload documents (for example, identity proofs, ownership
                documents, income proofs, and business documents) and to capture or upload property images, video
                walkthroughs, inspection records, and similar files.
              </p>
              <p className={p} style={dm}>
                We apply role-based access controls and reasonable safeguards to limit access to such files to
                authorised personnel and authorised systems. Property photographs and inspection visuals may be used to
                operate the Platform, present listings, document baseline and exit conditions, and resolve disputes.
              </p>
              <p className={p} style={dm}>
                Documents and inspection records may be retained for the duration of the relevant relationship and for a
                reasonable period thereafter to support legal, tax, audit, dispute, fraud-prevention, and rental-lifecycle
                requirements, in line with the applicable agreement.
              </p>
              <p className={p} style={dm}>
                We do not store biometric Aadhaar data. Where Aadhaar reference is collected, we follow applicable rules
                for handling such information.
              </p>

              {/* 15 — Data Security */}
              <h2 id="data-security" className={h2} style={dm}>
                15. Data Storage, Security, and Retention
              </h2>
              <p className={p} style={dm}>
                We store personal information on systems operated by us and our service providers, primarily in India
                where feasible. Cross-border processing is described in Section 19.
              </p>
              <p className={p} style={dm}>
                We apply reasonable technical and organisational safeguards designed to protect personal information
                against unauthorised access, alteration, disclosure, loss, or destruction. These include access controls,
                encryption in transit, role-based authorisations, secure development practices, monitoring, and incident
                response procedures. No system can be made fully secure, and we cannot promise absolute security.
              </p>
              <p className={p} style={dm}>
                We retain personal information for as long as is reasonably necessary for the purposes described in this
                Policy and the applicable agreement, and as required to:
              </p>
              <ul className={ul} style={dm}>
                <li>Provide the services and operate the Platform.</li>
                <li>
                  Comply with applicable legal, tax, accounting, audit, anti-fraud, and regulatory obligations.
                </li>
                <li>Enforce our terms and agreements and resolve disputes.</li>
                <li>
                  Maintain records relating to the rental lifecycle (including documents, payments, inspections,
                  settlements, and grievances) for the period set out in the applicable agreement.
                </li>
              </ul>
              <p className={p} style={dm}>
                When personal information is no longer required, we will take reasonable steps to delete, anonymise, or
                securely archive it in accordance with applicable law.
              </p>

              {/* 16 — Data Breach */}
              <h2 id="data-breach" className={h2} style={dm}>
                16. Data Breach Notifications
              </h2>
              <p className={p} style={dm}>
                If we become aware of a personal data breach affecting your personal information, we will assess the
                breach and notify the appropriate authority and affected users where required under applicable law,
                within the timelines and through the procedures specified by such law.
              </p>
              <p className={p} style={dm}>
                You should also notify us promptly through the contact details in Section 21 if you suspect any
                unauthorised access to your account, suspicious activity on the Platform, or compromise of your
                credentials.
              </p>

              {/* 17 — Your Rights */}
              <h2 id="your-rights" className={h2} style={dm}>
                17. User Rights and Choices
              </h2>
              <p className={p} style={dm}>
                Subject to applicable law, you have the following rights in relation to your personal information:
              </p>
              <div className={highlight}>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li><strong>Right to access</strong> the personal information we hold about you in a manner consistent with applicable law.</li>
                  <li><strong>Right to correction and updating</strong> of inaccurate or out-of-date information.</li>
                  <li><strong>Right to erasure</strong> of personal information where applicable, subject to our retention obligations.</li>
                  <li><strong>Right to withdraw consent</strong> for processing based on consent, as described in Section 9.</li>
                  <li><strong>Right to nominate</strong> another individual to exercise certain rights on your behalf in case of incapacity or death, where provided under applicable law.</li>
                  <li><strong>Right to grievance redressal</strong> through our Grievance Officer (Section 21).</li>
                </ul>
              </div>
              <p className={p} style={dm}>
                You can exercise these rights by contacting us at{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a> or by
                writing to our Grievance Officer at{" "}
                <a href="mailto:daksh@reeve.in" className="text-blue-600 hover:underline">daksh@reeve.in</a>. We may
                need to verify your identity before responding to your request and may require additional information for
                that purpose.
              </p>
              <p className={p} style={dm}>
                We will respond to your request within the timelines required by applicable law. Where a request cannot
                be fulfilled in whole or in part (for example, because of a legal obligation to retain information), we
                will explain the reason.
              </p>

              {/* 18 — Children */}
              <h2 id="children" className={h2} style={dm}>
                18. Children and Minors
              </h2>
              <p className={p} style={dm}>
                The Platform is not intended for use by individuals who are minors under the laws of their place of
                residence. Account creation and transactional activities are intended for adults and, where applicable,
                primary applicants who meet the age and eligibility requirements set out in our Terms of Service and the
                applicable agreement.
              </p>
              <p className={p} style={dm}>
                If you are a parent or lawful guardian and believe that a minor has provided personal information to
                Reeve without your authority, please contact us at{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a> so we
                can take appropriate action.
              </p>

              {/* 19 — Cross-Border */}
              <h2 id="cross-border" className={h2} style={dm}>
                19. Cross-Border Processing
              </h2>
              <p className={p} style={dm}>
                Some of our service providers may process personal information from data centres or support locations
                outside India. Where this occurs, we take reasonable steps to ensure that the processing is consistent
                with applicable Indian law and with the obligations described in this Policy.
              </p>
              <p className={p} style={dm}>
                We may transfer personal information across borders only to the extent permitted by applicable law and
                to jurisdictions that are not restricted by the Government of India for such transfers.
              </p>

              {/* 20 — Changes */}
              <h2 id="changes" className={h2} style={dm}>
                20. Changes to this Privacy Policy
              </h2>
              <p className={p} style={dm}>
                We may update this Privacy Policy from time to time to reflect changes in our practices, our services,
                or the law. The "Last updated" date at the top of this Policy will reflect the most recent update.
              </p>
              <p className={p} style={dm}>
                Where the changes are material, we will take reasonable steps to inform you, for example through a notice
                on the Platform or by email. Your continued use of the Platform after the effective date of the updated
                Policy indicates your acceptance of the changes, to the extent permitted by applicable law.
              </p>
              <p className={p} style={dm}>
                Versioning of this Policy is maintained internally so we can keep a record of which version was in effect
                at the time you accepted it.
              </p>

              {/* 21 — Contact & Grievance */}
              <h2 id="contact" className={h2} style={dm}>
                21. Contact and Grievance Details
              </h2>
              <p className={p} style={dm}>
                For any questions, requests, complaints, or grievances relating to this Privacy Policy or our processing
                of personal information, you can contact us at:
              </p>
              <div className={highlight}>
                <p className="font-medium mb-2">Support</p>
                <p>
                  Email:{" "}
                  <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a>
                </p>
                <hr className="my-3 border-blue-200" />
                <p className="font-medium mb-2">Grievance Officer</p>
                <p>Name: Daksh Jain</p>
                <p>
                  Email:{" "}
                  <a href="mailto:daksh@reeve.in" className="text-blue-600 hover:underline">daksh@reeve.in</a>
                </p>
                <hr className="my-3 border-blue-200" />
                <p className="font-medium mb-2">Postal address</p>
                <p>Serial Makers Private Limited</p>
                <p>Shubh Encl, HSR Layout, Bangalore South,</p>
                <p>Bangalore - 560102, Karnataka, India</p>
              </div>
              <p className={p} style={dm}>
                Where required under applicable law, you may also approach the relevant data protection authority after
                pursuing the grievance redressal procedure described above.
              </p>

              {/* Disclaimer footer */}
              <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500 leading-7 italic" style={dm}>
                This Privacy Policy is a public website policy and does not replace any executed Rental Agreement,
                Property Management Service Agreement, or other signed agreement. Where a signed agreement applies and
                conflicts with this Policy, the signed agreement controls for that specific property or service
                relationship.
              </div>

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
