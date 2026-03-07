import Layout from "@/components/Layout";

const Privacy = () => {
  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-6 text-sm text-muted-foreground">Last updated: March 2025</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>
              Serial Makers Private Limited ("REEVE," "we," "us," or "our") operates the REEVE
              rental platform. This Privacy Policy explains how we collect, use, store, and protect
              your personal data when you use our services.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">2. Data We Collect</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>Full name, phone number, and email address</li>
              <li>Aadhaar number and PAN (for identity verification)</li>
              <li>Employment details and income information</li>
              <li>Property details (for owners listing properties)</li>
              <li>Payment and transaction data</li>
              <li>Device and usage data (IP address, browser type, pages visited)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">3. Why We Collect Data</h2>
            <ul className="ml-4 list-disc space-y-1">
              <li>Identity verification and KYC compliance</li>
              <li>Tenant screening and background checks</li>
              <li>Rent collection and payment processing</li>
              <li>Communication regarding your lease and property</li>
              <li>Improving our platform and services</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">4. Data Storage & Security</h2>
            <p>
              All personal data is encrypted in transit and at rest. We use cloud-hosted
              infrastructure with industry-standard security measures including firewalls, access
              controls, and regular security audits.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">5. Third-Party Sharing</h2>
            <p>We may share your personal data with:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Property owners (tenant application details, for tenants)</li>
              <li>Payment processors for rent and deposit transactions</li>
              <li>Government authorities as required by applicable law</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to any third party.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              6. Your Rights (Digital Personal Data Protection Act, 2023)
            </h2>
            <p>Under India's DPDP Act 2023, you have the right to:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Access your personal data held by us</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your personal data</li>
              <li>Withdraw consent for data processing</li>
              <li>Nominate another person to exercise your rights</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">7. Data Retention</h2>
            <p>
              We retain your personal data for the duration of your active lease plus 3 years
              thereafter, unless a longer retention period is required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">8. Cookies</h2>
            <p>
              We use basic analytics cookies to understand how users interact with our platform.
              These cookies do not collect personally identifiable information. You can disable
              cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">9. Contact Us</h2>
            <p>
              For any data-related concerns or to exercise your rights, contact us at{" "}
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

export default Privacy;
