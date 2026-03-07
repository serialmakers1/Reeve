import Layout from "@/components/Layout";

const Terms = () => {
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mb-6 text-sm text-muted-foreground">Last updated: March 2025</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">1. Platform Overview</h2>
            <p>
              REEVE is a rental management platform operated by Serial Makers Private Limited. We
              act as a marketplace connecting property owners with verified tenants and serve as a
              property manager on behalf of owners.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">2. Eligibility</h2>
            <p>
              You must be at least 18 years of age to use the REEVE platform. By creating an
              account, you confirm that you meet this requirement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">3. Service Fees</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>Tenants pay a service fee of 7% of monthly rent</li>
              <li>On lease renewal, the service fee reduces to 4% of monthly rent</li>
              <li>Property listing is free for owners</li>
              <li>There is no property management cost for owners</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">4. Security Deposit</h2>
            <p>
              The security deposit is capped at 1 month's rent. The deposit is held by the platform
              and refunded at lease end, subject to property condition assessment.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">5. Lease Terms</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>All leases are structured as 11-month leave and license agreements</li>
              <li>A 6-month lock-in period applies to all leases</li>
              <li>All agreements are executed digitally through the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">6. Communication Policy</h2>
            <p>
              All communication between tenants and owners must occur through the REEVE platform. Direct
              contact between parties outside the platform is not permitted during an active lease.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">7. Platform Liability</h2>
            <p>
              REEVE is not liable for the condition of any property beyond what is documented during
              pre-lease inspection. We conduct thorough inspections but cannot guarantee against
              undisclosed issues.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">8. Account Termination</h2>
            <p>
              REEVE reserves the right to suspend or terminate user accounts for misuse, fraudulent
              activity, violation of these terms, or any behaviour that harms the platform or its
              users.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">9. Dispute Resolution</h2>
            <p>
              Any disputes arising from the use of the platform shall be resolved through
              arbitration in Bangalore, Karnataka. The arbitration shall be conducted in accordance
              with the Arbitration and Conciliation Act, 1996.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">10. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the State of
              Karnataka, India.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">11. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
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

export default Terms;
