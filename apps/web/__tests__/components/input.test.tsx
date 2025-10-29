import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Input } from '../../components/ui/input'

describe('Input', () => {
  it('should render with default type', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText(/enter text/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should render with email type', () => {
    render(<Input type="email" placeholder="Enter email" />)
    const input = screen.getByPlaceholderText(/enter email/i)
    expect(input).toHaveAttribute('type', 'email')
  })

  it('should render with password type', () => {
    render(<Input type="password" placeholder="Enter password" />)
    const input = screen.getByPlaceholderText(/enter password/i)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />)
    expect(screen.getByPlaceholderText(/disabled/i)).toBeDisabled()
  })

  it('should apply custom className', () => {
    render(<Input className="custom-class" placeholder="Custom" />)
    expect(screen.getByPlaceholderText(/custom/i)).toHaveClass('custom-class')
  })

  it('should have proper styling classes', () => {
    render(<Input placeholder="Styled" />)
    const input = screen.getByPlaceholderText(/styled/i)
    expect(input).toHaveClass('border')
    expect(input).toHaveClass('rounded-md')
  })
})
