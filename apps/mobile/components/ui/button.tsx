import * as React from 'react'
import { Pressable, Text, type PressableProps } from 'react-native'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva('flex-row items-center justify-center rounded-md active:opacity-80', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border-2 border-input bg-background',
      ghost: 'bg-transparent',
    },
    size: {
      default: 'h-12 px-4 py-3',
      sm: 'h-10 px-3 py-2',
      lg: 'h-14 px-8 py-4',
      icon: 'h-12 w-12',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

const buttonTextVariants = cva('text-center font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  children?: React.ReactNode
  className?: string
  textClassName?: string
  disabled?: boolean
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      textClassName,
      variant,
      size,
      disabled = false,
      children,
      accessibilityState,
      ...props
    },
    ref
  ) => {
    return (
      <Pressable
        ref={ref}
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
        disabled={disabled}
        accessibilityState={{ disabled, ...accessibilityState }}
        accessibilityRole="button"
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants, buttonTextVariants }
