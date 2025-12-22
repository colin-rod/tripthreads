import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy | TripThreads',
  description:
    'Learn about the cookies and tracking technologies used by TripThreads and how to manage your preferences',
  robots: 'index, follow',
}

export default function CookiesPage() {
  const lastUpdated = 'December 20, 2024'

  return (
    <div className="container max-w-4xl py-12 space-y-8">
      <header>
        <h1 className="text-4xl font-semibold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
      </header>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
          <p className="mb-4 leading-relaxed">
            Cookies are small text files placed on your device when you visit a website. They help
            websites remember your preferences, analyze usage, and provide a personalized
            experience.
          </p>
          <p className="mb-4 leading-relaxed">
            Cookies can be &quot;session&quot; cookies (deleted when you close your browser) or
            &quot;persistent&quot; cookies (stored on your device until they expire or you delete
            them).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Why We Use Cookies</h2>
          <p className="mb-4 leading-relaxed">TripThreads uses cookies to:</p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>Keep you logged in securely (authentication)</li>
            <li>Remember your preferences and settings</li>
            <li>Analyze site performance and identify bugs</li>
            <li>Understand how you use our features to improve the Service</li>
            <li>Monitor errors and optimize user experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            3.1 Strictly Necessary Cookies (Always Active)
          </h3>
          <p className="mb-4 leading-relaxed">
            These cookies are essential for the Service to function. They cannot be disabled.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Provider</th>
                  <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                  <th className="px-4 py-2 text-left font-semibold">Expiry</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">sb-access-token</td>
                  <td className="px-4 py-2">Supabase</td>
                  <td className="px-4 py-2">User authentication</td>
                  <td className="px-4 py-2">1 hour</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">sb-refresh-token</td>
                  <td className="px-4 py-2">Supabase</td>
                  <td className="px-4 py-2">Session refresh</td>
                  <td className="px-4 py-2">30 days</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            3.2 Performance Cookies (Optional - Consent Required)
          </h3>
          <p className="mb-4 leading-relaxed">
            These cookies help us measure and improve site performance. You can opt out in cookie
            settings.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Provider</th>
                  <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                  <th className="px-4 py-2 text-left font-semibold">Expiry</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">_vercel_analytics_id</td>
                  <td className="px-4 py-2">Vercel</td>
                  <td className="px-4 py-2">
                    Page load times, Core Web Vitals, performance monitoring
                  </td>
                  <td className="px-4 py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            3.3 Functional Cookies (Optional - Consent Required)
          </h3>
          <p className="mb-4 leading-relaxed">
            These cookies enable enhanced functionality like error tracking and debugging.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Provider</th>
                  <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                  <th className="px-4 py-2 text-left font-semibold">Expiry</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">sentry-trace</td>
                  <td className="px-4 py-2">Sentry</td>
                  <td className="px-4 py-2">Error tracking and distributed tracing</td>
                  <td className="px-4 py-2">Session</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">baggage</td>
                  <td className="px-4 py-2">Sentry</td>
                  <td className="px-4 py-2">Session replay metadata (errors only)</td>
                  <td className="px-4 py-2">Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mb-3 mt-6">
            3.4 Analytics Cookies (Optional - Consent Required)
          </h3>
          <p className="mb-4 leading-relaxed">
            These cookies help us understand how you use the Service to improve features.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Provider</th>
                  <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                  <th className="px-4 py-2 text-left font-semibold">Expiry</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">ph_*</td>
                  <td className="px-4 py-2">PostHog</td>
                  <td className="px-4 py-2">
                    Feature usage tracking, user journeys, session recordings (Pro users + 10% Free)
                  </td>
                  <td className="px-4 py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
          <p className="mb-4 leading-relaxed">
            Some cookies are set by third-party services we integrate with:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Google OAuth:</strong> When you sign in with Google, Google may set cookies
              for authentication
            </li>
            <li>
              <strong>Stripe (upcoming):</strong> Payment processing and fraud prevention during
              checkout
            </li>
          </ul>
          <p className="mb-4 leading-relaxed">
            These services have their own privacy policies and cookie practices. We recommend
            reviewing them:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://posthog.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                PostHog Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Sentry Privacy Policy
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Managing Your Cookie Preferences</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.1 In-App Cookie Settings</h3>
          <p className="mb-4 leading-relaxed">
            You can manage your cookie preferences directly in TripThreads:
          </p>
          <ol className="list-decimal list-inside mb-4 space-y-2 ml-4">
            <li>Go to Settings → Cookie Preferences</li>
            <li>Toggle categories on/off (Performance, Functional, Analytics)</li>
            <li>Click &quot;Save Preferences&quot;</li>
            <li>Refresh the page for changes to take effect</li>
          </ol>
          <p className="mb-4 leading-relaxed">
            You can also manage cookies through the cookie banner that appears on your first visit.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Browser Settings</h3>
          <p className="mb-4 leading-relaxed">
            All modern browsers allow you to control cookies through settings:
          </p>

          <h4 className="text-lg font-semibold mb-2 mt-4">Google Chrome</h4>
          <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">
            <li>Settings → Privacy and security → Cookies and other site data</li>
            <li>Choose &quot;Block third-party cookies&quot; or &quot;Block all cookies&quot;</li>
            <li>To delete existing cookies, click &quot;See all site data and permissions&quot;</li>
          </ol>

          <h4 className="text-lg font-semibold mb-2 mt-4">Mozilla Firefox</h4>
          <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">
            <li>Settings → Privacy & Security</li>
            <li>Under &quot;Enhanced Tracking Protection&quot;, select &quot;Strict&quot;</li>
            <li>To manage cookies, click &quot;Manage Data&quot; under Cookies and Site Data</li>
          </ol>

          <h4 className="text-lg font-semibold mb-2 mt-4">Safari</h4>
          <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">
            <li>Preferences → Privacy</li>
            <li>Check &quot;Block all cookies&quot; or customize tracking prevention</li>
            <li>Click &quot;Manage Website Data&quot; to view and delete cookies</li>
          </ol>

          <h4 className="text-lg font-semibold mb-2 mt-4">Microsoft Edge</h4>
          <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">
            <li>Settings → Cookies and site permissions</li>
            <li>Click &quot;Manage and delete cookies and site data&quot;</li>
            <li>Toggle &quot;Block third-party cookies&quot;</li>
          </ol>

          <p className="mb-4 leading-relaxed mt-6">
            <strong>Note:</strong> Blocking all cookies will prevent you from logging into
            TripThreads. Strictly necessary cookies are required for authentication.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Do Not Track (DNT)</h2>
          <p className="mb-4 leading-relaxed">
            We honor Do Not Track (DNT) browser signals. If your browser sends a DNT signal, we
            will:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Not load</strong> optional analytics cookies (PostHog, Sentry)
            </li>
            <li>
              <strong>Continue to use</strong> strictly necessary cookies for authentication
            </li>
            <li>
              <strong>Respect</strong> Vercel Analytics&apos; built-in DNT handling (passive
              collection)
            </li>
          </ul>
          <p className="mb-4 leading-relaxed">
            To enable DNT, check your browser settings under Privacy or Do Not Track.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Cookie Retention</h2>
          <p className="mb-4 leading-relaxed">
            Different cookies have different retention periods:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>
              <strong>Session cookies:</strong> Deleted when you close your browser
            </li>
            <li>
              <strong>Short-term cookies:</strong> Authentication (1 hour), error tracking (session)
            </li>
            <li>
              <strong>Long-term cookies:</strong> Session refresh (30 days), analytics (1 year)
            </li>
          </ul>
          <p className="mb-4 leading-relaxed">
            You can delete cookies manually at any time through your browser settings or our in-app
            cookie preferences.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Updates to This Policy</h2>
          <p className="mb-4 leading-relaxed">
            We may update this Cookie Policy from time to time to reflect changes in our cookie
            usage or legal requirements. When we update the policy:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
            <li>The &quot;Last updated&quot; date at the top will change</li>
            <li>
              If we add new cookie categories requiring consent, we&apos;ll notify you via the
              cookie banner
            </li>
            <li>You can review the current policy at any time at tripthreads.com/cookies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Questions and Contact</h2>
          <p className="mb-4 leading-relaxed">
            If you have questions about our use of cookies, please contact us:
          </p>
          <ul className="list-none mb-4 space-y-2">
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:support@tripthreads.com" className="text-primary hover:underline">
                support@tripthreads.com
              </a>
            </li>
            <li>
              <strong>Settings:</strong> Manage cookies in Settings → Cookie Preferences
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
