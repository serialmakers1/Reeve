import Layout from "@/components/Layout";

const tocLinks = [
  { id: "introduction", label: "Introduction" },
  { id: "plain-english-summary", label: "Plain-English Summary" },
  { id: "scope", label: "Scope" },
  { id: "signed-agreements", label: "Signed Agreements" },
  { id: "payment-types", label: "Payment Types Covered" },
  { id: "service-fees", label: "Reeve Service Fees" },
  { id: "confirmation-token", label: "Confirmation Token" },
  { id: "rent-payments", label: "Rent Payments" },
  { id: "security-deposit", label: "Security Deposit" },
  { id: "owner-cancellation", label: "Owner Cancellation" },
  { id: "tenant-cancellation", label: "Tenant Cancellation & Early Exit" },
  { id: "non-refundable", label: "Non-Refundable Charges" },
  { id: "third-party-charges", label: "Third-Party Charges" },
  { id: "refund-process", label: "Refund Request Process" },
  { id: "refund-timelines", label: "Review & Timelines" },
  { id: "disputes", label: "Disputes & Settlements" },
  { id: "contact", label: "Contact" },
];

const h2 = "text-lg font-semibold text-slate-900 mt-12 mb-3 scroll-mt-8";
const p = "text-base text-slate-600 leading-8 mt-3";
const ul = "list-disc list-outside pl-5 space-y-2 text-base text-slate-600 leading-7 mt-3";
const highlight = "rounded-xl border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-sm text-slate-700 leading-7 my-6";
const dm = { fontFamily: "'DM Sans', sans-serif" };

