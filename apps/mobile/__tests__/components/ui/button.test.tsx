import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../../../components/ui/button'

describe('Button', () => {
  it('should render button with text', () => {
    const { getByText } = render(<Button>Click me</Button>)
    expect(getByText('Click me')).toBeTruthy()
  })

  it('should call onPress when pressed', () => {
    const onPressMock = jest.fn()
    const { getByText } = render(<Button onPress={onPressMock}>Press me</Button>)

    fireEvent.press(getByText('Press me'))
    expect(onPressMock).toHaveBeenCalledTimes(1)
  })

  it('should render different variants', () => {
    const { rerender, getByTestId } = render(
      <Button testID="button" variant="default">
        Default
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()

    rerender(
      <Button testID="button" variant="secondary">
        Secondary
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()

    rerender(
      <Button testID="button" variant="destructive">
        Destructive
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()

    rerender(
      <Button testID="button" variant="outline">
        Outline
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()

    rerender(
      <Button testID="button" variant="ghost">
        Ghost
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()
  })

  it('should render different sizes', () => {
    const { rerender, getByTestId } = render(
      <Button testID="button" size="default">
        Default
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()

    rerender(
      <Button testID="button" size="sm">
        Small
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()

    rerender(
      <Button testID="button" size="lg">
        Large
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()

    rerender(
      <Button testID="button" size="icon">
        Icon
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()
  })

  it('should be disabled when disabled prop is true', () => {
    const onPressMock = jest.fn()
    const { getByText } = render(
      <Button disabled onPress={onPressMock}>
        Disabled
      </Button>
    )

    const button = getByText('Disabled')
    expect(button.props.accessibilityState?.disabled).toBe(true)

    fireEvent.press(button)
    expect(onPressMock).not.toHaveBeenCalled()
  })

  it('should have proper accessibility label', () => {
    const { getByLabelText } = render(<Button accessibilityLabel="Submit form">Submit</Button>)
    expect(getByLabelText('Submit form')).toBeTruthy()
  })

  it('should apply custom className', () => {
    const { getByTestId } = render(
      <Button testID="button" className="custom-class">
        Custom
      </Button>
    )
    expect(getByTestId('button')).toBeTruthy()
  })
})
