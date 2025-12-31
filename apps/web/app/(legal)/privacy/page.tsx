import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | TripThreads',
  description:
    'Learn how TripThreads collects, uses, and protects your personal data in compliance with GDPR',
  robots: 'index, follow',
}

export default function PrivacyPage() {
  const lastUpdated = 'December 20, 2024'

  return (
    <div className="container max-w-4xl py-12 space-y-8">
      <header>
        <h1 className="text-4xl font-semibold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
      </header>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="mb-4 leading-relaxed">
            TripThreads (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to
            protecting your personal data and your right to privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our
            collaborative trip planning service.
          </p>
          <p className="mb-4 leading-relaxed">
            <strong>Data Controller:</strong> TripThreads Ltd, Ireland
          </p>
          <p className="mb-4 leading-relaxed">
            This policy complies with the EU General Data Protection Regulation (GDPR) and other
            applicable data protection laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Account Information</h3>
          <p className="mb-4 leading-relaxed">When you create an account, we collect:</p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Full name</li>
            <li>Email address</li>
            <li>Password (encrypted)</li>
            <li>Profile picture/avatar (optional)</li>
            <li>Subscription tier (Free or Pro)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Trip Data</h3>
          <p className="mb-4 leading-relaxed">
            When you use our trip planning features, we collect:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Trip names, descriptions, and dates</li>
            <li>Itinerary items (flights, stays, activities) with locations and times</li>
            <li>Expenses and payment information (who paid, amounts, currencies)</li>
            <li>Participant roles and permissions</li>
            <li>Chat messages and AI conversation history</li>
            <li>Photos and videos shared within trips (upcoming feature)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Usage Data</h3>
          <p className="mb-4 leading-relaxed">
            We automatically collect certain information when you use the Service:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>IP address and geolocation (country-level)</li>
            <li>Device type, browser type, and operating system</li>
            <li>Pages visited and features used</li>
            <li>Session duration and interaction timestamps</li>
            <li>Referral source (how you found us)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Payment Information</h3>
          <p className="mb-4 leading-relaxed">
            For Pro subscriptions, payment processing is handled by Stripe. We do not store your
            credit card numbers. We retain:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Stripe customer ID</li>
            <li>Last 4 digits of card (for reference)</li>
            <li>Billing history and invoices</li>
            <li>Subscription status and renewal dates</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.5 Cookies and Tracking</h3>
          <p className="mb-4 leading-relaxed">
            We use cookies and similar tracking technologies. See our{' '}
            <Link href="/cookies" className="text-primary hover:underline font-medium">
              Cookie Policy
            </Link>{' '}
            for details. Categories include:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Strictly Necessary:</strong> Authentication, security (required)
            </li>
            <li>
              <strong>Performance:</strong> Vercel Analytics for site performance (optional)
            </li>
            <li>
              <strong>Functional:</strong> Sentry for error tracking (optional)
            </li>
            <li>
              <strong>Analytics:</strong> PostHog for usage analytics (optional)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
          <p className="mb-4 leading-relaxed">We use your personal data to:</p>

          <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Provide the Service</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Create and manage your account</li>
            <li>Enable trip collaboration with other users</li>
            <li>Process and display expenses with currency conversion</li>
            <li>Calculate settlements and debt optimization</li>
            <li>Deliver AI-powered features (expense parsing, chat assistance)</li>
            <li>Send transactional emails (trip invites, notifications)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Improve and Personalize</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Analyze usage patterns to improve features</li>
            <li>Identify and fix bugs and errors</li>
            <li>Develop new features based on user behavior</li>
            <li>Personalize your experience and recommendations</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Communicate</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Send trip-related notifications (new expenses, itinerary changes)</li>
            <li>Respond to your support requests</li>
            <li>Send important service updates and policy changes</li>
            <li>Marketing communications (only with your consent, can opt out anytime)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Security and Compliance</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Detect and prevent fraud, spam, and abuse</li>
            <li>Monitor for security threats</li>
            <li>Comply with legal obligations and law enforcement requests</li>
            <li>Enforce our Terms of Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Legal Basis for Processing (GDPR)</h2>
          <p className="mb-4 leading-relaxed">
            Under GDPR, we process your data based on the following legal grounds:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Contract Performance (Art. 6(1)(b)):</strong> Processing necessary to provide
              the Service you signed up for (account, trips, expenses)
            </li>
            <li>
              <strong>Legitimate Interest (Art. 6(1)(f)):</strong> Analytics, security, fraud
              prevention, service improvement
            </li>
            <li>
              <strong>Consent (Art. 6(1)(a)):</strong> Optional cookies, marketing communications,
              photo sharing
            </li>
            <li>
              <strong>Legal Obligation (Art. 6(1)(c)):</strong> Compliance with tax, financial, or
              law enforcement requirements
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Third Parties</h2>
          <p className="mb-4 leading-relaxed">
            We share your data with third-party service providers who help us operate the Service:
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Infrastructure and Hosting</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Supabase (EU region):</strong> Database, authentication, file storage
            </li>
            <li>
              <strong>Vercel (US with EU DPA):</strong> Web hosting, CDN, serverless functions
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.2 AI and Processing</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>OpenAI (US):</strong> Natural language processing for expense parsing and chat
              assistance. Data sent to OpenAI is anonymized (no names/emails) and not used for model
              training per OpenAI&apos;s API terms
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Payments</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Stripe (PCI DSS compliant):</strong> Payment processing, subscription
              management. Stripe has its own Privacy Policy
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.4 Analytics and Monitoring</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>PostHog (with consent):</strong> Product analytics, feature usage, session
              replays (Pro users + 10% Free). Data anonymized where possible
            </li>
            <li>
              <strong>Sentry (with consent):</strong> Error monitoring, performance tracking
            </li>
            <li>
              <strong>Vercel Analytics:</strong> Core Web Vitals, page performance (respects DNT)
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.5 Communications</h3>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Resend:</strong> Transactional email delivery (invites, notifications)
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.6 Other Disclosures</h3>
          <p className="mb-4 leading-relaxed">We may disclose your data if:</p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Required by law or legal process</li>
            <li>Necessary to protect our rights, property, or safety</li>
            <li>In connection with a merger, acquisition, or asset sale (with notice)</li>
            <li>With your explicit consent</li>
          </ul>

          <p className="mb-4 leading-relaxed">
            <strong>We never sell your personal data to third parties.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p className="mb-4 leading-relaxed">We retain your data for as long as:</p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Active accounts:</strong> Indefinitely while your account is active
            </li>
            <li>
              <strong>Deleted accounts:</strong> 30 days (soft delete with anonymization), then
              permanent deletion
            </li>
            <li>
              <strong>Backups:</strong> Up to 90 days in encrypted backups
            </li>
            <li>
              <strong>Analytics:</strong> 12 months (PostHog), aggregated data may be retained
              longer
            </li>
            <li>
              <strong>Financial records:</strong> 7 years (legal requirement for tax compliance)
            </li>
            <li>
              <strong>Trip data:</strong> Preserved for other participants even if you leave a trip
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Your Rights (GDPR)</h2>
          <p className="mb-4 leading-relaxed">Under GDPR, you have the following rights:</p>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Right of Access (Art. 15)</h3>
          <p className="mb-4 leading-relaxed">
            Request a copy of your personal data. Use our <strong>Data Export feature</strong> in
            Settings to download all your data in JSON or CSV format.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Right to Rectification (Art. 16)</h3>
          <p className="mb-4 leading-relaxed">
            Correct inaccurate data through your Profile settings or contact support.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Right to Erasure (Art. 17)</h3>
          <p className="mb-4 leading-relaxed">
            Delete your account and personal data through Settings → Security →{' '}
            <strong>Delete Account</strong>. Note: Trip data you created may be retained for other
            participants, but your personal information will be anonymized.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            7.4 Right to Data Portability (Art. 20)
          </h3>
          <p className="mb-4 leading-relaxed">
            Download your data in machine-readable format (JSON/CSV) via the Data Export feature.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.5 Right to Object (Art. 21)</h3>
          <p className="mb-4 leading-relaxed">
            Object to processing based on legitimate interest (e.g., analytics, marketing). Manage
            cookie preferences in Settings.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            7.6 Right to Withdraw Consent (Art. 7)
          </h3>
          <p className="mb-4 leading-relaxed">
            Withdraw consent for optional cookies, marketing, or other consent-based processing.
            Change cookie preferences anytime in Settings.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">7.7 Right to Lodge a Complaint</h3>
          <p className="mb-4 leading-relaxed">
            If you believe we&apos;ve mishandled your data, you can complain to your local data
            protection authority. In Ireland, contact the{' '}
            <a
              href="https://www.dataprotection.ie/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Data Protection Commission (DPC)
            </a>
            .
          </p>

          <p className="mb-4 leading-relaxed mt-6">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:support@tripthreads.app" className="text-primary hover:underline">
              support@tripthreads.app
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Data Security</h2>
          <p className="mb-4 leading-relaxed">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Encryption:</strong> TLS 1.3 for data in transit, AES-256 for data at rest
            </li>
            <li>
              <strong>Authentication:</strong> Bcrypt password hashing, secure session management
            </li>
            <li>
              <strong>Access Control:</strong> Row-Level Security (RLS) ensures users only access
              their own data and trips they&apos;re invited to
            </li>
            <li>
              <strong>Monitoring:</strong> Real-time security alerts, regular vulnerability scans
            </li>
            <li>
              <strong>Infrastructure:</strong> Hosted in secure, certified data centers (ISO 27001,
              SOC 2)
            </li>
          </ul>
          <p className="mb-4 leading-relaxed">
            However, no method of transmission over the internet is 100% secure. We cannot guarantee
            absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
          <p className="mb-4 leading-relaxed">
            Your data is primarily stored in the European Union (Supabase EU region). When we
            transfer data outside the EU, we ensure:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Adequacy Decisions:</strong> Transfers to countries approved by the EU
              Commission
            </li>
            <li>
              <strong>Standard Contractual Clauses (SCCs):</strong> With US providers like Vercel,
              OpenAI
            </li>
            <li>
              <strong>Data Processing Agreements:</strong> All third parties sign DPAs with GDPR
              compliance
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Children&apos;s Privacy</h2>
          <p className="mb-4 leading-relaxed">
            Our Service is not intended for children under 13 (COPPA). If you are under 16 and
            reside in the EU, you must have parental or guardian consent.
          </p>
          <p className="mb-4 leading-relaxed">
            If we discover we&apos;ve collected data from a child without proper consent, we will
            delete it immediately. Contact us if you believe we have such data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Do Not Track (DNT)</h2>
          <p className="mb-4 leading-relaxed">
            We honor Do Not Track browser signals. If DNT is enabled, we will not load optional
            analytics cookies (PostHog, Sentry). Strictly necessary cookies for authentication
            remain active.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
          <p className="mb-4 leading-relaxed">
            We may update this Privacy Policy from time to time. If we make material changes, we
            will notify you by:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Updating the &quot;Last updated&quot; date at the top</li>
            <li>Sending an email to your registered email address</li>
            <li>Displaying a prominent notice in the Service</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            Changes take effect 30 days after notification. Continued use after that date
            constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
          <p className="mb-4 leading-relaxed">
            For questions about this Privacy Policy or to exercise your rights, contact:
          </p>
          <ul className="list-none mb-4 space-y-2">
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:support@tripthreads.app" className="text-primary hover:underline">
                support@tripthreads.app
              </a>
            </li>
            <li>
              <strong>Data Protection Officer:</strong> (if required, to be appointed)
            </li>
            <li>
              <strong>Website:</strong> tripthreads.app
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
