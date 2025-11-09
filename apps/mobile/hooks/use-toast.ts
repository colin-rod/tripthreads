import Toast from 'react-native-toast-message'

export type ToastVariant = 'default' | 'destructive' | 'success'

export interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export function useToast() {
  const toast = ({ title, description, variant = 'default', duration = 3000 }: ToastProps) => {
    // Map our variants to toast-message types
    const type = variant === 'destructive' ? 'error' : variant === 'success' ? 'success' : 'info'

    Toast.show({
      type,
      text1: title,
      text2: description,
      visibilityTime: duration,
      position: 'top',
      topOffset: 60,
    })
  }

  return {
    toast,
  }
}
