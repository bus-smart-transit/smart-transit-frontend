import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  LYR_CONGESTION,
  SRC_CONGESTION,
  congestionTilesUrl,
  congestionTransformRequest,
  isCongestionLayerAvailable,
  showCongestionLayer,
} from './congestionLayer'
import { watchMapHealth } from './mapHealth'
import { TokenManager } from '../../utils/TokenManager'
import api from '../../services/api'

// Minimal stand-in for a MapLibre map with sources, layers and events.
function fakeMap(existingLayers = []) {
  const handlers = {}
  const sources = new Set()
  const layers = new Map(existingLayers.map((id) => [id, {}]))
  return {
    sources,
    layers,
    addedBefore: undefined,
    on: (name, fn) => { (handlers[name] ||= new Set()).add(fn) },
    off: (name, fn) => handlers[name]?.delete(fn),
    emit: (name, event = {}) => [...(handlers[name] || [])].forEach((fn) => fn(event)),
    handlerCount: (name) => handlers[name]?.size || 0,
    getSource: (id) => (sources.has(id) ? {} : undefined),
    getLayer: (id) => layers.get(id),
    addSource(id, spec) { sources.add(id); this.lastSource = spec },
    addLayer(spec, before) { layers.set(spec.id, spec); this.addedBefore = before },
    removeLayer: (id) => layers.delete(id),
    removeSource: (id) => sources.delete(id),
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  sessionStorage.clear()
  cleanup()
})

describe('congestion layer availability', () => {
  test('is only offered with server-side traffic', () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'backend')
    expect(isCongestionLayerAvailable()).toBe(true)
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'fallback')
    expect(isCongestionLayerAvailable()).toBe(false)
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', '')
    expect(isCongestionLayerAvailable()).toBe(false)
  })
})

describe('congestionTransformRequest', () => {
  test('adds the staff token to congestion tile requests only', () => {
    sessionStorage.setItem('staff_token', 'driver-token')
    const base = String(api.defaults.baseURL).replace(/\/+$/, '')

    const tile = congestionTransformRequest(`${base}/traffic/flow/12/3477/1967.png`)
    expect(tile.headers.Authorization).toBe('Bearer driver-token')
    expect(tile.headers['ngrok-skip-browser-warning']).toBe('1')

    expect(congestionTransformRequest('https://basemaps.cartocdn.com/gl/positron-gl-style/style.json')).toBeUndefined()
    expect(congestionTransformRequest(`${base}/trips`)).toBeUndefined()
  })

  test('sends no Authorization header when nobody is signed in', () => {
    const base = String(api.defaults.baseURL).replace(/\/+$/, '')
    expect(TokenManager.getStaffToken()).toBeNull()
    expect(congestionTransformRequest(`${base}/traffic/flow/12/1/1.png`).headers.Authorization).toBeUndefined()
  })

  test('tiles come from our server, never from TomTom', () => {
    expect(congestionTilesUrl()).toContain('/traffic/flow/{z}/{x}/{y}.png')
    expect(congestionTilesUrl()).not.toContain('tomtom')
    expect(congestionTilesUrl()).not.toContain('key=')
  })
})

describe('showCongestionLayer', () => {
  test('adds a raster layer under the route line and removes it again', () => {
    const map = fakeMap(['rm-route-line', 'rm-stops-circle'])
    const hide = showCongestionLayer(map)

    expect(map.sources.has(SRC_CONGESTION)).toBe(true)
    expect(map.layers.has(LYR_CONGESTION)).toBe(true)
    expect(map.addedBefore).toBe('rm-route-line')

    hide()
    expect(map.sources.has(SRC_CONGESTION)).toBe(false)
    expect(map.layers.has(LYR_CONGESTION)).toBe(false)
    expect(map.handlerCount('error')).toBe(0)
  })

  test('reports a tile problem for its own source only, and recovery', () => {
    const map = fakeMap()
    const onProblem = vi.fn()
    const onRecover = vi.fn()
    showCongestionLayer(map, { onProblem, onRecover })

    map.emit('error', { sourceId: 'composite' })
    expect(onProblem).not.toHaveBeenCalled()

    map.emit('error', { sourceId: SRC_CONGESTION })
    expect(onProblem).toHaveBeenCalledTimes(1)

    map.emit('sourcedata', { sourceId: SRC_CONGESTION, isSourceLoaded: true, sourceDataType: 'content' })
    expect(onRecover).toHaveBeenCalledTimes(1)
  })

  test('does not fail when the map is already gone', () => {
    const map = fakeMap()
    const hide = showCongestionLayer(map)
    map.getLayer = () => { throw new Error('map removed') }
    expect(() => hide()).not.toThrow()
  })
})

