// Assignment-level request status helpers (Batch 24, C6 / D6). "For Approval"
// belongs to a staff member's assignment on a trip, not to the trip lifecycle,
// so it lives here and not in tripStatus.js.

export const FOR_APPROVAL_LABEL = 'For Approval'

const PRE_DEPARTURE = ['scheduled', 'delayed', 'boarding']

/** 'for_approval' | 'rejected' | null, as returned by the API per role. */
export function getAssignmentRequestStatus(trip, role) {
  return (role === 'conductor' ? trip?.conductor_request_status : trip?.driver_request_status) || null
}

export function isForApproval(trip, role) {
  return getAssignmentRequestStatus(trip, role) === 'for_approval'
}

/**
 * Accept/Decline are only offered before departure, before the staff member
 * accepted, and while no request is pending or rejected.
 */
export function canRespondToAssignment(trip, role) {
  const acceptedAt = role === 'conductor' ? trip?.conductor_accepted_at : trip?.driver_accepted_at
  return PRE_DEPARTURE.includes(String(trip?.status || '').toLowerCase())
    && !acceptedAt
    && !getAssignmentRequestStatus(trip, role)
}

/** Field -> first message map from a 422 error thrown by BaseService. */
export function extractFieldErrors(err) {
  const errors = err?.cause?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return {}
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : String(messages)]),
  )
}
