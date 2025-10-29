import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Plane, Home, MapPin, DollarSign, Users, Camera } from 'lucide-react'

export default function ComponentsDemo() {
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">TripThreads Design System</h1>
          <p className="text-lg text-muted-foreground">Playful Citrus Pop - Component Showcase</p>
        </div>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Primary, secondary, and semantic colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="h-20 rounded-lg bg-primary mb-2" />
                <p className="text-sm font-medium">Primary</p>
                <p className="text-xs text-muted-foreground">#F97316 Orange</p>
              </div>
              <div>
                <div className="h-20 rounded-lg bg-secondary mb-2" />
                <p className="text-sm font-medium">Secondary</p>
                <p className="text-xs text-muted-foreground">#22C55E Green</p>
              </div>
              <div>
                <div className="h-20 rounded-lg bg-warning mb-2" />
                <p className="text-sm font-medium">Warning</p>
                <p className="text-xs text-muted-foreground">#FACC15 Yellow</p>
              </div>
              <div>
                <div className="h-20 rounded-lg bg-error mb-2" />
                <p className="text-sm font-medium">Error</p>
                <p className="text-xs text-muted-foreground">#EF4444 Red</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>All button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <Plane className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled>Disabled</Button>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Input Fields</CardTitle>
            <CardDescription>Text, email, and password inputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Text input" />
            <Input type="email" placeholder="Email input" />
            <Input type="password" placeholder="Password input" />
            <Input disabled placeholder="Disabled input" />
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators and tags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Icons (Lucide) */}
        <Card>
          <CardHeader>
            <CardTitle>Icons</CardTitle>
            <CardDescription>Lucide icons for TripThreads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div className="flex flex-col items-center gap-2">
                <Plane className="h-8 w-8 text-primary" />
                <span className="text-xs">Flights</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Home className="h-8 w-8 text-secondary" />
                <span className="text-xs">Stays</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <MapPin className="h-8 w-8 text-warning" />
                <span className="text-xs">Activities</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <DollarSign className="h-8 w-8 text-error" />
                <span className="text-xs">Expenses</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Users className="h-8 w-8 text-foreground" />
                <span className="text-xs">Participants</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Camera className="h-8 w-8 text-foreground" />
                <span className="text-xs">Photos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Example */}
        <Card>
          <CardHeader>
            <CardTitle>Card Component</CardTitle>
            <CardDescription>
              Example of a complete card with header, content, and footer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">
              This is an example of the card component with a header, content area, and footer.
              Cards are used throughout TripThreads for trips, expenses, and itinerary items.
            </p>
          </CardContent>
          <CardFooter>
            <Button>Card Action</Button>
          </CardFooter>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Font sizes and weights using Inter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <h1 className="text-3xl font-semibold">Heading 1</h1>
            <h2 className="text-2xl font-semibold">Heading 2</h2>
            <h3 className="text-xl font-semibold">Heading 3</h3>
            <p className="text-base">
              Body text - This is the default body text style used throughout the application.
            </p>
            <p className="text-sm text-muted-foreground">
              Small text - Used for captions and helper text.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
