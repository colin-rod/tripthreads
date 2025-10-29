import { View, Text } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Link } from 'expo-router'
import { Button } from '../components/ui/button'

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center px-6 bg-background">
      <StatusBar style="auto" />
      <Text className="text-4xl font-bold text-foreground mb-4 text-center">TripThreads</Text>
      <Text className="text-lg text-muted-foreground mb-8 text-center">
        Make memories, not spreadsheets — travel made simple
      </Text>

      <Link href="/components-demo" asChild>
        <Button accessibilityLabel="View mobile components">View Mobile Components</Button>
      </Link>
    </View>
  )
}
