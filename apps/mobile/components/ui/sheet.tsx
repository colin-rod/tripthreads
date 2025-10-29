import * as React from 'react'
import { Modal, View, TouchableOpacity, Pressable, type ModalProps } from 'react-native'
import { cn } from '../../lib/utils'

export interface SheetProps extends Omit<ModalProps, 'visible'> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

const Sheet = ({ open = false, onOpenChange, children, ...props }: SheetProps) => {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange?.(false)}
      {...props}
    >
      {children}
    </Modal>
  )
}

Sheet.displayName = 'Sheet'

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  React.ComponentPropsWithoutRef<typeof Pressable>
>(({ className, ...props }, ref) => (
  <Pressable ref={ref} className={cn('absolute inset-0 bg-black/50', className)} {...props} />
))

SheetOverlay.displayName = 'SheetOverlay'

const SheetContent = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
  <View className="flex-1 justify-end">
    <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1" />
    <View
      ref={ref}
      className={cn('bg-background rounded-t-3xl px-6 py-8', 'border-t-2 border-border', className)}
      {...props}
    >
      {children}
    </View>
  </View>
))

SheetContent.displayName = 'SheetContent'

const SheetHeader = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => <View ref={ref} className={cn('mb-4', className)} {...props} />)

SheetHeader.displayName = 'SheetHeader'

const SheetFooter = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('mt-6 flex-row gap-2', className)} {...props} />
))

SheetFooter.displayName = 'SheetFooter'

export { Sheet, SheetOverlay, SheetContent, SheetHeader, SheetFooter }
