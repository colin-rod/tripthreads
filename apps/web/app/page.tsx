import Link from 'next/link'
import { Button } from '../components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">TripThreads</h1>
        <p className="text-xl text-muted-foreground">
          Make memories, not spreadsheets — travel made simple
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/components-demo">View Components</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/error-states-demo">Error & Empty States</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
