import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../../api/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

vi.mock('./BuyTicket', () => ({
  default: ({ returnTo }) => <div data-testid="buy-ticket-return">{returnTo}</div>,
}))

import BuyTicketPage from './BuyTicketPage'

function renderPage(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/passenger/book', state }]}>
      <Routes>
        <Route path="/passenger/book" element={<BuyTicketPage />} />
        <Route path="/" element={<p>Homepage</p>} />
        <Route path="/passenger/dashboard" element={<p>Passenger dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BuyTicketPage return navigation', () => {
  test('returns homepage-origin bookings to the homepage', async () => {
    renderPage({ returnTo: '/' })

    expect(screen.getByTestId('buy-ticket-return')).toHaveTextContent('/')
    fireEvent.click(screen.getByRole('link', { name: 'Back to Search' }))

    expect(await screen.findByText('Homepage')).toBeInTheDocument()
  })

  test('returns dashboard-origin bookings to the passenger dashboard', async () => {
    renderPage({ returnTo: '/passenger/dashboard' })

    expect(screen.getByTestId('buy-ticket-return')).toHaveTextContent('/passenger/dashboard')
    fireEvent.click(screen.getByRole('link', { name: 'Back to Search' }))

    expect(await screen.findByText('Passenger dashboard')).toBeInTheDocument()
  })

  test('falls back home for an unrecognized return target', async () => {
    renderPage({ returnTo: 'https://example.invalid' })

    expect(screen.getByTestId('buy-ticket-return')).toHaveTextContent('/')
    fireEvent.click(screen.getByRole('link', { name: 'Back to Search' }))

    expect(await screen.findByText('Homepage')).toBeInTheDocument()
  })
})