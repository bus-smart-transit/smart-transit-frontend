import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import DropoffRulesPanel from '../../components/Staff/DropoffRulesPanel'

const routes = [{ route_id: 3, route_name: 'Route X', custom_dropoff_mode: 'off', allow_custom_dropoff: false }]

const makeService = (over = {}) => ({
  getDropoffPoints: vi.fn().mockResolvedValue({ data: [
    { id: 1, route_id: 3, name: 'Point One', kind: 'landmark', municipality: 'Town A', latitude: 7.2, longitude: 125.0, distance_along_outbound_m: 22000, is_active: true, source: 'fare matrix', is_sample: false },
    { id: 2, route_id: 3, name: 'SAMPLE point 1', kind: 'barangay', municipality: 'Town B', latitude: 7.3, longitude: 125.0, distance_along_outbound_m: 33000, is_active: false, source: 'SAMPLE - dev only', is_sample: true },
  ] }),
  getDropoffRestrictions: vi.fn().mockResolvedValue({ data: [
    { id: 8, route_id: 3, name: 'Zone A', from_stop_id: 1, from_stop_name: 'Stop 1', to_stop_id: 3, to_stop_name: 'Stop 3', is_active: true, needs_review: false, review_reason: null, source: 'pending adviser confirmation', pending_confirmation: true },
    { id: 9, route_id: 3, name: 'Zone B', from_stop_id: 3, from_stop_name: 'Stop 3', to_stop_id: 4, to_stop_name: 'Stop 4', is_active: true, needs_review: true, review_reason: 'An end stop moved since this area was saved.', source: '' },
  ] }),
  getRouteStopsForDropoff: vi.fn().mockResolvedValue({ data: [{ stop_id: 1, stop_name: 'Stop 1', stop_order: 1 }, { stop_id: 3, stop_name: 'Stop 3', stop_order: 2 }, { stop_id: 4, stop_name: 'Stop 4', stop_order: 3 }] }),
  setRouteDropoffMode: vi.fn().mockResolvedValue({}),
  saveDropoffPoint: vi.fn().mockResolvedValue({}),
  saveDropoffRestriction: vi.fn().mockResolvedValue({}),
  reviewDropoffRestriction: vi.fn().mockResolvedValue({}),
  ...over,
})

describe('DropoffRulesPanel', () => {
  test('lists the areas and points of the route, flags an area that needs review, and labels pending and SAMPLE rows', async () => {
    render(<DropoffRulesPanel service={makeService()} routes={routes} />)
    const rows = await screen.findAllByTestId('restriction-row')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Pending confirmation')).toBeInTheDocument()
    expect(screen.getByTestId('needs-review')).toHaveTextContent('custom drop-off is paused on this route')
    expect(screen.getByTestId('needs-review')).toHaveTextContent('An end stop moved')
    const points = screen.getAllByTestId('point-row')
    expect(points).toHaveLength(2)
    expect(within(points[1]).getByText('SAMPLE')).toBeInTheDocument()
    expect(within(points[1]).getByText('Off')).toBeInTheDocument()
  })

  test('changes the route mode through the server', async () => {
    const service = makeService()
    const onRoutesChanged = vi.fn()
    render(<DropoffRulesPanel service={service} routes={routes} onRoutesChanged={onRoutesChanged} />)
    await screen.findAllByTestId('restriction-row')
    fireEvent.change(screen.getByLabelText('Custom drop-off mode'), { target: { value: 'designated_points' } })
    await waitFor(() => expect(service.setRouteDropoffMode).toHaveBeenCalledWith(3, 'designated_points'))
    expect(onRoutesChanged).toHaveBeenCalled()
    expect(screen.getByLabelText('Custom drop-off mode')).toHaveValue('designated_points')
  })

  test('confirms an area after review, and switches an area off', async () => {
    const service = makeService()
    render(<DropoffRulesPanel service={service} routes={routes} />)
    const rows = await screen.findAllByTestId('restriction-row')
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Confirm area' }))
    await waitFor(() => expect(service.reviewDropoffRestriction).toHaveBeenCalledWith(9))
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Switch off' }))
    await waitFor(() => expect(service.saveDropoffRestriction).toHaveBeenCalledWith({ route_id: 3, is_active: false }, 8))
  })

  test('saves an area by its two stop ids and a point with numeric coordinates, and shows a server refusal', async () => {
    const service = makeService({ saveDropoffPoint: vi.fn().mockRejectedValueOnce(new Error('That point is 900 m from the route line.')).mockResolvedValue({}) })
    render(<DropoffRulesPanel service={service} routes={routes} />)
    await screen.findAllByTestId('restriction-row')

    fireEvent.change(screen.getByLabelText('Area name'), { target: { value: 'New area' } })
    fireEvent.change(screen.getByLabelText('From stop'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('To stop'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save area' }))
    await waitFor(() => expect(service.saveDropoffRestriction).toHaveBeenCalledWith(expect.objectContaining({ route_id: 3, from_stop_id: 1, to_stop_id: 4, name: 'New area' }), null))

    fireEvent.change(screen.getByLabelText('Point name'), { target: { value: 'Typed point' } })
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '7.21' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '125.0002' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save point' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('900 m from the route line')
    fireEvent.click(screen.getByRole('button', { name: 'Save point' }))
    await waitFor(() => expect(service.saveDropoffPoint).toHaveBeenLastCalledWith(expect.objectContaining({ route_id: 3, name: 'Typed point', kind: 'landmark', latitude: 7.21, longitude: 125.0002 }), null))
  })

  test('filters the points by municipality and edits a point in place', async () => {
    const service = makeService()
    render(<DropoffRulesPanel service={service} routes={routes} />)
    await screen.findAllByTestId('point-row')
    fireEvent.change(screen.getByLabelText('Filter by municipality'), { target: { value: 'town b' } })
    expect(screen.getAllByTestId('point-row')).toHaveLength(1)
    fireEvent.click(within(screen.getByTestId('point-row')).getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Point name')).toHaveValue('SAMPLE point 1')
    expect(screen.getByRole('button', { name: 'Update point' })).toBeInTheDocument()
  })
})
