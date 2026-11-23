import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import InfoTip from './InfoTip'

// 2026-11-23 (advisor): explanations behind an (i) icon that opens on hover, click/tap or keyboard.

describe('InfoTip', () => {
  it('opens on click and closes with Escape', () => {
    render(<InfoTip label="About quantity" text="Tickets to the same stop, paid together." />)
    const icon = screen.getByRole('button', { name: 'About quantity' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    fireEvent.click(icon)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tickets to the same stop, paid together.')
    expect(icon).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens while the mouse is over it', () => {
    render(<InfoTip label="About the bus" text="Only free buses can be chosen." />)
    fireEvent.mouseEnter(screen.getByTestId('info-tip').parentElement)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Only free buses can be chosen.')
    fireEvent.mouseLeave(screen.getByTestId('info-tip').parentElement)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('renders nothing without text', () => {
    const { container } = render(<InfoTip text="" />)
    expect(container).toBeEmptyDOMElement()
  })
})
