export const metadata = {
  title: 'Terms of Service - TRDE',
  description: 'TRDE Terms of Service',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-black mb-8">Terms of Service</h1>
        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using TRDE (&quot;the Service&quot;), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to these Terms of Service, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">2. Description of Service</h2>
            <p>
              TRDE is a trading journal platform that allows users to record, track, and analyze trading activities. 
              The Service includes features such as trade logging, strategy management, analytics, and reporting tools.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-semibold text-black mb-3">3.1 Account Creation</h3>
            <p>
              You must create an account to use the Service. You are responsible for maintaining the confidentiality 
              of your account credentials and for all activities that occur under your account.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">3.2 Account Security</h3>
            <p>
              You agree to notify us immediately of any unauthorized use of your account or any other breach of security. 
              We are not liable for any loss or damage arising from your failure to protect your account credentials.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">4. Subscription and Payment</h2>
            <h3 className="text-xl font-semibold text-black mb-3">4.1 Subscription Plans</h3>
            <p>
              The Service offers subscription plans with varying features and pricing. Subscription fees are billed 
              in advance on a recurring basis (monthly or annually, as selected).
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.2 Payment Processing</h3>
            <p>
              Payments are processed through Stripe. By subscribing, you agree to Stripe&apos;s terms of service and 
              privacy policy. All fees are non-refundable except as required by law or as explicitly stated.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">4.3 Cancellation</h3>
            <p>
              You may cancel your subscription at any time through your account settings. Cancellation will take effect 
              at the end of your current billing period. You will continue to have access to paid features until the 
              end of the billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">5. User Content and Data</h2>
            <h3 className="text-xl font-semibold text-black mb-3">5.1 Ownership</h3>
            <p>
              You retain ownership of all data and content you upload or create through the Service. By using the Service, 
              you grant us a limited license to store, process, and display your content as necessary to provide the Service.
            </p>

            <h3 className="text-xl font-semibold text-black mb-3 mt-6">5.2 Data Accuracy</h3>
            <p>
              You are solely responsible for the accuracy and completeness of the data you enter into the Service. 
              We are not responsible for any errors, omissions, or inaccuracies in your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws or regulations in your jurisdiction</li>
              <li>Infringe upon the rights of others</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">7. Intellectual Property</h2>
            <p>
              The Service, including its design, features, functionality, and content (except user content), is owned by 
              TRDE and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, 
              or create derivative works of the Service without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES of MERCHANTABILITY, FITNESS FOR A 
              PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="mt-4">
              We do not guarantee that the Service will be uninterrupted, secure, or error-free. The Service may 
              experience downtime for maintenance or due to unforeseen circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRDE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR 
              INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="mt-4">
              Our total liability for any claims arising from or related to the Service shall not exceed the amount 
              you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">10. Trading Disclaimer</h2>
            <p>
              TRDE is a trading journal tool and does not provide trading advice, investment recommendations, or 
              financial services. All trading decisions are your own responsibility. Past performance does not guarantee 
              future results. Trading involves substantial risk of loss.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">11. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service immediately, without prior notice, 
              for any breach of these Terms of Service. Upon termination, your right to use the Service will cease 
              immediately, though you may export your data before termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. We will notify users of material 
              changes by posting the updated terms on this page and updating the &quot;Last updated&quot; date. 
              Your continued use of the Service after changes become effective constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">13. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with applicable laws, without 
              regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-black mb-4">14. Contact Information</h2>
            <p>
              If you have questions about these Terms of Service, please contact us through our 
              <a href="/support" className="text-black underline"> support channels</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
