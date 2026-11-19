import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import api from './api'
import { TokenManager } from '../utils/TokenManager'

/**
 * Batch 58 (user, 2026-11-10): live updates over WebSocket (Laravel Reverb on our server). One shared connection.
 *
 * - Off unless the website was built with VITE_REVERB_APP_KEY (that key is public by design; the secret stays on the
 *   server). Screens keep polling either way: live updates only make them faster, and when the connection drops (common
 *   on mobile data) Echo reconnects on its own while the screens poll as before.
 * - Private channels (a person's own, an Operator's company) are signed in through POST /api/broadcasting/auth with the
 *   staff token when a staff member is signed in on this browser, else the passenger's. The server checks the channel.
 */

let echo = null
let state = 'off'
const stateListeners = new Set()

export function liveConfigured() {
  return Boolean(String(import.meta.env?.VITE_REVERB_APP_KEY || '').trim())
}

export function liveToken() {
  return TokenManager.getStaffToken() || TokenManager.getPassengerToken() || null
}

const setState = (next) => {
  state = next
  stateListeners.forEach((listener) => listener(next))
}

/** The shared Echo connection, made on first use; null when live updates are not configured. */
export function getEcho() {
  if (!liveConfigured()) return null
  if (echo) return echo
  const scheme = String(import.meta.env?.VITE_REVERB_SCHEME || 'https')
  const port = Number(import.meta.env?.VITE_REVERB_PORT || (scheme === 'https' ? 443 : 80))
  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env?.VITE_REVERB_HOST || window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    Pusher,
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        const token = liveToken()
        api.post('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
          .then((response) => callback(null, response.data))
          .catch((error) => callback(error, null))
      },
    }),
  })
  const connection = echo.connector?.pusher?.connection
  connection?.bind?.('state_change', ({ current }) => setState(current))
  setState(connection?.state || 'connecting')
  return echo
}

/** 'connected' when live updates are flowing; anything else means the screens rely on polling. */
export function liveState() {
  return state
}

export function onLiveState(listener) {
  stateListeners.add(listener)
  return () => stateListeners.delete(listener)
}

/**
 * Listens to one event on one channel. Returns a function that stops listening (and leaves the channel when nobody
 * else on this page uses it). Never throws: without live updates it does nothing.
 */
export function listen({ channel, event, handler, isPrivate = false }) {
  const connection = getEcho()
  if (!connection || !channel || !event) return () => {}
  try {
    const subscription = isPrivate ? connection.private(channel) : connection.channel(channel)
    const name = `.${event}`
    subscription.listen(name, handler)
    return () => {
      try {
        subscription.stopListening(name, handler)
      } catch {
        // the connection is already gone
      }
    }
  } catch {
    return () => {}
  }
}

/** For tests: forget the shared connection. */
export function resetLiveForTests() {
  try {
    echo?.disconnect?.()
  } catch {
    // ignore
  }
  echo = null
  state = 'off'
  stateListeners.clear()
}
