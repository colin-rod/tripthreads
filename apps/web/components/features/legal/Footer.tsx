import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container max-w-7xl py-6">
        {/* Row 1: Branding + Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4">
          {/* Left: Logo + Tagline */}
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
            <span className="hidden sm:inline text-sm text-muted-foreground">
              — Make memories, not spreadsheets
            </span>
          </Link>

          {/* Right: Navigation Links */}
          <nav className="flex gap-6 text-sm">
            <Link
              href="/trips"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Trips
            </Link>
            <Link
              href="/#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <a
              href="mailto:support@tripthreads.app"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
            <Link
              href="/feedback"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Feedback
            </Link>
          </nav>
        </div>

        {/* Row 2: Copyright + Legal Links */}
        <div className="border-t border-border pt-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
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
