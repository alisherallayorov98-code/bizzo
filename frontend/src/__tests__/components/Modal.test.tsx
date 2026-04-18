import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@components/ui/Modal/Modal'

describe('Modal', () => {
  it('does not render content when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="X"><div>inside</div></Modal>)
    expect(screen.queryByText('inside')).not.toBeInTheDocument()
  })

  it('renders children when open', () => {
    render(<Modal open={true} onClose={() => {}} title="Sarlavha"><div>ichki</div></Modal>)
    expect(screen.getByText('ichki')).toBeInTheDocument()
    expect(screen.getByText('Sarlavha')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="X"><div>c</div></Modal>)
    const btn = screen.getAllByRole('button').find(b => b.querySelector('svg'))
    if (btn) fireEvent.click(btn)
    expect(onClose).toHaveBeenCalled()
  })
})