describe('map health', () => {
  test('congestion tile failures never turn into "some map tiles could not be loaded"', () => {
    const map = fakeMap()
    const onTrouble = vi.fn()
    watchMapHealth(map, { onTrouble })
    map.emit('load')

    for (let i = 0; i < 20; i += 1) map.emit('error', { sourceId: SRC_CONGESTION })
    expect(onTrouble).not.toHaveBeenCalled()
  })
})

// The driver map toggle, with the map itself replaced by a stub that hands over a fake MapLibre map.
vi.mock('../Map/RouteMap', async () => {
  const React = await import('react')
  return {
    default: function RouteMapStub({ onMapReady }) {
      React.useEffect(() => {
        globalThis.__fakeMap = globalThis.__makeFakeMap()
        onMapReady?.(globalThis.__fakeMap, {})
      }, [onMapReady])
      return React.createElement('div', { 'data-testid': 'route-map' })
    },
  }
})

describe('DriverNavigationMap congestion toggle', () => {
  const trip = { leg_direction: 'outbound', fleet_route: { route: { route_id: 1, origin: 'A', destination: 'B' } } }

  test('is hidden unless server-side traffic is on', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'fallback')
    globalThis.__makeFakeMap = () => fakeMap()
    const { default: DriverNavigationMap } = await import('../Staff/DriverNavigationMap')
    render(<DriverNavigationMap trip={trip} stops={[]} lastGpsRef={{ current: null }} />)
    expect(screen.queryByRole('button', { name: /traffic congestion/i })).toBeNull()
  })

  test('is off by default, shows the layer and legend when switched on, and hides them again', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'backend')
    globalThis.__makeFakeMap = () => fakeMap(['rm-route-line'])
    const { default: DriverNavigationMap } = await import('../Staff/DriverNavigationMap')
    render(<DriverNavigationMap trip={trip} stops={[]} lastGpsRef={{ current: null }} />)

    const button = await screen.findByRole('button', { name: /traffic congestion/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText(/compared with free flow/i)).toBeNull()
    expect(globalThis.__fakeMap.layers.has(LYR_CONGESTION)).toBe(false)

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(globalThis.__fakeMap.layers.has(LYR_CONGESTION)).toBe(true)
    expect(screen.getByText(/compared with free flow, from TomTom/i)).toBeInTheDocument()

    fireEvent.click(button)
    expect(globalThis.__fakeMap.layers.has(LYR_CONGESTION)).toBe(false)
    expect(screen.queryByText(/compared with free flow/i)).toBeNull()
  })

  test('says the colours are unavailable when the tiles fail', async () => {
    vi.stubEnv('VITE_TRAFFIC_PROVIDER', 'backend')
    globalThis.__makeFakeMap = () => fakeMap()
    const { default: DriverNavigationMap } = await import('../Staff/DriverNavigationMap')
    render(<DriverNavigationMap trip={trip} stops={[]} lastGpsRef={{ current: null }} />)

    fireEvent.click(await screen.findByRole('button', { name: /traffic congestion/i }))
    const { act } = await import('@testing-library/react')
    act(() => globalThis.__fakeMap.emit('error', { sourceId: SRC_CONGESTION }))

    expect(await screen.findByText(/congestion colours are unavailable/i)).toBeInTheDocument()
  })
})
