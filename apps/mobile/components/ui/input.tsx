import * as React from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { cn } from '../../lib/utils'

export interface InputProps extends TextInputProps {
  className?: string
}

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  ({ className, placeholderTextColor, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        className={cn(
          'h-12 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-base text-foreground',
          'placeholder:text-muted-foreground',
          props.editable === false && 'opacity-50',
          className
        )}
        placeholderTextColor={placeholderTextColor ?? '#625F88'}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input }
