export const metadata = {
  title: 'Privacy Policy - TRDE',
  description: 'TRDE Privacy Policy',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-black mb-8">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">1. Introduction</h2>
            <p>
              TRDE (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
              our trading journal platform and related services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-black mb-3">2.1 Account Information</h3>
            <p>
              When you create an account, we collect information such as your name, email address, and authentication 
              credentials through our authentication provider (Clerk).
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.2 Trading Data</h3>
            <p>
              We store your trading data including trades, strategies, analytics, journals, and other information you 
              voluntarily provide through the platform. This data is stored securely in our database.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.3 Payment Information</h3>
            <p>
              Payment processing is handled by Stripe. We do not store your credit card information. Stripe handles 
              all payment data according to their privacy policy and PCI-DSS compliance standards.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">2.4 Usage Data</h3>
            <p>
              We may collect information about how you interact with our platform, including features used, pages visited, 
              and time spent on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send you service-related communications</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption and security measures. We use Supabase 
              for data storage, which provides enterprise-grade security and compliance standards.
            </p>
            <p className="mt-4">
              While we implement appropriate security measures, no method of transmission over the Internet or electronic 
              storage is 100% secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">5. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With service providers who assist us in operating our platform (e.g., Stripe for payments, Clerk for authentication)</li>
              <li>When required by law or to protect our rights and safety</li>
              <li>In connection with a business transfer or merger (with notice to users)</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">6. Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and review your personal data</li>
              <li>Update or correct your information through your account settings</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications (you can unsubscribe from marketing emails)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to maintain your session, remember your preferences, 
              and analyze usage patterns. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">8. Children&apos;s Privacy</h2>
            <p>
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal 
              information from children. If you believe we have collected information from a child, please contact us 
              immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by 
              posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us through our 
              support channels at <a href="/support" className="text-black underline">support@trde.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
