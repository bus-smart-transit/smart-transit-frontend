import { describe, expect, it } from 'vitest'
import { canRespondToAssignment, extractFieldErrors, isForApproval } from '../assignmentRequest'

describe('assignmentRequest', () => {
  const base = { status: 'scheduled', driver_accepted_at: null, driver_request_status: null }

  it('offers accept/decline only before departure with no request', () => {
    expect(canRespondToAssignment(base, 'driver')).toBe(true)
    expect(canRespondToAssignment({ ...base, status: 'departed' }, 'driver')).toBe(false)
    expect(canRespondToAssignment({ ...base, driver_accepted_at: '2026-01-01' }, 'driver')).toBe(false)
  })

  it('hides accept/decline while For Approval or after rejection', () => {
    const pending = { ...base, driver_request_status: 'for_approval' }
    expect(isForApproval(pending, 'driver')).toBe(true)
    expect(canRespondToAssignment(pending, 'driver')).toBe(false)
    expect(canRespondToAssignment({ ...base, driver_request_status: 'rejected' }, 'driver')).toBe(false)
  })

  it('reads the role-specific status', () => {
    const trip = { ...base, conductor_request_status: 'for_approval' }
    expect(isForApproval(trip, 'conductor')).toBe(true)
    expect(isForApproval(trip, 'driver')).toBe(false)
  })

  it('extracts the first message per field from a 422', () => {
    const err = { cause: { response: { data: { errors: { reason_text: ['Too long.', 'x'] } } } } }
    expect(extractFieldErrors(err)).toEqual({ reason_text: 'Too long.' })
    expect(extractFieldErrors(new Error('x'))).toEqual({})
  })
})
