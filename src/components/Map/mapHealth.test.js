import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { watchMapHealth } from './mapHealth'
import { MAP_CONFIG } from '../../config/mapConfig'

// Minimal stand-in for a MapLibre map: on/off/emit.
function fakeMap() {
  const handlers = {}
  return {
    on: (name, fn) => { (handlers[name] ||= new Set()).add(fn) },
    off: (name, fn) => handlers[name]?.delete(fn),
    emit: (name, event = {}) => [...(handlers[name] || [])].forEach((fn) => fn(event)),
    count: (name) => handlers[name]?.size || 0,
  }
}

describe('watchMapHealth', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('a style error before load is fatal', () => {
    const map = fakeMap()
    const onFail = vi.fn()
    watchMapHealth(map, { onFail })
    map.emit('error', { error: new Error('style 403') })
    expect(onFail).toHaveBeenCalledWith('style')
  })

  test('a single tile error before load is not fatal', () => {
    const map = fakeMap()
    const onFail = vi.fn()
    watchMapHealth(map, { onFail })
    map.emit('error', { sourceId: 'carto', error: new Error('tile 404') })
    expect(onFail).not.toHaveBeenCalled()
  })

  test('no load within the timeout is fatal, and a late load recovers', () => {
    const map = fakeMap()
    const onFail = vi.fn()
    const onRecover = vi.fn()
    watchMapHealth(map, { onFail, onRecover })
    vi.advanceTimersByTime(MAP_CONFIG.styleLoadTimeoutMs + 1)
    expect(onFail).toHaveBeenCalledWith('timeout')
    map.emit('load')
    expect(onRecover).toHaveBeenCalled()
  })

  test('load before the timeout means no failure', () => {
    const map = fakeMap()
    const onFail = vi.fn()
    watchMapHealth(map, { onFail })
    map.emit('load')
    vi.advanceTimersByTime(MAP_CONFIG.styleLoadTimeoutMs * 2)
    expect(onFail).not.toHaveBeenCalled()
  })

  test('repeated tile errors after load raise trouble once, a loaded source recovers', () => {
    const map = fakeMap()
    const onTrouble = vi.fn()
    const onRecover = vi.fn()
    watchMapHealth(map, { onTrouble, onRecover })
    map.emit('load')
    for (let i = 0; i < MAP_CONFIG.tileErrorThreshold + 3; i += 1) {
      map.emit('error', { sourceId: 'carto' })
    }
    expect(onTrouble).toHaveBeenCalledTimes(1)
    map.emit('sourcedata', { isSourceLoaded: true, sourceDataType: 'content' })
    expect(onRecover).toHaveBeenCalledTimes(1)
  })

  test('a successful tile resets the error streak', () => {
    const map = fakeMap()
    const onTrouble = vi.fn()
    watchMapHealth(map, { onTrouble })
    map.emit('load')
    for (let i = 0; i < MAP_CONFIG.tileErrorThreshold - 1; i += 1) map.emit('error', { sourceId: 'carto' })
    map.emit('sourcedata', { isSourceLoaded: true, sourceDataType: 'content' })
    for (let i = 0; i < MAP_CONFIG.tileErrorThreshold - 1; i += 1) map.emit('error', { sourceId: 'carto' })
    expect(onTrouble).not.toHaveBeenCalled()
  })

  test('the returned function stops watching', () => {
    const map = fakeMap()
    const onFail = vi.fn()
    const stop = watchMapHealth(map, { onFail })
    stop()
    expect(map.count('error')).toBe(0)
    vi.advanceTimersByTime(MAP_CONFIG.styleLoadTimeoutMs * 2)
    expect(onFail).not.toHaveBeenCalled()
  })

  test('a hidden tab does not start the clock, so a background tab is not reported as failed', () => {
    let visibility = 'hidden'
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
    const map = fakeMap()
    const onFail = vi.fn()
    watchMapHealth(map, { onFail })

    vi.advanceTimersByTime(MAP_CONFIG.styleLoadTimeoutMs * 3)
    expect(onFail).not.toHaveBeenCalled()

    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(MAP_CONFIG.styleLoadTimeoutMs + 1)
    expect(onFail).toHaveBeenCalledWith('timeout')
    spy.mockRestore()
  })})
