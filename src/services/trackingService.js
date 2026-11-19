import api from './api.js'
import { extractTrackingToken, normalizeTrackingCode } from '../utils/trackingToken'

/**
 * The public tracking view of one ticket's bus. The token in the link is the only credential and
 * is sent in the path of one read-only request; nothing else (no account, no ticket id) is needed.
 */
export async function getTracking(token) {
  const response = await api.get(`/track/${encodeURIComponent(token)}`)
  return response?.data?.data ?? null
}

/**
 * Batch 49 item 5: the one way "Track my bus" reads what was typed. A tracking link (or its long token) is used as it
 * is; the short code from the ticket is sent to the server (POST track/code, its own limit), which answers with the
 * ticket's tracking token. '' when the input is neither. A wrong code rejects with the server's 404.
 */
export async function resolveTrackingInput(input) {
  const token = extractTrackingToken(input)
  if (token) return token
  const code = normalizeTrackingCode(input)
  if (!code) return ''
  const response = await api.post('/track/code', { code })
  return response?.data?.data?.tracking_token || ''
}
