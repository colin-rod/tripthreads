import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetFooter } from '../components/ui/sheet'

export default function ComponentsDemo() {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  return (
    <>
      <StatusBar style="auto" />
      <ScrollView className="flex-1 bg-background">
        <View className="px-6 py-8">
          {/* Header */}
          <Text className="text-4xl font-bold text-foreground mb-2">TripThreads Mobile UI</Text>
          <Text className="text-lg text-muted-foreground mb-8">
            Shared primitives with NativeWind
          </Text>

          {/* Button Variants */}
          <View className="mb-8">
            <Text className="text-2xl font-semibold text-foreground mb-4">Button Variants</Text>
            <View className="gap-3">
              <Button
                accessibilityLabel="Default button"
                onPress={() => console.log('Default pressed')}
              >
                Default Button
              </Button>

              <Button
                variant="secondary"
                accessibilityLabel="Secondary button"
                onPress={() => console.log('Secondary pressed')}
              >
                Secondary Button
              </Button>

              <Button
                variant="destructive"
                accessibilityLabel="Destructive button"
                onPress={() => console.log('Destructive pressed')}
              >
                Destructive Button
              </Button>

              <Button
                variant="outline"
                accessibilityLabel="Outline button"
                onPress={() => console.log('Outline pressed')}
              >
                Outline Button
              </Button>

              <Button
                variant="ghost"
                accessibilityLabel="Ghost button"
                onPress={() => console.log('Ghost pressed')}
              >
                Ghost Button
              </Button>

              <Button
                disabled
                accessibilityLabel="Disabled button"
                onPress={() => console.log('Should not press')}
              >
                Disabled Button
              </Button>
            </View>
          </View>

          {/* Button Sizes */}
          <View className="mb-8">
            <Text className="text-2xl font-semibold text-foreground mb-4">Button Sizes</Text>
            <View className="gap-3">
              <Button
                size="sm"
                accessibilityLabel="Small button"
                onPress={() => console.log('Small pressed')}
              >
                Small Button
              </Button>

              <Button
                size="default"
                accessibilityLabel="Default size button"
                onPress={() => console.log('Default pressed')}
              >
                Default Button
              </Button>

              <Button
                size="lg"
                accessibilityLabel="Large button"
                onPress={() => console.log('Large pressed')}
              >
                Large Button
              </Button>

              <View className="flex-row gap-2">
                <Button
                  size="icon"
                  accessibilityLabel="Icon button"
                  onPress={() => console.log('Icon pressed')}
                >
                  +
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  accessibilityLabel="Icon outline button"
                  onPress={() => console.log('Icon outline pressed')}
                >
                  ×
                </Button>
              </View>
            </View>
          </View>

          {/* Input Component */}
          <View className="mb-8">
            <Text className="text-2xl font-semibold text-foreground mb-4">Input Component</Text>
            <View className="gap-3">
              <Input
                placeholder="Enter your email"
                value={inputValue}
                onChangeText={setInputValue}
                accessibilityLabel="Email input"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                placeholder="Disabled input"
                editable={false}
                accessibilityLabel="Disabled input"
              />

              <Input placeholder="Search trips..." accessibilityLabel="Search input" />
            </View>
          </View>

          {/* Sheet/Modal */}
          <View className="mb-8">
            <Text className="text-2xl font-semibold text-foreground mb-4">Sheet/Modal</Text>
            <Button onPress={() => setSheetOpen(true)} accessibilityLabel="Open sheet">
              Open Sheet
            </Button>
          </View>

          {/* Accessibility */}
          <View className="mb-8">
            <Text className="text-2xl font-semibold text-foreground mb-4">Accessibility</Text>
            <Text className="text-base text-muted-foreground mb-3">All components include:</Text>
            <Text className="text-base text-foreground mb-2">• accessibilityLabel props</Text>
            <Text className="text-base text-foreground mb-2">• accessibilityRole attributes</Text>
            <Text className="text-base text-foreground mb-2">
              • accessibilityState (disabled, selected)
            </Text>
            <Text className="text-base text-foreground mb-2">• Proper focus management</Text>
            <Text className="text-base text-foreground">• Screen reader support</Text>
          </View>

          {/* Design System */}
          <View className="mb-8">
            <Text className="text-2xl font-semibold text-foreground mb-4">Design System</Text>
            <Text className="text-base text-muted-foreground mb-3">
              Following Playful Citrus Pop design system:
            </Text>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-primary" />
                <Text className="text-foreground">Primary (Orange)</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-secondary" />
                <Text className="text-foreground">Secondary (Green)</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-destructive" />
                <Text className="text-foreground">Destructive (Red)</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-accent" />
                <Text className="text-foreground">Accent (Yellow)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sheet Component Demo */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent onClose={() => setSheetOpen(false)}>
          <SheetHeader>
            <Text className="text-2xl font-semibold text-foreground">Example Sheet</Text>
            <Text className="text-base text-muted-foreground mt-2">
              This is a bottom sheet component styled with NativeWind
            </Text>
          </SheetHeader>

          <View className="py-4">
            <Input placeholder="Enter something..." accessibilityLabel="Sheet input" />
          </View>

          <SheetFooter>
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setSheetOpen(false)}
              accessibilityLabel="Cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onPress={() => {
                console.log('Confirmed')
                setSheetOpen(false)
              }}
              accessibilityLabel="Confirm"
            >
              Confirm
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
