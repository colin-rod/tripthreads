import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | TripThreads',
  description: 'Terms and conditions for using TripThreads collaborative trip planning platform',
  robots: 'index, follow',
}

export default function TermsPage() {
  const lastUpdated = 'December 20, 2024'

  return (
    <div className="container max-w-4xl py-12 space-y-8">
      <header>
        <h1 className="text-4xl font-semibold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
      </header>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4 leading-relaxed">
            By accessing or using TripThreads (&quot;Service&quot;), you agree to be bound by these
            Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the
            Service.
          </p>
          <p className="mb-4 leading-relaxed">
            These Terms apply to all users of the Service, including without limitation users who
            are browsers, contributors, and/or participants in the trip planning features.
          </p>
          <p className="mb-4 leading-relaxed">
            You must be at least 13 years old to use this Service. If you are under 16 and reside in
            the European Union, you must have parental or guardian consent to use this Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="mb-4 leading-relaxed">
            TripThreads is a collaborative trip planning platform that enables users to:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Create and manage trips with multiple participants</li>
            <li>Track and split expenses with automatic currency conversion</li>
            <li>Build shared itineraries with flights, accommodations, and activities</li>
            <li>Chat with AI assistance and trip participants</li>
            <li>Share photos and memories (upcoming feature)</li>
            <li>Generate trip recaps and reports (upcoming feature)</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            The Service is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis. We
            reserve the right to modify, suspend, or discontinue the Service at any time without
            notice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <p className="mb-4 leading-relaxed">
            To use certain features of the Service, you must create an account. You agree to:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information to keep it accurate</li>
            <li>Maintain the security of your password</li>
            <li>Accept all responsibility for activity that occurs under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            We reserve the right to suspend or terminate your account if we believe you have
            violated these Terms or engaged in fraudulent or illegal activity.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. User Content</h2>
          <p className="mb-4 leading-relaxed">
            You retain ownership of any content you submit to the Service, including trip details,
            expenses, messages, photos, and itinerary items (&quot;User Content&quot;). By
            submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license
            to use, reproduce, modify, and distribute your User Content solely to provide and
            improve the Service.
          </p>
          <p className="mb-4 leading-relaxed">You represent and warrant that:</p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>You own or have the necessary rights to your User Content</li>
            <li>Your User Content does not violate any third-party rights</li>
            <li>Your User Content complies with these Terms and applicable laws</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            We reserve the right to remove any User Content that violates these Terms or is
            otherwise objectionable.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
          <p className="mb-4 leading-relaxed">
            The Service and its original content (excluding User Content), features, and
            functionality are owned by TripThreads and are protected by international copyright,
            trademark, patent, trade secret, and other intellectual property laws.
          </p>
          <p className="mb-4 leading-relaxed">
            You may not copy, modify, distribute, sell, or lease any part of our Service or included
            software, nor may you reverse engineer or attempt to extract the source code of that
            software, unless laws prohibit these restrictions or you have our written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Prohibited Uses</h2>
          <p className="mb-4 leading-relaxed">You agree not to:</p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Harass, abuse, threaten, or intimidate other users</li>
            <li>
              Submit false, misleading, or fraudulent information (including fake expense claims)
            </li>
            <li>Impersonate any person or entity</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Attempt to gain unauthorized access to any portion of the Service</li>
            <li>
              Use any automated system (bots, scrapers) to access the Service without permission
            </li>
            <li>Upload viruses, malware, or other malicious code</li>
            <li>Spam or send unsolicited messages to other users</li>
            <li>Collect or store personal data about other users without consent</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Payment Terms</h2>
          <p className="mb-4 leading-relaxed">
            TripThreads offers both Free and Pro subscription tiers. Payment terms include:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Free Tier:</strong> Limited to 5 participants per trip and 50 photos per trip
            </li>
            <li>
              <strong>Pro Tier:</strong> Unlimited participants and photos, PDF trip recaps, and
              priority support
            </li>
            <li>Subscription fees are charged monthly or annually in advance</li>
            <li>Payments are processed securely through Stripe</li>
            <li>
              You authorize us to charge your payment method for all fees incurred under your
              account
            </li>
            <li>All fees are non-refundable except as required by law</li>
            <li>We may change pricing with 30 days notice to active subscribers</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            If payment fails, we may suspend or terminate your Pro subscription, downgrading you to
            the Free tier.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Data and Privacy</h2>
          <p className="mb-4 leading-relaxed">
            Your privacy is important to us. Our{' '}
            <Link href="/privacy" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>{' '}
            explains how we collect, use, and protect your personal information. By using the
            Service, you agree to our Privacy Policy.
          </p>
          <p className="mb-4 leading-relaxed">Key privacy points:</p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>We are GDPR compliant and respect your data rights</li>
            <li>You have the right to access, correct, or delete your personal data</li>
            <li>You can export all your data in machine-readable format</li>
            <li>We use cookies and tracking technologies (see Cookie Policy)</li>
            <li>Your trip data is shared only with trip participants you invite</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
          <p className="mb-4 leading-relaxed">
            The Service integrates with third-party services to provide functionality:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Supabase:</strong> Database hosting and authentication
            </li>
            <li>
              <strong>OpenAI:</strong> Natural language processing for expense parsing and chat
              assistance
            </li>
            <li>
              <strong>Stripe:</strong> Payment processing for Pro subscriptions
            </li>
            <li>
              <strong>PostHog:</strong> Product analytics and usage tracking (with your consent)
            </li>
            <li>
              <strong>Sentry:</strong> Error monitoring and debugging (with your consent)
            </li>
            <li>
              <strong>Vercel:</strong> Hosting and content delivery
            </li>
            <li>
              <strong>Resend:</strong> Transactional email delivery
            </li>
            <li>
              <strong>OpenExchangeRates:</strong> Currency conversion rates
            </li>
          </ul>
          <p className="mb-4 leading-relaxed">
            These third-party services have their own terms and privacy policies. We are not
            responsible for their practices or content.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Disclaimers and Warranties</h2>
          <p className="mb-4 leading-relaxed">
            <strong>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.
            </strong>{' '}
            We disclaim all warranties, express or implied, including:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Warranties of merchantability and fitness for a particular purpose</li>
            <li>That the Service will be uninterrupted, secure, or error-free</li>
            <li>That currency conversion rates are always accurate or up-to-date</li>
            <li>That AI-generated content (expense parsing, chat) is always accurate</li>
            <li>That backups or data storage are failsafe</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            <strong>Travel Disclaimer:</strong> TripThreads is a planning tool only. We do not book
            flights, hotels, or activities. We are not responsible for travel arrangements,
            cancellations, delays, or any issues that arise during your trip.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
          <p className="mb-4 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRIPTHREADS SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
            PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
            GOODWILL, OR OTHER INTANGIBLE LOSSES.
          </p>
          <p className="mb-4 leading-relaxed">
            Our total liability shall not exceed the amount you paid to us in the 12 months prior to
            the event giving rise to liability, or €100, whichever is greater.
          </p>
          <p className="mb-4 leading-relaxed">
            Some jurisdictions do not allow the exclusion of certain warranties or limitations of
            liability. In such cases, our liability will be limited to the extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
          <p className="mb-4 leading-relaxed">
            You agree to indemnify, defend, and hold harmless TripThreads, its officers, directors,
            employees, and agents from any claims, damages, losses, liabilities, and expenses
            (including legal fees) arising from:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another user or third party</li>
            <li>Your User Content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Termination</h2>
          <p className="mb-4 leading-relaxed">
            We may terminate or suspend your account and access to the Service immediately, without
            prior notice or liability, for any reason, including:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Breach of these Terms</li>
            <li>Fraudulent or illegal activity</li>
            <li>Request by law enforcement</li>
            <li>Extended periods of inactivity</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            Upon termination, your right to use the Service will immediately cease. You may delete
            your account at any time through the Settings page. Trip data you created may be
            retained to preserve trip history for other participants, but your personal information
            will be anonymized.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">14. Dispute Resolution and Governing Law</h2>
          <p className="mb-4 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of Ireland,
            without regard to its conflict of law provisions.
          </p>
          <p className="mb-4 leading-relaxed">
            Any dispute arising from these Terms or the Service shall be resolved through:
          </p>
          <ol className="list-decimal list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Negotiation:</strong> We encourage you to contact us first to resolve any
              issues informally
            </li>
            <li>
              <strong>Mediation:</strong> If negotiation fails, disputes may be submitted to
              mediation
            </li>
            <li>
              <strong>Jurisdiction:</strong> The courts of Ireland shall have exclusive jurisdiction
            </li>
          </ol>
          <p className="mb-4 leading-relaxed">
            European Union users may also have the right to lodge a complaint with their local data
            protection authority.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
          <p className="mb-4 leading-relaxed">
            We reserve the right to modify these Terms at any time. If we make material changes, we
            will notify you by:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              Posting the new Terms on this page with an updated &quot;Last updated&quot; date
            </li>
            <li>Sending an email to the address associated with your account</li>
            <li>Displaying a prominent notice in the Service</li>
          </ul>
          <p className="mb-4 leading-relaxed">
            Changes will take effect 30 days after posting unless you are notified otherwise. Your
            continued use of the Service after changes take effect constitutes acceptance of the new
            Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">16. Severability</h2>
          <p className="mb-4 leading-relaxed">
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            shall be limited or eliminated to the minimum extent necessary, and the remaining
            provisions shall remain in full force and effect.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">17. Contact Information</h2>
          <p className="mb-4 leading-relaxed">
            If you have any questions about these Terms, please contact us:
          </p>
          <ul className="list-none mb-4 space-y-2">
            <li>
              Email:{' '}
              <a href="mailto:support@tripthreads.com" className="text-primary hover:underline">
                support@tripthreads.com
              </a>
            </li>
            <li>Website: tripthreads.com</li>
          </ul>
        </section>
      </div>

      <footer className="border-t pt-8 mt-12">
        <p className="text-sm text-muted-foreground">
          For questions about these terms, contact us at{' '}
          <a
            href="mailto:support@tripthreads.com"
            className="text-primary hover:underline font-medium"
          >
            support@tripthreads.com
          </a>
        </p>
      </footer>
    </div>
  )
}
