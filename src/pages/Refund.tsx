import Layout from "@/components/Layout";

const Refund = () => {
  return (
    <Layout>
      <div className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          {/* Header */}
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">LEGAL</p>
          <h1 className="mt-3" style={{ fontFamily: "'Instrument Serif', serif", fontSize: "40px", color: "#0F172A" }}>
            Refund Policy
          </h1>
          <p className="text-sm mt-2" style={{ color: "#64748B" }}>
            Last updated: March 2026
          </p>
          <hr className="border-t mt-8 mb-10" style={{ borderColor: "#E2E8F0" }} />

          {/* Section 1 */}
          <h2
            className="text-lg font-semibold mt-10 mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
          >
            What This Policy Covers
          </h2>
          <p className="text-base leading-8" style={{ fontFamily: "'DM Sans', sans-serif", color: "#334155" }}>
            This Refund Policy applies to the confirmation payment made by tenants on the Reeve platform when their
            rental application is accepted by a property owner. It does not govern the security deposit, which is
            addressed in your signed Leave and Licence Agreement.
          </p>

          {/* Section 2 */}
          <h2
            className="text-lg font-semibold mt-10 mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
          >
            When You Are Eligible for a Refund
          </h2>
          <div
            className="rounded-xl border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-sm leading-7 my-6"
            style={{ color: "#334155" }}
          >
            <p className="mb-3">
              A refund of your confirmation payment is available only in the following three circumstances:
            </p>
            <ul className="list-disc list-outside pl-5 space-y-2">
              <li>The property owner withdraws their acceptance after your payment has been received</li>
              <li>
                The property becomes unavailable for reasons outside your control (for example, the owner withdraws the
                property from the platform)
              </li>
              <li>
                Your KYC verification fails due to a verified error on Reeve's part — for example, a document processing
                failure caused by the platform
              </li>
            </ul>
            <p className="mt-3">In all other cases, the confirmation payment is non-refundable.</p>
          </div>

          {/* Section 3 */}
          <h2
            className="text-lg font-semibold mt-10 mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
          >
            When Refunds Do Not Apply
          </h2>
          <p className="text-base leading-8 mb-3" style={{ fontFamily: "'DM Sans', sans-serif", color: "#334155" }}>
            No refund will be issued in the following circumstances:
          </p>
          <ul
            className="list-disc list-outside pl-5 space-y-2 text-base leading-7"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#334155" }}
          >
            <li>You withdraw your application after payment</li>
            <li>Your KYC verification fails because your submitted documents do not match your application details</li>
            <li>Your KYC fails because documents are found to be incomplete, expired, or inconsistent</li>
            <li>You provide false or misrepresented information at any stage of the application</li>
            <li>You change your mind about the property after payment is made</li>
            <li>You fail to complete the KYC process within the required timeframe</li>
          </ul>

          {/* Section 4 */}
          <h2
            className="text-lg font-semibold mt-10 mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
          >
            What Is Refunded
          </h2>
          <div
            className="rounded-xl border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-sm leading-7 my-6"
            style={{ color: "#334155" }}
          >
            When a refund is approved, you will receive the full confirmation payment.
          </div>

          {/* Section 5 */}
          <h2
            className="text-lg font-semibold mt-10 mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
          >
            Refund Timeline
          </h2>
          <p className="text-base leading-8" style={{ fontFamily: "'DM Sans', sans-serif", color: "#334155" }}>
            Approved refunds are processed within 7 to 10 business days from the date of approval. Refunds are credited
            to the original payment source only. Reeve does not issue refunds via a different payment method than the
            one used for the original payment.
          </p>

          {/* Section 6 */}
          <h2
            className="text-lg font-semibold mt-10 mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
          >
            Security Deposit
          </h2>
          <p className="text-base leading-8" style={{ fontFamily: "'DM Sans', sans-serif", color: "#334155" }}>
            The security deposit is a separate amount from your confirmation payment. It is governed by the terms of
            your signed Leave and Licence Agreement and is not covered by this Refund Policy. Questions about security
            deposit return at move-out should be directed to your assigned Reeve representative.
          </p>

          {/* Section 7 */}
          <h2
            className="text-lg font-semibold mt-10 mb-3"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
          >
            Refund Disputes
          </h2>
          <p className="text-base leading-8" style={{ fontFamily: "'DM Sans', sans-serif", color: "#334155" }}>
            If you believe you are entitled to a refund and have not received one, or if you disagree with a refund
            decision, contact us at{" "}
            <a href="mailto:support@reeve.in" className="text-blue-600 hover:underline">
              support@reeve.in
            </a>
            . Include your application ID and a brief description of your query. We will respond within 5 business days.
          </p>

          {/* Page footer */}
          <hr className="mt-16 pt-8 border-t" style={{ borderColor: "#E2E8F0" }} />
          <div className="flex justify-between flex-wrap gap-4 mt-8">
            <span className="text-sm" style={{ color: "#64748B" }}>
              Questions? Email us at{" "}
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
    </Layout>
  );
};

export default Refund;
