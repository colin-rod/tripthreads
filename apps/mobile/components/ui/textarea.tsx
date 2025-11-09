import * as React from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'
import { cn } from '../../lib/utils'
import { Text } from './text'

export interface TextareaProps extends TextInputProps {
  className?: string
  maxLength?: number
  showCharCount?: boolean
}

const Textarea = React.forwardRef<React.ElementRef<typeof TextInput>, TextareaProps>(
  ({ className, placeholderTextColor, maxLength, showCharCount = false, value, ...props }, ref) => {
    return (
      <View className="w-full">
        <TextInput
          ref={ref}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={maxLength}
          value={value}
          className={cn(
            'min-h-[100px] w-full rounded-md border-2 border-input bg-background px-3 py-2 text-base text-foreground',
            'placeholder:text-muted-foreground',
            props.editable === false && 'opacity-50',
            className
          )}
          placeholderTextColor={placeholderTextColor ?? '#625F88'}
          {...props}
        />
        {showCharCount && maxLength && (
          <Text variant="muted" size="sm" className="mt-1 text-right">
            {value?.length || 0}/{maxLength}
          </Text>
        )}
      </View>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
