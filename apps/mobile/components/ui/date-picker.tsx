import * as React from 'react'
import { Platform, View } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { Button } from './button'
import { Text } from './text'

export interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  minimumDate?: Date
  maximumDate?: Date
  placeholder?: string
  disabled?: boolean
  className?: string
}

const DatePicker = React.forwardRef<View, DatePickerProps>(
  (
    {
      value,
      onChange,
      minimumDate,
      maximumDate,
      placeholder = 'Select date',
      disabled = false,
      className,
    },
    ref
  ) => {
    const [show, setShow] = React.useState(false)
    const [tempDate, setTempDate] = React.useState<Date | undefined>(value)

    // Update temp date when value changes
    React.useEffect(() => {
      setTempDate(value)
    }, [value])

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShow(false)
        if (event.type === 'set' && selectedDate) {
          setTempDate(selectedDate)
          onChange(selectedDate)
        }
      } else {
        // iOS: update temp date as user scrolls
        if (selectedDate) {
          setTempDate(selectedDate)
        }
      }
    }

    const handleConfirm = () => {
      if (tempDate) {
        onChange(tempDate)
      }
      setShow(false)
    }

    const handleCancel = () => {
      setTempDate(value) // Reset to original value
      setShow(false)
    }

    const displayValue = value ? format(value, 'MMM d, yyyy') : placeholder

    return (
      <View ref={ref} className={className}>
        <Button
          variant="outline"
          onPress={() => !disabled && setShow(true)}
          disabled={disabled}
          className="justify-start"
        >
          <Text className={value ? 'text-foreground' : 'text-muted-foreground'} numberOfLines={1}>
            {displayValue}
          </Text>
        </Button>

        {show && (
          <>
            <DateTimePicker
              value={tempDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
            {/* iOS: Show confirm/cancel buttons */}
            {Platform.OS === 'ios' && (
              <View className="flex-row justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onPress={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onPress={handleConfirm}>
                  Confirm
                </Button>
              </View>
            )}
          </>
        )}
      </View>
    )
  }
)

DatePicker.displayName = 'DatePicker'

export { DatePicker }
