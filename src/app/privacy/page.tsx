import Header from '../components/Header';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <Header showBackButton={true} />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: January 11, 2025</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-600 leading-relaxed">
                At NexVision (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our AI-powered 
                exterior home transformation service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Images You Upload</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
                <li>Photos of your home&apos;s exterior that you voluntarily upload for transformation</li>
                <li>These images are processed by our AI system to generate transformations</li>
                <li>Images are temporarily stored during processing and automatically deleted after 24 hours</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
                <li>Number of transformations used (for credit tracking)</li>
                <li>Transformation prompts and descriptions you provide</li>
                <li>Technical information like IP address, browser type, and device information</li>
                <li>Usage patterns and preferences to improve our service</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Payment Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>When you upgrade to Pro, payment processing is handled by secure third-party providers</li>
                <li>We do not store your credit card information on our servers</li>
                <li>We only receive confirmation of successful payments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Service Delivery:</strong> Process your images and generate AI transformations</li>
                <li><strong>Account Management:</strong> Track your credit usage and subscription status</li>
                <li><strong>Service Improvement:</strong> Analyze usage patterns to enhance our AI and user experience</li>
                <li><strong>Customer Support:</strong> Respond to your questions and provide technical assistance</li>
                <li><strong>Legal Compliance:</strong> Meet legal obligations and protect against fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>All data transmission is encrypted using SSL/TLS protocols</li>
                <li>Images are processed in secure, isolated environments</li>
                <li>Automatic deletion of uploaded images within 24 hours</li>
                <li>Regular security audits and updates</li>
                <li>Access controls limiting who can view your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sharing</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not sell, rent, or share your personal information with third parties, except:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Service Providers:</strong> Trusted partners who help us operate our service (AI processing, payment processing, hosting)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Access:</strong> Request information about the data we have about you</li>
                <li><strong>Correction:</strong> Ask us to correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Objection:</strong> Object to certain uses of your data</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                To exercise these rights, contact us at <a href="mailto:privacy@nexvision.app" className="text-blue-600 hover:text-blue-700">privacy@nexvision.app</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use minimal cookies and tracking technologies:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Essential Cookies:</strong> Required for the service to function properly</li>
                <li><strong>Analytics:</strong> Help us understand how users interact with our service</li>
                <li><strong>Preferences:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                You can control cookies through your browser settings, though this may affect service functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                NexVision is not intended for children under 13. We do not knowingly collect personal information 
                from children under 13. If you believe we have collected information from a child under 13, 
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">International Users</h2>
              <p className="text-gray-600 leading-relaxed">
                NexVision is operated from the United States. If you are accessing our service from outside the US, 
                please be aware that your information may be transferred to, stored, and processed in the United States 
                where our servers are located and our central database is operated.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any changes by posting 
                the new privacy policy on this page and updating the &quot;Last updated&quot; date. We encourage you to 
                review this privacy policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have any questions about this privacy policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-600 mb-2"><strong>Email:</strong> <a href="mailto:privacy@nexvision.app" className="text-blue-600 hover:text-blue-700">privacy@nexvision.app</a></p>
                <p className="text-gray-600 mb-2"><strong>Support:</strong> <a href="mailto:support@nexvision.app" className="text-blue-600 hover:text-blue-700">support@nexvision.app</a></p>
                <p className="text-gray-600"><strong>Response Time:</strong> We typically respond within 24-48 hours</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
