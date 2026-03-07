import Layout from "@/components/Layout";

const Refund = () => {
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Refund Policy</h1>
        <p className="mb-6 text-sm text-muted-foreground">Last updated: March 2025</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">1. KYC Verification Failure</h2>
            <p>
              If a tenant's KYC verification fails after the confirmation payment has been made, a
              full refund will be processed minus a non-refundable service charge plus applicable
              GST. Refunds will be processed within 7–10 business days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">2. Security Deposit Refund</h2>
            <p>
              The security deposit (1 month's rent) is fully refundable at the end of the lease
              period, subject to a property condition assessment. Any damages beyond normal wear and
              tear may be deducted from the deposit amount.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">3. Service Fee</h2>
            <p>
              Service fees for completed lease months are non-refundable. The 7% monthly service fee
              covers platform services including rent collection, maintenance coordination, and
              tenant support for that period.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">4. Refund Method</h2>
            <p>
              All refunds will be processed to the original payment method used for the transaction.
              Bank transfers may take an additional 2–3 business days to reflect in your account.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">5. Contact</h2>
            <p>
              For refund queries or to initiate a refund request, contact us at{" "}
              <a href="mailto:support@reeve.in" className="text-primary hover:underline">
                support@reeve.in
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Refund;
