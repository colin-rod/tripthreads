import * as React from 'react'
import { Text, type TextProps } from 'react-native'
import { cn } from '../../lib/utils'

export interface LabelProps extends TextProps {
  className?: string
  required?: boolean
}

const Label = React.forwardRef<React.ElementRef<typeof Text>, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        className={cn('text-sm font-medium text-foreground mb-1.5', className)}
        {...props}
      >
        {children}
        {required ? ' *' : ''}
      </Text>
    )
  }
)

Label.displayName = 'Label'

export { Label }
