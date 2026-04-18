import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@components/ui/Button/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Press</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading spinner when loading', () => {
    const { container } = render(<Button loading>Save</Button>)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('respects disabled prop', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Nope</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Wide</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })
})
