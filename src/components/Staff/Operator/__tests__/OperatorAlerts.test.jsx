import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import OperatorAlerts from '../OperatorAlerts'

// Batch 58 (user, 2026-11-10): crew alerts across the top of the Operator portal. SAMPLE names and numbers.
const openAlert = {
  alert_id: 11, trip_id: 42, type: 'breakdown', type_label: 'Breakdown', status: 'open', note: 'Flat tyre',
  raised_role: 'driver', raised_by: { name: 'Dan Driver', phone: '09170000001' }, raised_at: '2026-11-10T02:31:00Z',
  latitude: 7.05, longitude: 125.01, location_source: 'phone', passengers_told_at: null, passengers_told_count: null,
  trip: { body_no: 'TA-01', route_name: 'Ta Route', driver: { name: 'Dan Driver', phone: '09170000001' }, conductor: { name: 'Cora Chauffeur', phone: null } },
}
const handled = { ...openAlert, alert_id: 12, status: 'handled', handled_by: 'Oscar Operator', handled_at: '2026-11-10T02:40:00Z', handled_note: 'Spare bus sent' }

const state = (over = {}) => ({ open: [openAlert], recent: [handled], busyId: null, message: '', handle: vi.fn(async () => true), tellPassengers: vi.fn(async () => true), ...over })

afterEach(() => cleanup())

describe('OperatorAlerts', () => {
  test('shows nothing when there are no alerts', () => {
    const { container } = render(<OperatorAlerts alerts={state({ open: [], recent: [] })} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('an open alert shows what happened, the bus, who sent it, the crew\'s phones and where the bus was', () => {
    render(<OperatorAlerts alerts={state()} />)
    const card = screen.getByTestId('operator-alert')
    expect(card).toHaveTextContent('Breakdown')
    expect(card).toHaveTextContent('TA-01 · Ta Route')
    expect(card).toHaveTextContent('Trip #42 · 2026/11/10 - 10:31')
    expect(card).toHaveTextContent('Sent by Dan Driver (Driver) · Note: Flat tyre')
    expect(within(card).getByRole('link', { name: /09170000001/ })).toHaveAttribute('href', 'tel:09170000001')
    expect(card).toHaveTextContent('Chauffeur:Cora Chauffeur(no phone)')
    expect(within(card).getByRole('link', { name: 'See where the bus was' })).toHaveAttribute('href', expect.stringContaining('mlat=7.05&mlon=125.01'))
  })

  // Batch 60 (user, 2026-11-11): "Track bus" opens where the bus is now, on Fleets.
  test('Track bus asks for that bus\'s Track popup, and is only there when the portal offers it', () => {
    const onTrackBus = vi.fn()
    const alert = { ...openAlert, trip: { ...openAlert.trip, fleet_id: 5 } }
    const { unmount } = render(<OperatorAlerts alerts={state({ open: [alert] })} onTrackBus={onTrackBus} />)
    fireEvent.click(screen.getByRole('button', { name: 'Track bus' }))
    expect(onTrackBus).toHaveBeenCalledWith({ tripId: 42, fleetId: 5 })
    unmount()

    render(<OperatorAlerts alerts={state()} />)
    expect(screen.queryByRole('button', { name: 'Track bus' })).not.toBeInTheDocument()
  })

  test('Tell passengers asks first, and Mark handled sends the note', async () => {
    const alerts = state()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<OperatorAlerts alerts={alerts} />)

    fireEvent.click(screen.getByRole('button', { name: 'Tell passengers' }))
    expect(alerts.tellPassengers).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Tell passengers' }))
    expect(alerts.tellPassengers).toHaveBeenCalledWith(11)
    expect(confirm).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByRole('button', { name: 'Mark handled' }))
    fireEvent.change(screen.getByPlaceholderText('Note for the crew (optional)'), { target: { value: 'Spare bus sent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark handled' }))
    await waitFor(() => expect(alerts.handle).toHaveBeenCalledWith(11, 'Spare bus sent'))
  })

  test('hides Tell passengers once they were told, and folds the last 24 hours away', () => {
    render(<OperatorAlerts alerts={state({ open: [{ ...openAlert, passengers_told_at: '2026-11-10T02:35:00Z', passengers_told_count: 3 }] })} />)
    expect(screen.queryByRole('button', { name: 'Tell passengers' })).toBeNull()
    expect(screen.getByText('Passengers were told (3).')).toBeInTheDocument()

    expect(screen.queryByTestId('operator-alert-recent')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Crew alerts in the last 24 hours \(1\)/ }))
    expect(screen.getByTestId('operator-alert-recent')).toHaveTextContent('Handled by Oscar Operator at 2026/11/10 - 10:40 · Spare bus sent')
  })
})
