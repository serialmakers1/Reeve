import Layout from "@/components/Layout";

const tocLinks = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "plain-english-summary", label: "Plain-English Summary" },
  { id: "about-reeve", label: "About Reeve" },
  { id: "signed-agreements", label: "Signed Agreements" },
  { id: "eligibility", label: "Eligibility" },
  { id: "accounts", label: "Accounts & Responsibilities" },
  { id: "owner-responsibilities", label: "Owner Responsibilities" },
  { id: "tenant-responsibilities", label: "Tenant Responsibilities" },
  { id: "reeve-role", label: "Reeve's Role & Limitations" },
  { id: "listings", label: "Listings, Visits & Inspections" },
  { id: "agreements-lifecycle", label: "Agreements & Lifecycle" },
  { id: "payments", label: "Payments & Fees" },
  { id: "refunds", label: "Refunds & Cancellations" },
  { id: "user-content", label: "User Content & Documents" },
  { id: "prohibited-conduct", label: "Prohibited Conduct" },
  { id: "third-party", label: "Third-Party Services" },
  { id: "privacy", label: "Privacy" },
  { id: "availability", label: "Service Availability" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "indemnity", label: "Indemnity" },
  { id: "suspension", label: "Suspension & Termination" },
  { id: "disputes", label: "Dispute Resolution" },
  { id: "governing-law", label: "Governing Law" },
  { id: "changes", label: "Changes to Terms" },
  { id: "contact", label: "Contact & Grievance" },
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
                Last updated: 1 May 2026
              </p>
              <hr className="border-t mt-8 mb-10" style={{ borderColor: "#E2E8F0" }} />

              {/* 1 — Acceptance */}
              <h2 id="acceptance" className={h2} style={dm}>
                1. Acceptance of Terms
              </h2>
              <p className={p} style={dm}>
                These Terms of Service (the "Terms") govern your access to and use of the Reeve website, mobile-friendly
                web application, and related services (together, the "Platform"). The Platform is operated by Serial
                Makers Private Limited (CIN: U62099KA2026PTC216343), a company incorporated in India with its registered
                address at Shubh Encl, HSR Layout, Bangalore South, Bangalore - 560102, Karnataka, operating under the
                brand name "Reeve" ("Reeve", "we", "us", or "our").
              </p>
              <p className={p} style={dm}>
                By accessing or using the Platform — including by browsing the website, creating an account, listing a
                property, scheduling a property visit, submitting a tenant application, uploading documents, making a
                payment, executing a digital agreement, or continuing to use Reeve after these Terms are presented — you
                indicate your acceptance of these Terms, subject to applicable law. Where electronic acceptance is
                required, your acceptance is recorded in a manner consistent with the Information Technology Act, 2000
                and applicable rules made thereunder.
              </p>
              <p className={p} style={dm}>
                If you do not agree to these Terms, please do not use the Platform.
              </p>

              {/* 2 — Plain-English Summary */}
              <h2 id="plain-english-summary" className={h2} style={dm}>
                2. Plain-English Summary
              </h2>
              <div className={hb}>
                <p className="mb-3 font-medium">In simple terms:</p>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li>
                    Reeve operates a structured rental management platform for residential properties in Bengaluru,
                    Karnataka, India.
                  </li>
                  <li>
                    We help Owners and Tenants connect, document, transact, and manage tenancies. We are not the
                    landlord, the tenant, the bank, an insurer, a legal adviser, a tax adviser, or a guarantor.
                  </li>
                  <li>
                    If you sign a Rental Agreement, Property Management Service Agreement (PMSA), or other agreement
                    with Reeve and another party, that signed agreement controls the specific property/service
                    relationship in case of conflict with this website policy.
                  </li>
                  <li>
                    You are responsible for your account, your information, your conduct, and your obligations under any
                    agreements you sign.
                  </li>
                  <li>
                    We rely on a small set of service providers to operate the Platform, including hosting, payments,
                    communication, eStamp/eSign, analytics, and error-monitoring providers.
                  </li>
                  <li>
                    We try to keep the Platform reliable, but we do not promise uninterrupted, error-free, or fully
                    secure service.
                  </li>
                  <li>
                    Disputes are governed by the laws of India and, subject to any arbitration or other
                    dispute-resolution process in the applicable signed agreement, by the courts at Bengaluru, Karnataka.
                  </li>
                  <li>
                    You can contact us at{" "}
                    <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a>{" "}
                    or our Grievance Officer at{" "}
                    <a href="mailto:daksh@reeve.in" className="text-blue-600 hover:underline">daksh@reeve.in</a>.
                  </li>
                </ul>
              </div>

              {/* 3 — About Reeve */}
              <h2 id="about-reeve" className={h2} style={dm}>
                3. About Reeve
              </h2>
              <p className={p} style={dm}>
                Reeve is a technology-enabled residential rental management platform headquartered in Bengaluru,
                Karnataka. Through the Platform, Reeve provides services that may include, depending on the user's role
                and the applicable agreement:
              </p>
              <ul className={ul} style={dm}>
                <li>Onboarding and verification of properties and Owners.</li>
                <li>Listing properties and presenting them to prospective Tenants.</li>
                <li>
                  Verifying Tenant applications, including identity, income adequacy, and self-declared background
                  information.
                </li>
                <li>Scheduling and conducting property visits and inspections.</li>
                <li>Drafting, eStamping, and facilitating execution of the tripartite Rental Agreement.</li>
                <li>Coordinating monthly rent collection and routing of Owner payouts.</li>
                <li>Coordinating maintenance through a defined three-tier framework.</li>
                <li>
                  Conducting move-in, mid-tenancy, and exit inspections, and producing the related condition records.
                </li>
                <li>
                  Issuing the Damage Assessment Report (RA-001) at exit and disbursing the Security Deposit during the
                  Settlement Window in accordance with the applicable agreement.
                </li>
                <li>
                  Maintaining a document vault for agreements, receipts, inspection reports, and related records.
                </li>
              </ul>
              <p className={p} style={dm}>
                The exact scope of services for any particular property or relationship is governed by the applicable
                signed agreement.
              </p>

              {/* 4 — Signed Agreements */}
              <h2 id="signed-agreements" className={h2} style={dm}>
                4. Relationship to Signed Agreements
              </h2>
              <div className={hb}>
                These Terms apply to your general use of the Platform. They do not replace, override, or vary any
                executed Rental Agreement, PMSA, or other signed agreement between Reeve and a user or between an Owner
                and a Tenant. In case of conflict between these Terms and an executed signed agreement in respect of a
                specific property or service relationship, the signed agreement controls for that relationship.
              </div>
              <p className={p} style={dm}>
                References in these Terms to specific commercial parameters (for example, fee rates, deposit amounts,
                lock-in periods, notice periods, delay charges, Confirmation Token mechanics, Material Breach, Early
                Exit Liability, Settlement Window, MIR/BIR/MOCR/RA-001, dispute resolution, and arbitration) reflect
                the framework set out in the current signed agreement templates and are subject to the actual terms of
                the agreement signed in your specific case.
              </p>

              {/* 5 — Eligibility */}
              <h2 id="eligibility" className={h2} style={dm}>
                5. Eligibility
              </h2>
              <p className={p} style={dm}>
                To use the Platform you must:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Be an individual at least 18 years of age, or a legal entity with the capacity to enter into binding
                  contracts under Indian law.
                </li>
                <li>Be capable of entering into legally binding contracts under applicable law.</li>
                <li>
                  Provide accurate, complete, and current information in connection with your use of the Platform.
                </li>
                <li>
                  Comply with all applicable laws, including those relating to property, tenancy, taxation, payments,
                  anti-money-laundering, consumer protection, and data protection.
                </li>
              </ul>
              <p className={p} style={dm}>
                Certain categories of users may not be eligible for tenant placements through the Platform under our
                published verification standards (for example, applicants below the minimum age threshold, those without
                verifiable income proof, those with very short intended stays, foreign nationals, or students). The
                applicability of such criteria is determined under the applicable agreement and Reeve's verification
                standards.
              </p>
              <p className={p} style={dm}>
                Reeve may, at its discretion and as permitted by applicable law, decline to provide services, restrict
                access to the Platform, or terminate accounts where eligibility criteria are not met.
              </p>

              {/* 6 — Accounts */}
              <h2 id="accounts" className={h2} style={dm}>
                6. Accounts and User Responsibilities
              </h2>
              <p className={p} style={dm}>
                To access certain features, you must create an account on the Platform. You are responsible for:
              </p>
              <ul className={ul} style={dm}>
                <li>Providing accurate, complete, and current information at signup and throughout your use.</li>
                <li>
                  Verifying your account through the verification flows we offer (currently mobile OTP for Indian phone
                  numbers and Google sign-in for email verification).
                </li>
                <li>Maintaining the confidentiality of your authentication credentials and access devices.</li>
                <li>
                  All activities that occur under your account, except to the extent caused by Reeve's gross negligence
                  or wilful misconduct.
                </li>
                <li>
                  Promptly notifying us at{" "}
                  <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a> if
                  you suspect any unauthorised access to your account, suspicious activity, or compromise of your
                  credentials.
                </li>
              </ul>
              <p className={p} style={dm}>
                You may not share your account, transfer it to another person, or use another person's account without
                their authorisation.
              </p>
              <p className={p} style={dm}>
                You are responsible for your use of any communication channel offered through the Platform (including
                platform messaging, WhatsApp, SMS, and email) and for keeping your contact details current.
              </p>

              {/* 7 — Owner Responsibilities */}
              <h2 id="owner-responsibilities" className={h2} style={dm}>
                7. Owner Responsibilities
              </h2>
              <p className={p} style={dm}>
                If you list a property on the Platform or otherwise act as an Owner, you are responsible for:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Confirming that you are the lawful Owner of the property or are duly authorised to list and manage it.
                </li>
                <li>
                  Providing accurate ownership documents, identity documents, and other information requested at
                  onboarding.
                </li>
                <li>
                  Disclosing any encumbrances, charges, mortgages, or pending legal proceedings affecting the property
                  as required.
                </li>
                <li>
                  Disclosing any society-imposed move-in / move-out / shifting / lift-padding / gate-pass or similar
                  charges applicable to the property.
                </li>
                <li>Reviewing and signing the Property Baseline Report (PBR) at onboarding.</li>
                <li>
                  Reviewing and accepting verified Tenant applications through the Platform's owner portal in accordance
                  with the applicable agreement.
                </li>
                <li>
                  Complying with the Owner obligations described in the executed PMSA and Rental Agreement, including
                  (where applicable) maintenance response timelines, the deposit transfer obligation on notice, and
                  other contractual obligations.
                </li>
                <li>
                  Paying any taxes, society dues, statutory levies, or other charges that fall to the Owner under
                  applicable law and the applicable agreement (for example, society maintenance is included in Base Rent
                  and is paid by the Owner directly to the society).
                </li>
                <li>
                  Not bypassing the Platform to negotiate, transact, or contact Tenants directly outside the framework
                  permitted by the applicable agreement.
                </li>
              </ul>

              {/* 8 — Tenant Responsibilities */}
              <h2 id="tenant-responsibilities" className={h2} style={dm}>
                8. Tenant Responsibilities
              </h2>
              <p className={p} style={dm}>
                If you use the Platform as a prospective Tenant, applicant, or Tenant, you are responsible for:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Providing accurate identity, contact, employment, income, and background information.
                </li>
                <li>
                  Providing supporting documents reasonably required for verification, KYC, and statutory compliance.
                </li>
                <li>
                  Truthful self-declaration of information requested in the application (including the Background
                  Disclosure Declaration).
                </li>
                <li>
                  Reviewing and signing the Move-In Report (MIR) on the Possession Date and raising any omission or
                  correction within the Amendment Window described in the applicable agreement (currently 5 days from
                  the Possession Date).
                </li>
                <li>
                  Paying the Total Monthly Payment (Base Rent and Reeve Service Fee) as a single indivisible amount on
                  or before the due date set out in the applicable agreement (currently the 5th of each calendar month).
                </li>
                <li>
                  Complying with all Tenant obligations under the executed Rental Agreement, including occupancy,
                  maintenance reporting, prohibited-use restrictions, society rules, and applicable laws.
                </li>
                <li>
                  Bearing TDS deduction, deposit, and reporting obligations on the Base Rent as required under
                  applicable law (currently Section 194-IB at 2% for resident Owners above the rent threshold and
                  Section 195 at 30% for NRI Owners regardless of threshold). Reeve is not a withholding agent and does
                  not perform TDS reconciliation.
                </li>
                <li>
                  Cooperating with scheduled inspections, the Move-Out Condition Report (MOCR), and the Damage
                  Assessment Report (RA-001) process at exit.
                </li>
                <li>
                  Not subletting, assigning, or commercially hosting the property except to the extent permitted by the
                  applicable agreement.
                </li>
              </ul>

              {/* 9 — Reeve's Role */}
              <h2 id="reeve-role" className={h2} style={dm}>
                9. Reeve's Role and Limitations
              </h2>
              <p className={p} style={dm}>
                Reeve operates as a technology-enabled platform that provides documentation, coordination, and
                communication services between Owners and Tenants, in line with the applicable agreement.
              </p>
              <div className={hb}>
                <p className="mb-3 font-medium">Reeve is not, and does not act as:</p>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li>A landlord or co-licensor.</li>
                  <li>A tenant.</li>
                  <li>
                    A real estate agent or broker for individual Owners (other than as an intermediary on the Platform).
                  </li>
                  <li>A bank, payment system operator, or financial institution.</li>
                  <li>An insurer, guarantor, surety, or rent-protection provider.</li>
                  <li>A legal adviser, tax adviser, financial adviser, or chartered accountant.</li>
                  <li>A vendor, repair contractor, or building maintenance company.</li>
                  <li>
                    An arbitrator or adjudicator with binding authority outside the limited operational role described in
                    the applicable agreement.
                  </li>
                </ul>
              </div>
              <p className={p} style={dm}>
                Reeve is a payment collection and routing intermediary in respect of certain payments described in the
                applicable agreement (such as the Total Monthly Payment, Confirmation Token, and applicable delay
                charges). Reeve does not advance, subsidise, or pay Rent from its own funds; Owner payouts are strictly
                contingent on actual receipt of the Tenant's payment by Reeve.
              </p>
              <p className={p} style={dm}>
                Reeve does not warrant the character, conduct, lifestyle, dietary preferences, or post-possession
                behaviour of any Tenant or Owner, except to the extent of the verifications it performs under the
                applicable agreement.
              </p>

              {/* 10 — Listings */}
              <h2 id="listings" className={h2} style={dm}>
                10. Property Listings, Applications, Visits, and Inspections
              </h2>
              <p className={p} style={dm}>
                The Platform allows Owners to list properties and prospective Tenants to discover, visit, and apply for
                properties.
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Listings are based on information provided by the Owner and inspections conducted by Reeve. Reeve
                  takes reasonable care to present accurate listings but does not warrant that all details are perfectly
                  current at every moment.
                </li>
                <li>
                  Visits are scheduled through the Platform and are conducted by Reeve representatives in line with our
                  published protocols.
                </li>
                <li>
                  Tenant applications are evaluated using the Platform's verification process, which may include
                  identity verification, income adequacy assessment, self-declared credit information, background
                  self-declarations, and police verification filings where mandated by the applicable state.
                </li>
                <li>
                  Owners review verified, summarised tenant profiles through the owner portal and accept or reject
                  applications within the response window described in the applicable agreement and SOPs.
                </li>
                <li>
                  Inspections (including the Property Baseline Report, Move-In Report, Bi-Annual Inspection Report,
                  Move-Out Condition Report, and the related damage assessment) are conducted in accordance with our
                  published protocols and the applicable agreement.
                </li>
              </ul>
              <p className={p} style={dm}>
                Reeve does not promise placement within any specific timeline. Vacancy review checkpoints, Owner
                Decision Points, and any auto-termination consequences are governed by the applicable signed agreement.
              </p>

              {/* 11 — Agreements & Lifecycle */}
              <h2 id="agreements-lifecycle" className={h2} style={dm}>
                11. Agreements, Reports, and Rental Lifecycle
              </h2>
              <p className={p} style={dm}>
                Where a tenancy proceeds, Reeve facilitates execution of the tripartite Rental Agreement (between Owner,
                Tenant, and Reeve as platform intermediary). The agreement is electronically stamped through SHCIL
                Karnataka and executed using Aadhaar-based eSign through Leegality, in a sequential signing order.
              </p>
              <p className={p} style={dm}>
                The Rental Agreement and PMSA set out, among other things:
              </p>
              <ul className={ul} style={dm}>
                <li>Term, lock-in period, notice period, and minimum effective tenancy.</li>
                <li>Base Rent, Reeve Service Fee, Total Monthly Payment, and payment due dates.</li>
                <li>Confirmation Token, Security Deposit, and settlement mechanics.</li>
                <li>Late payment delay charges and deposit transfer delay charges.</li>
                <li>
                  Tenant and Owner obligations, including maintenance, society compliance, and TDS.
                </li>
                <li>
                  The three-tier maintenance framework, including pre-authorised repair thresholds and emergency
                  authority.
                </li>
                <li>Conditions for Material Breach, Early Exit Liability, and termination.</li>
                <li>Dispute resolution, governing law, and jurisdiction.</li>
              </ul>
              <p className={p} style={dm}>
                The MIR, BIR (where applicable), MOCR, and RA-001 are produced through the Platform in line with the
                applicable agreement and the underlying inspection and damage assessment frameworks.
              </p>

              {/* 12 — Payments */}
              <h2 id="payments" className={h2} style={dm}>
                12. Payments, Fees, Deposits, Rent, Taxes, and Charges
              </h2>
              <p className={p} style={dm}>
                Payments associated with the use of the Platform may include:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  The <strong>Reeve Service Fee</strong> charged to the Tenant above the Base Rent (currently flat 7%
                  of Base Rent during the first term and 4% of Base Rent on renewal). The Owner is not liable for any
                  portion of the Reeve Service Fee.
                </li>
                <li>
                  The <strong>Confirmation Token</strong> paid by the prospective Tenant to Reeve to reserve the
                  property and initiate onboarding, adjustable against the first month's Total Monthly Payment if the
                  tenancy commences.
                </li>
                <li>
                  The <strong>Total Monthly Payment</strong> (Base Rent plus Reeve Service Fee) paid by the Tenant to
                  Reeve as a single indivisible amount.
                </li>
                <li>
                  The <strong>Security Deposit</strong> (currently 2 months' Base Rent) paid by the
                  Tenant <strong>directly to the Owner</strong> before possession, held by the Owner during the tenancy,
                  and transferred by the Owner to Reeve on service of notice for limited custodial holding during the
                  Settlement Window.
                </li>
                <li>
                  <strong>Delay charges</strong> that may accrue under the applicable agreement (for example, late
                  payment delay charges and Owner deposit transfer delay charges).
                </li>
                <li>
                  Charges payable to third parties (vendors, payment processors, government authorities, societies,
                  telecom or utility providers) which are governed by the relevant third party.
                </li>
              </ul>
              <p className={p} style={dm}>
                You are responsible for all taxes, statutory levies, stamp duty, and similar charges that apply to your
                use of the Platform and to the agreements you enter into, in accordance with applicable law and the
                applicable agreement.
              </p>
              <p className={p} style={dm}>
                The Tenant is solely responsible for deducting, depositing, and reporting any TDS on the Base Rent as
                required under applicable law. Reeve is not a withholding agent and does not perform TDS
                reconciliation. The Tenant indemnifies the Owner and Reeve against any tax, interest, penalty, cost, or
                claim arising from the Tenant's failure to comply.
              </p>
              <p className={p} style={dm}>
                Refunds and cancellations are governed by our <strong>Refund Policy</strong> and, where applicable, by
                the executed signed agreement.
              </p>

              {/* 13 — Refunds */}
              <h2 id="refunds" className={h2} style={dm}>
                13. Refunds and Cancellations
              </h2>
              <p className={p} style={dm}>
                Refunds and cancellations are governed by the <strong>Refund Policy</strong> published on the Platform,
                read together with the applicable signed agreement. In summary, the Reeve Service Fee is non-refundable
                once the relevant tenancy term commences; the Confirmation Token is non-refundable on Tenant
                cancellation but refundable in full on Owner cancellation (with the Owner additionally paying Reeve a
                fixed cancellation charge under the applicable agreement); Security Deposit settlement is governed by
                the applicable agreement and the RA-001; and approved refunds processed by Reeve are generally completed
                within 10 business days after approval, subject to payment gateway, bank, statutory, and third-party
                processing timelines.
              </p>

              {/* 14 — User Content */}
              <h2 id="user-content" className={h2} style={dm}>
                14. User Content and Uploaded Documents
              </h2>
              <p className={p} style={dm}>
                When you upload, submit, transmit, or otherwise make available any content or documents through the
                Platform (for example, identity documents, ownership documents, income documents, property photographs,
                video walkthroughs, inspection observations, maintenance request photos and videos, or messages), you
                grant Reeve a non-exclusive, royalty-free, worldwide, sub-licensable licence (limited to its service
                providers acting on its behalf) to host, store, copy, transmit, display, process, and otherwise use such
                content or documents for the purposes of:
              </p>
              <ul className={ul} style={dm}>
                <li>Operating, securing, and improving the Platform.</li>
                <li>
                  Providing the services described in our agreements and public-facing materials.
                </li>
                <li>Complying with applicable laws and responding to lawful requests from authorities.</li>
                <li>Enforcing our terms and agreements and resolving disputes.</li>
              </ul>
              <p className={p} style={dm}>
                You confirm that you have all rights and consents necessary to upload such content, that the content does
                not infringe the rights of any third party, and that the content is not unlawful, defamatory, obscene,
                or otherwise prohibited under applicable law.
              </p>
              <p className={p} style={dm}>
                You retain ownership of your content. The licence above is limited to what is necessary for the purposes
                set out in this Section.
              </p>
              <p className={p} style={dm}>
                Reeve may remove or restrict access to content that, in its reasonable judgement, violates these Terms,
                infringes third-party rights, breaches applicable law, or is otherwise objectionable.
              </p>

              {/* 15 — Prohibited Conduct */}
              <h2 id="prohibited-conduct" className={h2} style={dm}>
                15. Prohibited Conduct
              </h2>
              <p className={p} style={dm}>
                You agree not to use the Platform to:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Submit false, misleading, or impersonated information, or to misrepresent your identity, eligibility,
                  role, or authority.
                </li>
                <li>Create or assist in creating fake or fraudulent property listings.</li>
                <li>
                  Submit fraudulent applications, manipulate verification flows, or bypass identity or KYC checks.
                </li>
                <li>
                  Harass, threaten, intimidate, defame, or stalk any person, or engage in discriminatory conduct
                  prohibited under applicable law.
                </li>
                <li>
                  Use a property managed through the Platform for any unlawful purpose, or in violation of society
                  by-laws or the applicable agreement (including any prohibition on subletting or short-term/vacation
                  rental hosting through services such as Airbnb, Booking.com, or similar platforms).
                </li>
                <li>Attempt to gain unauthorised access to the Platform, accounts, systems, or data.</li>
                <li>Scrape, crawl, mirror, or extract data from the Platform without authorisation.</li>
                <li>
                  Introduce any malware, virus, worm, spyware, or other harmful code into the Platform.
                </li>
                <li>
                  Abuse payment, scheduling, refund, or grievance systems (for example, by submitting bad-faith refund
                  requests, repeatedly cancelling visits, or initiating chargebacks without legitimate grounds).
                </li>
                <li>
                  Reverse-engineer, decompile, or attempt to derive source code or trade secrets from the Platform,
                  except to the extent permitted by applicable law.
                </li>
                <li>Use the Platform to send unsolicited commercial communications.</li>
              </ul>

              {/* 16 — Third-Party */}
              <h2 id="third-party" className={h2} style={dm}>
                16. Third-Party Services
              </h2>
              <p className={p} style={dm}>
                The Platform integrates with, and is supported by, a number of third-party service providers, which may
                include hosting, database, authentication, storage, image-delivery, error-monitoring, analytics, eStamp,
                eSign, payment, KYC, communication (email/WhatsApp/SMS), and inspection or maintenance vendors.
              </p>
              <p className={p} style={dm}>
                Use of those services may be subject to the relevant provider's own terms and policies. Reeve is not
                responsible for the conduct, content, terms, policies, or outcomes of third-party services beyond
                Reeve's reasonable control.
              </p>
              <p className={p} style={dm}>
                Where you make payments through the Platform, the underlying card, UPI, net-banking, or similar
                transaction is processed by the relevant payment provider in accordance with that provider's terms.
              </p>

              {/* 17 — Privacy */}
              <h2 id="privacy" className={h2} style={dm}>
                17. Privacy
              </h2>
              <p className={p} style={dm}>
                Our collection, use, sharing, storage, and other processing of personal information is described in
                the <strong>Privacy Policy</strong> published on the Platform. By using the Platform, you acknowledge
                that you have read the Privacy Policy and consent to the processing described there, to the extent
                permitted by applicable law.
              </p>

              {/* 18 — Availability */}
              <h2 id="availability" className={h2} style={dm}>
                18. Service Availability
              </h2>
              <p className={p} style={dm}>
                We aim to make the Platform available on a continuous basis, but we do not promise that the Platform will
                be uninterrupted, error-free, or available at any specific level of performance.
              </p>
              <p className={p} style={dm}>
                We may, from time to time and without prior notice where reasonable:
              </p>
              <ul className={ul} style={dm}>
                <li>Perform scheduled or emergency maintenance.</li>
                <li>
                  Update, modify, suspend, or discontinue features, functions, or content on the Platform.
                </li>
                <li>
                  Restrict access in particular geographies or for particular categories of users to the extent
                  permitted by law.
                </li>
                <li>
                  Take down, restrict, or modify any listing, content, or account that violates these Terms or
                  applicable law.
                </li>
              </ul>
              <p className={p} style={dm}>
                We will take reasonable steps to communicate scheduled maintenance and significant changes where
                practical.
              </p>

              {/* 19 — Disclaimers */}
              <h2 id="disclaimers" className={h2} style={dm}>
                19. Disclaimers
              </h2>
              <p className={p} style={dm}>
                To the maximum extent permitted by applicable law, the Platform and its content are provided on an "as
                is" and "as available" basis. Without limiting the foregoing, Reeve does not warrant or guarantee:
              </p>
              <ul className={ul} style={dm}>
                <li>That any specific property will be available, listed, leased, or renewed.</li>
                <li>That any specific Tenant will be placed within any timeframe.</li>
                <li>That any specific Owner will accept any application or counter-offer.</li>
                <li>
                  That rent will be paid on time by any Tenant, or that any specific deposit amount will be returned at
                  exit.
                </li>
                <li>
                  That maintenance issues will be resolved within any specific timeframe by any specific party.
                </li>
                <li>
                  That communications, listings, photographs, or inspection records are free from minor errors or
                  omissions.
                </li>
                <li>
                  That the Platform is fully secure or free from interruptions, defects, or malicious activity.
                </li>
                <li>
                  The conduct, character, or post-possession behaviour of any Owner, Tenant, vendor, or third party.
                </li>
              </ul>
              <p className={p} style={dm}>
                These disclaimers do not exclude liability that cannot be excluded under applicable law.
              </p>

              {/* 20 — Liability */}
              <h2 id="liability" className={h2} style={dm}>
                20. Limitation of Liability
              </h2>
              <p className={p} style={dm}>
                To the maximum extent permitted by applicable law, and without prejudice to any liability cap set out in
                the applicable signed agreement:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Reeve will not be liable for indirect, consequential, incidental, special, exemplary, or punitive
                  damages, loss of rental income, loss of profit, loss of goodwill, loss of data, loss of opportunity,
                  or loss of anticipated savings, arising out of or in connection with the Platform or these Terms.
                </li>
                <li>
                  Reeve's total aggregate liability arising out of or in connection with the Platform and these Terms in
                  respect of any specific tenancy or service relationship will not exceed the limit set out in the
                  applicable signed agreement (currently the total Reeve Service Fee collected from Tenants at the
                  relevant property during the 12 months preceding the event giving rise to the claim).
                </li>
                <li>
                  Where there is no signed agreement applicable to a specific claim, Reeve's total aggregate liability
                  for that claim will not exceed the amounts (if any) actually received by Reeve from you in the 12
                  months preceding the event giving rise to the claim.
                </li>
              </ul>
              <p className={p} style={dm}>
                Nothing in this Section limits or excludes any liability that cannot be limited or excluded under
                applicable law, including liability for fraud or wilful misconduct.
              </p>

              {/* 21 — Indemnity */}
              <h2 id="indemnity" className={h2} style={dm}>
                21. Indemnity
              </h2>
              <p className={p} style={dm}>
                To the maximum extent permitted by applicable law, you agree to indemnify, defend, and hold harmless
                Reeve, its directors, officers, employees, agents, and authorised service providers from and against any
                and all claims, losses, damages, liabilities, costs, and expenses (including reasonable legal fees)
                arising out of or related to:
              </p>
              <ul className={ul} style={dm}>
                <li>Your breach of these Terms or any applicable signed agreement.</li>
                <li>Your breach of applicable law.</li>
                <li>Any inaccurate, misleading, or fraudulent information provided by you.</li>
                <li>Your misuse of the Platform.</li>
                <li>
                  Your infringement of any third-party right (including intellectual property, privacy, or publicity
                  rights).
                </li>
                <li>Any third-party claim arising from your conduct, your property, or your tenancy.</li>
              </ul>

              {/* 22 — Suspension */}
              <h2 id="suspension" className={h2} style={dm}>
                22. Suspension and Termination
              </h2>
              <p className={p} style={dm}>
                We may, with reasonable notice where practical (and without notice where reasonably required for safety,
                security, fraud prevention, legal compliance, or to protect the integrity of the Platform), suspend,
                restrict, or terminate your access to all or part of the Platform if:
              </p>
              <ul className={ul} style={dm}>
                <li>You breach these Terms or any applicable agreement.</li>
                <li>You provide false or misleading information.</li>
                <li>We have reasonable grounds to suspect fraud, abuse, or other unlawful conduct.</li>
                <li>
                  We are required to do so under applicable law or by an order of a competent authority.
                </li>
                <li>The Platform or specific features are discontinued.</li>
              </ul>
              <p className={p} style={dm}>
                You may close your account by contacting us at{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a>.
                Closure of your account does not by itself terminate any obligations under an executed signed agreement,
                and certain information may continue to be retained as described in the Privacy Policy and the applicable
                agreement.
              </p>

              {/* 23 — Disputes */}
              <h2 id="disputes" className={h2} style={dm}>
                23. Dispute Resolution
              </h2>
              <p className={p} style={dm}>
                If you have a complaint, please first contact us at{" "}
                <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a> or
                our Grievance Officer at{" "}
                <a href="mailto:daksh@reeve.in" className="text-blue-600 hover:underline">daksh@reeve.in</a> so we can
                attempt to resolve the matter promptly.
              </p>
              <p className={p} style={dm}>
                Where you have signed a Rental Agreement, PMSA, or other agreement with Reeve and another party, the
                dispute resolution provisions of that agreement (including any good-faith negotiation period and any
                arbitration clause) govern disputes arising out of or in connection with that agreement and the related
                property/service relationship.
              </p>
              <p className={p} style={dm}>
                Under the current agreement framework, disputes are first attempted to be resolved through good-faith
                negotiation for 30 days from written notice. If not resolved, disputes are referred to mandatory
                arbitration under the Arbitration and Conciliation Act, 1996, with a sole arbitrator, seat and venue at
                Bengaluru, Karnataka, and proceedings in English. The arbitral award is final and binding.
              </p>
              <p className={p} style={dm}>
                For matters not subject to such arbitration, the courts at Bengaluru, Karnataka have jurisdiction,
                subject to applicable law.
              </p>

              {/* 24 — Governing Law */}
              <h2 id="governing-law" className={h2} style={dm}>
                24. Governing Law and Jurisdiction
              </h2>
              <p className={p} style={dm}>
                These Terms are governed by the laws of India. Subject to any arbitration, exclusive jurisdiction, or
                dispute-resolution process set out in an applicable signed agreement, the courts at Bengaluru, Karnataka
                will have jurisdiction.
              </p>

              {/* 25 — Changes */}
              <h2 id="changes" className={h2} style={dm}>
                25. Changes to these Terms
              </h2>
              <p className={p} style={dm}>
                We may update these Terms from time to time to reflect changes in our services, our agreements, our
                operations, or applicable law. The "Last updated" date at the top of this page will reflect the most
                recent update.
              </p>
              <p className={p} style={dm}>
                Where the changes are material, we will take reasonable steps to inform you, for example through a
                notice on the Platform or by email. Your continued use of the Platform after the effective date of the
                updated Terms indicates your acceptance of the changes, to the extent permitted by applicable law.
              </p>
              <p className={p} style={dm}>
                We maintain internal versioning of these Terms so that we can keep a record of which version was in
                effect at the time you accepted them.
              </p>

              {/* 26 — Contact */}
              <h2 id="contact" className={h2} style={dm}>
                26. Contact and Grievance Details
              </h2>
              <p className={p} style={dm}>
                For questions, complaints, or grievances relating to these Terms or the Platform, please contact:
              </p>
              <div className={hb}>
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
                Where required under applicable law, you may also approach the relevant authority after pursuing the
                grievance redressal procedure described above.
              </p>

              {/* Disclaimer footer */}
              <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500 leading-7 italic" style={dm}>
                These Terms of Service are a public website policy and do not replace any executed Rental Agreement,
                Property Management Service Agreement, or other signed agreement. Where a signed agreement applies and
                conflicts with these Terms, the signed agreement controls for that specific property or service
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

export default Terms;
