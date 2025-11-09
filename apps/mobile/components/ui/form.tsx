import * as React from 'react'
import { View, type ViewProps } from 'react-native'
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form'
import { cn } from '../../lib/utils'
import { Label } from './label'
import { Text } from './text'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

interface FormItemProps extends ViewProps {
  className?: string
}

const FormItem = React.forwardRef<React.ElementRef<typeof View>, FormItemProps>(
  ({ className, ...props }, ref) => {
    const id = React.useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <View ref={ref} className={cn('mb-4', className)} {...props} />
      </FormItemContext.Provider>
    )
  }
)
FormItem.displayName = 'FormItem'

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean
}

const FormLabel = React.forwardRef<React.ElementRef<typeof Label>, FormLabelProps>(
  ({ className, required, ...props }, ref) => {
    const { error, formItemId } = useFormField()

    return (
      <Label
        ref={ref}
        className={cn(error && 'text-destructive', className)}
        nativeID={formItemId}
        required={required}
        {...props}
      />
    )
  }
)
FormLabel.displayName = 'FormLabel'

const FormControl = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <View
      ref={ref}
      nativeID={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = 'FormControl'

type FormDescriptionProps = React.ComponentPropsWithoutRef<typeof Text>

const FormDescription = React.forwardRef<React.ElementRef<typeof Text>, FormDescriptionProps>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField()

    return (
      <Text
        ref={ref}
        nativeID={formDescriptionId}
        variant="muted"
        size="sm"
        className={cn('mt-1', className)}
        {...props}
      />
    )
  }
)
FormDescription.displayName = 'FormDescription'

type FormMessageProps = React.ComponentPropsWithoutRef<typeof Text>

const FormMessage = React.forwardRef<React.ElementRef<typeof Text>, FormMessageProps>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField()
    const body = error ? String(error?.message) : children

    if (!body) {
      return null
    }

    return (
      <Text
        ref={ref}
        nativeID={formMessageId}
        variant="destructive"
        size="sm"
        className={cn('mt-1.5', className)}
        {...props}
      >
        {body}
      </Text>
    )
  }
)
FormMessage.displayName = 'FormMessage'

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
