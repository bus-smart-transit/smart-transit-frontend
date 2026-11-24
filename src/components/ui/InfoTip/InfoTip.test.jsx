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

  // 2026-11-24 (user): on a phone the bubble stayed 16rem wide from the icon and widened the page. It now fits the screen.
  it('keeps the bubble inside a phone screen, with a 16px margin', () => {
    const width = window.innerWidth;
    window.innerWidth = 390;
    try {
      render(<InfoTip label="About it" text="An explanation." />);
      const icon = screen.getByTestId('info-tip');
      icon.getBoundingClientRect = () => ({ left: 370, right: 390, top: 100, bottom: 120, width: 20, height: 20 });
      fireEvent.click(icon);
      const bubble = screen.getByRole('tooltip');
      const left = parseFloat(bubble.style.left);
      const bubbleWidth = parseFloat(bubble.style.width);
      expect(bubble.style.position).toBe('fixed');
      expect(left).toBeGreaterThanOrEqual(16);
      expect(left + bubbleWidth).toBeLessThanOrEqual(390 - 16);
      expect(document.body.contains(bubble)).toBe(true);
    } finally {
      window.innerWidth = width;
    }
  });

  it('renders nothing without text', () => {
    const { container } = render(<InfoTip text="" />)
    expect(container).toBeEmptyDOMElement()
  })
})
