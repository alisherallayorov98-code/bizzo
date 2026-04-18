import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@components/ui/Input/Input'

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Email kiriting" />)
    expect(screen.getByPlaceholderText('Email kiriting')).toBeInTheDocument()
  })

  it('renders label text', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('calls onChange on user input', () => {
    const onChange = vi.fn()
    render(<Input placeholder="x" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('x'), { target: { value: 'hi' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('shows error message', () => {
    render(<Input error="Majburiy maydon" />)
    expect(screen.getByText('Majburiy maydon')).toBeInTheDocument()
  })

  it('disables input', () => {
    render(<Input placeholder="x" disabled />)
    expect(screen.getByPlaceholderText('x')).toBeDisabled()
  })
})
