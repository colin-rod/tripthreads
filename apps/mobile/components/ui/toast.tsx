import Toast, { BaseToast, ErrorToast, type BaseToastProps } from 'react-native-toast-message'

/**
 * Toast configuration with custom styling to match design system
 */
export const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#22C55E', // success color
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#11333B', // foreground
      }}
      text2Style={{
        fontSize: 14,
        color: '#625F88', // muted-foreground
      }}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#EF4444', // destructive color
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#11333B', // foreground
      }}
      text2Style={{
        fontSize: 14,
        color: '#625F88', // muted-foreground
      }}
    />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#F97316', // primary color
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#11333B', // foreground
      }}
      text2Style={{
        fontSize: 14,
        color: '#625F88', // muted-foreground
      }}
    />
  ),
}

/**
 * Toast provider component
 * Add this at the root of your app layout
 */
export function ToastProvider() {
  return <Toast config={toastConfig} />
}

export { Toast }
