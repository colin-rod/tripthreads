import { TouchableOpacity, View, Text } from 'react-native'
import { useState } from 'react'

interface FABAction {
  label: string
  icon: string
  onPress: () => void
}

interface FloatingActionButtonProps {
  actions?: FABAction[]
  onPress?: () => void
  icon?: string
  visible?: boolean
}

export function FloatingActionButton({
  actions,
  onPress,
  icon = '+',
  visible = true,
}: FloatingActionButtonProps) {
  const [expanded, setExpanded] = useState(false)

  if (!visible) return null

  const handleMainPress = () => {
    if (actions && actions.length > 0) {
      setExpanded(!expanded)
    } else if (onPress) {
      onPress()
    }
  }

  const handleActionPress = (action: FABAction) => {
    action.onPress()
    setExpanded(false)
  }

  return (
    <View className="absolute bottom-6 right-6 items-end">
      {/* Expanded action menu */}
      {expanded && actions && actions.length > 0 && (
        <View className="mb-3 space-y-2">
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleActionPress(action)}
              className="flex-row items-center bg-card border border-border rounded-full px-4 py-3 shadow-lg"
              activeOpacity={0.8}
            >
              <Text className="text-xl mr-2">{action.icon}</Text>
              <Text className="text-sm font-medium text-foreground">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Main FAB button */}
      <TouchableOpacity
        onPress={handleMainPress}
        className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Text className="text-2xl text-primary-foreground font-semibold">
          {expanded ? '×' : icon}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
