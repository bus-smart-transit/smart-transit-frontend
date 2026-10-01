import api from './api.js'

/**
 * The public tracking view of one ticket's bus. The token in the link is the only credential and
 * is sent in the path of one read-only request; nothing else (no account, no ticket id) is needed.
 */
export async function getTracking(token) {
  const response = await api.get(`/track/${encodeURIComponent(token)}`)
  return response?.data?.data ?? null
}
