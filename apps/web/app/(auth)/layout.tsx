import { Footer } from '@/components/features/legal/Footer'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