const Refund = () => {
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
                Refund Policy
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
                This Refund Policy describes how Serial Makers Private Limited (CIN: U62099KA2026PTC216343), operating
                under the brand name "Reeve" ("Reeve", "we", "us", or "our"), handles refund requests for payments made
                through the Reeve website, mobile-friendly web application, and related services (together, the
                "Platform").
              </p>
              <p className={p} style={dm}>
                Reeve is a Bengaluru-based residential rental management platform. Different categories of payments flow
                through, or are documented on, the Platform, and each category is governed by a specific set of rules.
                This Policy explains how each category is treated.
              </p>
              <p className={p} style={dm}>
                This is a public-facing website policy. It does not replace any executed Rental Agreement, Property
                Management Service Agreement (PMSA), or other signed agreement between Reeve and a user. Where a signed
                agreement applies and conflicts with this Policy in respect of a specific property or service
                relationship, the signed agreement controls for that relationship.
              </p>

              {/* 2 — Plain-English Summary */}
              <h2 id="plain-english-summary" className={h2} style={dm}>
                2. Plain-English Summary
              </h2>
              <div className={highlight}>
                <p className="mb-3 font-medium">In simple terms:</p>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li>The Reeve Service Fee is non-refundable once the relevant tenancy term commences.</li>
                  <li>
                    The Confirmation Token is non-refundable if the prospective Tenant cancels or fails to take
                    possession. It is refundable in full where the Owner cancels or is unable to deliver possession
                    before the Possession Date, in which case the Owner also pays Reeve a fixed cancellation charge as
                    set out in the applicable agreement.
                  </li>
                  <li>Rent that has already been routed to the Owner is not refundable by Reeve.</li>
                  <li>
                    The Security Deposit is paid by the Tenant directly to the Owner before possession. Reeve does not
                    collect or hold the Security Deposit during the tenancy. On exit, the Security Deposit is settled in
                    accordance with the applicable signed agreement and the Damage Assessment Report (RA-001).
                  </li>
                  <li>
                    Third-party charges, payment gateway charges, and statutory or tax-related charges are governed by
                    the relevant third party or statute and may not be refundable by Reeve.
                  </li>
                  <li>
                    Where a refund is approved, it is generally processed within 10 business days after approval, subject
                    to payment gateway, bank, statutory, and third-party processing timelines.
                  </li>
                </ul>
              </div>

              {/* 3 — Scope */}
              <h2 id="scope" className={h2} style={dm}>
                3. Scope of this Refund Policy
              </h2>
              <p className={p} style={dm}>
                This Policy applies to payments made by users to Reeve through the Platform in the course of using the
                services described in our public-facing materials and our agreements. It does not apply to:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Payments made directly between an Owner and a Tenant outside the Platform (for example, the Security
                  Deposit paid by the Tenant directly to the Owner before possession).
                </li>
                <li>
                  Payments made by users to vendors, societies, utility providers, government authorities, or other
                  third parties.
                </li>
                <li>Charges levied by payment service providers, banks, or aggregators.</li>
                <li>
                  Refunds that are governed exclusively by an executed Rental Agreement, PMSA, or other signed
                  agreement; in such cases the signed agreement controls.
                </li>
              </ul>

              {/* 4 — Signed Agreements */}
              <h2 id="signed-agreements" className={h2} style={dm}>
                4. Relationship with Signed Agreements
              </h2>
              <p className={p} style={dm}>
                Where you have signed a Rental Agreement, PMSA, or other agreement with Reeve and another party, the
                refund, cancellation, deposit, settlement, and dispute terms in that agreement control over this Policy
                in case of conflict, for that specific relationship.
              </p>
              <p className={p} style={dm}>
                This Policy describes general principles applied through the Platform. The applicable signed agreement
                governs specific commercial terms such as the Confirmation Token amount, the Security Deposit amount,
                the Reeve Service Fee, the rent payable, the lock-in period, the notice period, the Early Exit
                Liability, and the dispute resolution process.
              </p>

              {/* 5 — Payment Types */}
              <h2 id="payment-types" className={h2} style={dm}>
                5. Payment Types Covered
              </h2>
              <p className={p} style={dm}>
                The following payment categories may be made through, or referenced on, the Platform:
              </p>
              <ul className={ul} style={dm}>
                <li>Reeve Service Fee (charged to the Tenant above the Base Rent).</li>
                <li>
                  Confirmation Token (paid by the prospective Tenant to Reeve before possession to reserve a property
                  and initiate onboarding).
                </li>
                <li>
                  First-month Total Monthly Payment (Base Rent plus the Reeve Service Fee, paid by the Tenant to Reeve
                  as a single indivisible amount).
                </li>
                <li>Subsequent monthly Total Monthly Payments.</li>
                <li>
                  Delay charges and similar contractual charges that may accrue under the applicable signed agreement.
                </li>
                <li>
                  Security Deposit (paid by the Tenant directly to the Owner before possession; Reeve does not collect
                  or hold this during the tenancy).
                </li>
                <li>
                  Charges payable to third parties, vendors, payment processors, government authorities, or societies.
                </li>
              </ul>

              {/* 6 — Service Fees */}
              <h2 id="service-fees" className={h2} style={dm}>
                6. Reeve Service Fees
              </h2>
              <p className={p} style={dm}>
                The Reeve Service Fee is the fee charged by Reeve to the Tenant above the Base Rent, at the rate set
                out in the applicable signed agreement (currently flat 7% of Base Rent during the first term and 4% of
                Base Rent on renewal).
              </p>
              <ul className={ul} style={dm}>
                <li>
                  The Reeve Service Fee accrues on a monthly basis as part of the indivisible Total Monthly Payment.
                </li>
                <li>Once the relevant tenancy term commences, the Reeve Service Fee is non-refundable.</li>
                <li>
                  Where a tenancy does not commence due to a Tenant-side cancellation, withdrawal, refusal to take
                  possession, or failure to proceed with move-in before the Possession Date, the prospective Tenant is
                  not entitled to a refund of the non-refundable Confirmation Token (see Section 7), and any first-month
                  Total Monthly Payment received by Reeve will be processed in accordance with the applicable signed
                  agreement.
                </li>
                <li>
                  Reeve does not waive, discount, or refund the Reeve Service Fee for unused months, vacancy, early
                  exit, or convenience-based reasons, except as expressly provided in the applicable signed agreement or
                  as required by applicable law.
                </li>
              </ul>

              {/* 7 — Token */}
              <h2 id="confirmation-token" className={h2} style={dm}>
                7. Token / Confirmation Payment
              </h2>
              <p className={p} style={dm}>
                The Confirmation Token is the pre-possession booking amount paid by a prospective Tenant to Reeve to
                reserve the Licensed Premises and initiate onboarding, as defined in the applicable Rental Agreement.
              </p>
              <ul className={ul} style={dm}>
                <li>
                  If the prospective Tenant takes possession on the Possession Date and the tenancy commences, the
                  Confirmation Token is adjusted against the first month's Total Monthly Payment.
                </li>
                <li>
                  If the prospective Tenant withdraws, cancels, fails or refuses to take possession, or otherwise does
                  not proceed with move-in at any time before the Possession Date, the Confirmation Token is
                  non-refundable and is retained by Reeve in full, in line with the applicable agreement.
                </li>
                <li>
                  If the Owner withdraws, cancels, refuses to proceed, or is unable to deliver possession of the
                  Licensed Premises on the Possession Date, Reeve will refund the Confirmation Token actually received
                  by Reeve to the prospective Tenant in full, generally within 10 business days of cancellation
                  confirmation through the Platform (subject to payment gateway, bank, statutory, and third-party
                  processing timelines), without interest. In such Owner-side cancellation, the Owner is also required
                  to pay Reeve a fixed cancellation charge of Rs. 5,000 within the timelines set out in the applicable
                  agreement.
                </li>
              </ul>
              <p className={p} style={dm}>
                The first-month Total Monthly Payment, if received by Reeve before the Possession Date, will be
                refunded to the prospective Tenant in the Owner-cancellation scenario described above (and, in the
                Tenant-cancellation scenario, in line with the applicable agreement excluding the non-refundable
                Confirmation Token), without interest, and only to the extent actually received by Reeve.
              </p>

              {/* 8 — Rent */}
              <h2 id="rent-payments" className={h2} style={dm}>
                8. Rent Payments
              </h2>
              <p className={p} style={dm}>
                Rent for an active tenancy is collected from the Tenant as part of the Total Monthly Payment and routed
                to the Owner in accordance with the applicable signed agreement.
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Once Base Rent has been received by Reeve and routed to the Owner, Reeve does not refund that Rent.
                  Any claim relating to Rent already routed to the Owner is to be raised against the Owner directly
                  under the applicable signed agreement.
                </li>
                <li>
                  Where Rent has been received by Reeve but has not yet been routed to the Owner (for example, awaiting
                  reconciliation), Reeve will process such amount in accordance with the applicable signed agreement and
                  applicable law.
                </li>
                <li>
                  Reeve does not advance, subsidise, or pay Rent from its own funds. Owner payouts are strictly
                  contingent on actual receipt of the Tenant's payment by Reeve.
                </li>
                <li>
                  Delay charges, where they accrue under the applicable signed agreement, are not refundable simply
                  because a payment has eventually been received.
                </li>
              </ul>

              {/* 9 — Security Deposit */}
              <h2 id="security-deposit" className={h2} style={dm}>
                9. Security Deposit and Settlement
              </h2>
              <div className={highlight}>
                The Security Deposit is paid by the Tenant <strong>directly to the Owner before possession</strong>{" "}
                under the applicable Rental Agreement. Reeve does not collect or hold the Security Deposit at the time
                of move-in.
              </div>
              <p className={p} style={dm}>
                On service of notice of exit by either party, the Owner is required to transfer the full Security
                Deposit to Reeve within the timeline set out in the applicable agreement (currently within 5 business
                days of notice). Reeve holds the Security Deposit only during the Settlement Window — from receipt on
                notice to final disbursement after issuance of the Damage Assessment Report (RA-001).
              </p>
              <p className={p} style={dm}>
                Settlement of the Security Deposit is governed by:
              </p>
              <ul className={ul} style={dm}>
                <li>The Move-In Report (MIR) signed at the start of the tenancy.</li>
                <li>The Bi-Annual Inspection Report (BIR), where applicable, as a monitoring record only.</li>
                <li>The Move-Out Condition Report (MOCR) signed at exit.</li>
                <li>
                  The Damage Assessment Report (RA-001) issued by Reeve, which classifies findings under the applicable
                  Damage Dictionary and determines permissible Tenant-responsibility deductions.
                </li>
                <li>Outstanding utility dues, contractually permitted charges, and any rent arrears.</li>
              </ul>
              <p className={p} style={dm}>
                Reeve does not promise the return of any specific portion of the Security Deposit. Reeve disburses the
                undisputed balance of the Security Deposit to the Tenant within the timeline set out in the applicable
                agreement (currently within 30 days of move-out), with the disputed portion held until resolution.
              </p>
              <p className={p} style={dm}>
                Where Tenant-responsibility damages exceed the Security Deposit, the excess is the Tenant's unsatisfied
                liability and is pursued by the Owner directly under the applicable signed agreement and dispute
                resolution process. Reeve does not advance funds for such excess.
              </p>

              {/* 10 — Owner Cancellation */}
              <h2 id="owner-cancellation" className={h2} style={dm}>
                10. Owner Cancellation
              </h2>
              <p className={p} style={dm}>
                Where an Owner withdraws, cancels, refuses to proceed, or is unable to deliver possession of a property
                to a verified prospective Tenant before the Possession Date:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  The Confirmation Token actually received by Reeve will be refunded by Reeve to the prospective Tenant
                  in full, generally within 10 business days of cancellation confirmation through the Platform (subject
                  to payment gateway, bank, statutory, and third-party processing timelines), without interest.
                </li>
                <li>
                  The first-month Total Monthly Payment, if any, actually received by Reeve will be refunded by Reeve
                  to the prospective Tenant generally within 10 business days of cancellation confirmation through the
                  Platform (subject to payment gateway, bank, statutory, and third-party processing timelines), without
                  interest.
                </li>
                <li>
                  The Owner is required to refund any Security Deposit actually received by the Owner directly to the
                  prospective Tenant within the timelines set out in the applicable agreement, without interest.
                </li>
                <li>
                  The Owner is required to pay Reeve a fixed cancellation charge of Rs. 5,000 within the timelines set
                  out in the applicable agreement.
                </li>
              </ul>
              <p className={p} style={dm}>
                Where an Owner elects to terminate an active tenancy during the lock-in period otherwise than due to a
                Material Breach by the Tenant, the consequences set out in the applicable agreement (including
                remaining-lock-in compensation to the Tenant and remaining-lock-in Reeve Service Fee to Reeve) apply.
              </p>

              {/* 11 — Tenant Cancellation */}
              <h2 id="tenant-cancellation" className={h2} style={dm}>
                11. Tenant Cancellation and Early Exit
              </h2>
              <p className={p} style={dm}>
                Where a prospective Tenant withdraws, cancels, fails or refuses to take possession, or otherwise does
                not proceed with move-in at any time before the Possession Date:
              </p>
              <ul className={ul} style={dm}>
                <li>The Confirmation Token is non-refundable and is retained by Reeve in full.</li>
                <li>
                  Any first-month Total Monthly Payment actually received by Reeve will be refunded to the prospective
                  Tenant in line with the applicable agreement, without interest, and excluding the non-refundable
                  Confirmation Token.
                </li>
                <li>
                  Any Security Deposit actually received by the Owner directly will be refunded by the Owner to the
                  prospective Tenant within the timelines set out in the applicable agreement, without interest.
                </li>
              </ul>
              <p className={p} style={dm}>
                Where a Tenant exits an active tenancy during the lock-in period otherwise than due to a Material
                Breach by another party, the Early Exit Liability set out in the applicable agreement applies. Under the
                current agreement, this generally means that the exiting Tenant is liable to pay (a) the Base Rent for
                each month of the lock-in period remaining after the exit date, to the Owner, and (b) the Reeve Service
                Fee for each such remaining month, to Reeve.
              </p>
              <p className={p} style={dm}>
                The Reeve Service Fee, once the term has commenced, is not refundable for unused months on early exit,
                except as expressly provided in the applicable agreement or as required by applicable law.
              </p>

              {/* 12 — Non-Refundable */}
              <h2 id="non-refundable" className={h2} style={dm}>
                12. Non-Refundable Charges
              </h2>
              <p className={p} style={dm}>
                The following are non-refundable, except as expressly provided in the applicable signed agreement or as
                required by applicable law:
              </p>
              <ul className={ul} style={dm}>
                <li>The Reeve Service Fee, once the relevant tenancy term has commenced.</li>
                <li>
                  The Confirmation Token, where the prospective Tenant cancels, withdraws, fails or refuses to take
                  possession, or otherwise does not proceed with move-in.
                </li>
                <li>Delay charges accrued under the applicable agreement.</li>
                <li>
                  Charges paid to third parties (vendors, payment processors, government authorities, societies, etc.),
                  which are governed by the relevant third party.
                </li>
                <li>
                  Any service or professional fees expressly stated to be non-refundable on the Platform at the time of
                  payment.
                </li>
              </ul>

              {/* 13 — Third-Party Charges */}
              <h2 id="third-party-charges" className={h2} style={dm}>
                13. Third-Party, Vendor, Statutory, and Payment Gateway Charges
              </h2>
              <p className={p} style={dm}>
                Refunds for the following categories are governed by the relevant third party, vendor, payment
                processor, or statute, and not by Reeve:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Charges levied by payment gateways, payment aggregators, or banks (for example, transaction fees,
                  convenience fees, or refund-processing fees).
                </li>
                <li>
                  Charges levied by societies or resident welfare associations (for example, society move-in / move-out
                  / shifting / lift-padding / gate-pass charges).
                </li>
                <li>
                  Charges paid to vendors for services arranged through Reeve (for example, photography, pest control,
                  or specialist inspections).
                </li>
                <li>
                  Government, tax, statutory, or regulatory charges (including TDS, GST, stamp duty, or registration
                  charges) which are governed by the relevant law and the relevant tax authority.
                </li>
                <li>Charges paid to telecom, internet, utility, or other service providers.</li>
              </ul>
              <p className={p} style={dm}>
                Reeve will share available transaction information to assist users in pursuing such refunds with the
                relevant third party where reasonable.
              </p>

              {/* 14 — Refund Process */}
              <h2 id="refund-process" className={h2} style={dm}>
                14. Refund Request Process
              </h2>
              <p className={p} style={dm}>
                If you believe you are eligible for a refund of a payment made to Reeve under this Policy:
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Send a written request to{" "}
                  <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">support@reeve.in</a>{" "}
                  from the email address registered with your Reeve account.
                </li>
                <li>
                  Include your full name, registered mobile number, the relevant property reference (where applicable),
                  the payment date, the payment amount, the payment reference (UTR / UPI reference / order ID), and a
                  clear description of the refund being requested.
                </li>
                <li>
                  Attach any supporting evidence (for example, payment receipts, screenshots, or correspondence) that
                  helps Reeve assess your request.
                </li>
              </ul>
              <p className={p} style={dm}>
                Refund requests should be raised within a reasonable period after the payment in question. Significant
                delay in raising a request may make it harder to verify the underlying transaction.
              </p>
              <p className={p} style={dm}>
                Refund requests relating to settlements, deductions, deposits, or other matters governed by an executed
                Rental Agreement, PMSA, or other signed agreement will be processed under the dispute resolution
                mechanism of the applicable agreement (see Section 16).
              </p>

              {/* 15 — Review & Timelines */}
              <h2 id="refund-timelines" className={h2} style={dm}>
                15. Refund Review and Processing Timelines
              </h2>
              <p className={p} style={dm}>
                Reeve will review eligible refund requests in good faith. We may ask for additional information or
                documents to verify the request.
              </p>
              <ul className={ul} style={dm}>
                <li>
                  Where a refund is approved, it is generally processed within{" "}
                  <strong>10 business days after approval</strong>, subject to payment gateway, bank, statutory, and
                  third-party processing timelines.
                </li>
                <li>
                  Refunds are made to the original mode of payment where reasonably possible. If the original mode is
                  not available, an alternative mode acceptable to both parties may be used.
                </li>
                <li>
                  Reeve does not pay interest on refunded amounts unless required by the applicable signed agreement or
                  by applicable law.
                </li>
                <li>
                  Reeve is not responsible for delays caused by payment gateways, banks, intermediaries, or any factor
                  beyond its reasonable control.
                </li>
              </ul>
              <p className={p} style={dm}>
                If a refund request is declined, Reeve will share the reason in writing. You may then raise a grievance
                through the channels in Section 17 or pursue the dispute under the applicable signed agreement.
              </p>

              {/* 16 — Disputes */}
              <h2 id="disputes" className={h2} style={dm}>
                16. Disputes and Agreement-Based Settlements
              </h2>
              <p className={p} style={dm}>
                Disputes relating to:
              </p>
              <ul className={ul} style={dm}>
                <li>Deductions from the Security Deposit and the Damage Assessment Report (RA-001),</li>
                <li>Cancellation charges payable under the applicable agreement,</li>
                <li>Early Exit Liability or other contractual liabilities,</li>
                <li>Maintenance cost deductions,</li>
                <li>Deposit transfer obligations and consequences, or</li>
                <li>
                  Any other rights or obligations under an executed Rental Agreement, PMSA, or other signed agreement,
                </li>
              </ul>
              <p className={p} style={dm}>
                are handled under the dispute resolution process set out in the applicable signed agreement, including
                any good-faith negotiation period and any arbitration clause.
              </p>
              <p className={p} style={dm}>
                Reeve does not act as an adjudicator outside the framework of the applicable signed agreement. Where
                Reeve issues an RA-001 or similar instrument, it does so in its limited operational role under the
                agreement.
              </p>

              {/* 17 — Contact */}
              <h2 id="contact" className={h2} style={dm}>
                17. Contact for Refund Requests
              </h2>
              <p className={p} style={dm}>
                For refund requests, related questions, or grievances, please contact:
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
                We will respond to refund-related communications in line with our Privacy Policy and the applicable
                agreements.
              </p>

              {/* Disclaimer footer */}
              <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500 leading-7 italic" style={dm}>
                This Refund Policy is a public website policy and does not replace any executed Rental Agreement,
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

export default Refund;
