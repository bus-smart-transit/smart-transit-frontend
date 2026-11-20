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

/**
 * 2026-11-20 (user: live updates on every portal): reloads a screen when a live event that concerns it arrives.
 * `match(payload)` picks the events (every event when left out). Bursts are spread out (a moving bus reports every few
 * seconds): at most one reload every `minGapMs`, and the last event is never lost. The screen keeps its own polling as
 * the fallback, so nothing breaks when live updates are off or the connection drops.
 */
export function useLiveRefresh(channel, event, refresh, { isPrivate = false, match, minGapMs = 0 } = {}) {
  const refreshRef = useRef(refresh)
  const matchRef = useRef(match)
  const lastRef = useRef(0)
  const timerRef = useRef(null)
  useEffect(() => {
    refreshRef.current = refresh
    matchRef.current = match
  })
  useEffect(() => () => clearTimeout(timerRef.current), [])
  useLiveEvent(channel, event, (payload) => {
    if (matchRef.current && !matchRef.current(payload)) return
    const wait = lastRef.current + minGapMs - Date.now()
    if (wait <= 0) {
      lastRef.current = Date.now()
      refreshRef.current?.(payload)
      return
    }
    if (timerRef.current) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      lastRef.current = Date.now()
      refreshRef.current?.(payload)
    }, wait)
  }, { isPrivate })
}

export function useLiveConnected() {
  const [connected, setConnected] = useState(() => liveState() === 'connected')
  useEffect(() => onLiveState((next) => setConnected(next === 'connected')), [])
  return connected
}
