import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CrewAlertCard from '../CrewAlertCard'

// Batch 58 (user, 2026-11-10): "Alert operator" for the Driver and the Chauffeur. The types come from the server.
const TYPES = [{ key: 'breakdown', label: 'Breakdown' }, { key: 'accident', label: 'Accident' }, { key: 'road_blocked', label: 'Road blocked' }]

function makeService(alerts = []) {
  const state = { alerts }
  return {
    state,
    getCrewAlerts: vi.fn(async () => ({ data: { alerts: state.alerts, types: TYPES } })),
    raiseCrewAlert: vi.fn(async (tripId, payload) => {
      state.alerts = [{ alert_id: 5, type: payload.type, type_label: TYPES.find((t) => t.key === payload.type).label, status: 'open', raised_at: '2026-11-10T02:31:00Z', can_cancel: true }]
      return { data: state.alerts[0] }
    }),
    cancelCrewAlert: vi.fn(async () => {
      state.alerts = [{ ...state.alerts[0], status: 'cancelled', can_cancel: false }]
      return {}
    }),
  }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CrewAlertCard', () => {
  test('is not shown before boarding or after the trip ends', () => {
    const service = makeService()
    const { container, rerender } = render(<CrewAlertCard service={service} trip={{ trip_id: 9, status: 'scheduled' }} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<CrewAlertCard service={service} trip={{ trip_id: 9, status: 'completed' }} />)
    expect(container).toBeEmptyDOMElement()
    expect(service.getCrewAlerts).not.toHaveBeenCalled()
  })

  test('says it alerts the bus company only, offers 911, and needs a 2-second hold before choosing', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    const service = makeService()
    render(<CrewAlertCard service={service} trip={{ trip_id: 9, status: 'departed' }} />)
    expect(screen.getByTestId('crew-alert-card')).toHaveTextContent('This tells your bus company only. In an emergency, call 911.')
    expect(screen.getByRole('link', { name: 'Call 911' })).toHaveAttribute('href', 'tel:911')

    const hold = screen.getByRole('button', { name: 'Hold to alert operator' })
    fireEvent.pointerDown(hold)
    act(() => { vi.advanceTimersByTime(1000) })
    fireEvent.pointerUp(hold) // let go too early: nothing happens
    expect(screen.queryByTestId('crew-alert-choose')).toBeNull()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hold to alert operator' }))
    act(() => { vi.advanceTimersByTime(2100) })
    expect(screen.getByTestId('crew-alert-choose')).toBeInTheDocument()
    await act(async () => { await vi.runOnlyPendingTimersAsync() })
    expect(screen.getAllByRole('button', { name: /^(Breakdown|Accident|Road blocked)$/ })).toHaveLength(3)
  })

  test('from the keyboard, Enter opens the choice; a type sends with the note, and the alert can be taken back', async () => {
    const service = makeService()
    render(<CrewAlertCard service={service} trip={{ trip_id: 9, status: 'boarding' }} />)
    await waitFor(() => expect(service.getCrewAlerts).toHaveBeenCalledWith(9))

    fireEvent.keyDown(screen.getByRole('button', { name: 'Hold to alert operator' }), { key: 'Enter' })
    fireEvent.change(screen.getByPlaceholderText(/flat tyre/), { target: { value: 'Engine smoke' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Breakdown' }))

    await waitFor(() => expect(service.raiseCrewAlert).toHaveBeenCalledWith(9, { type: 'breakdown', note: 'Engine smoke' }))
    expect(await screen.findByTestId('crew-alert-status')).toHaveTextContent('Breakdown')
    expect(screen.getByTestId('crew-alert-status')).toHaveTextContent('Alert sent. Your operator has been told.')

    fireEvent.click(screen.getByRole('button', { name: 'Take back (sent by mistake)' }))
    await waitFor(() => expect(service.cancelCrewAlert).toHaveBeenCalledWith(5))
    await waitFor(() => expect(screen.queryByTestId('crew-alert-status')).toBeNull())
  })

  test('says plainly when an alert could not be sent', async () => {
    const service = makeService()
    service.raiseCrewAlert.mockRejectedValueOnce(new Error('No connection'))
    render(<CrewAlertCard service={service} trip={{ trip_id: 9, status: 'in-progress' }} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Hold to alert operator' }), { key: ' ' })
    fireEvent.click(await screen.findByRole('button', { name: 'Road blocked' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Not sent. Call your operator. (No connection)')
  })
})
