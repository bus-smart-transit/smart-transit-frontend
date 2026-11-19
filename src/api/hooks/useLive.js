import { useEffect, useRef, useState } from 'react'
import api from '../../services/api'
import { listen, liveConfigured, liveState, liveToken, onLiveState } from '../../services/live'

/**
 * Batch 58: live updates for screens. useLiveChannels asks the server which channels this visitor may hear (never built
 * here); useLiveEvent listens to one event; useLiveConnected says whether updates are flowing (screens poll slower then).
 * All of them do nothing when live updates are off.
 */
export function useLiveChannels() {
  const [channels, setChannels] = useState(null)
  useEffect(() => {
    if (!liveConfigured()) return undefined
    let cancelled = false
    const token = liveToken()
    api.get('/live/channels', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((response) => { if (!cancelled) setChannels(response?.data?.data ?? null) })
      .catch(() => { if (!cancelled) setChannels(null) })
    return () => { cancelled = true }
  }, [])
  return channels?.enabled ? channels : null
}

export function useLiveEvent(channel, event, handler, { isPrivate = false } = {}) {
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler })
  useEffect(() => {
    if (!channel || !event) return undefined
    return listen({ channel, event, isPrivate, handler: (payload) => handlerRef.current?.(payload) })
  }, [channel, event, isPrivate])
}

export function useLiveConnected() {
  const [connected, setConnected] = useState(() => liveState() === 'connected')
  useEffect(() => onLiveState((next) => setConnected(next === 'connected')), [])
  return connected
}
