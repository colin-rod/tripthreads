import * as React from 'react'
import { Text as RNText, type TextProps as RNTextProps } from 'react-native'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    weight: 'normal',
  },
})

export interface TextProps extends RNTextProps, VariantProps<typeof textVariants> {
  className?: string
}

const Text = React.forwardRef<React.ElementRef<typeof RNText>, TextProps>(
  ({ className, variant, size, weight, ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(textVariants({ variant, size, weight }), className)}
        {...props}
      />
    )
  }
)

Text.displayName = 'Text'

export { Text, textVariants }
