import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container max-w-7xl py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg
              className="h-8 w-8 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="font-semibold text-lg">TripThreads</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Make memories, not spreadsheets — travel made simple.
          </p>
        </div>

        {/* Product */}
        <div>
          <h3 className="font-semibold mb-4">Product</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <Link
                href="/trips"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Trips
              </Link>
            </li>
            <li>
              <Link
                href="/#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="font-semibold mb-4">Legal</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/cookies"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="font-semibold mb-4">Support</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                href="mailto:support@tripthreads.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact Us
              </a>
            </li>
            <li>
              <Link
                href="/feedback"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Feedback
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container max-w-7xl py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} TripThreads. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
