import api from '../../services/api'
import { TokenManager } from '../../utils/TokenManager'
import { LYR_ROUTE, LYR_SEGMENT, LYR_STOPS, LYR_STOP_NUMBERS } from './routeLayers'

/**
 * Road-congestion layer for the driver map (TomTom Traffic Flow tiles, served through our backend).
 *
 * - The picture is TomTom's own colouring of live speed against free flow. Nothing is drawn or estimated here.
 * - Tiles come from GET {api}/traffic/flow/{z}/{x}/{y}.png on our server: the TomTom key never reaches the browser,
 *   and only a signed-in driver may ask (the map adds the staff token to those requests, see
 *   congestionTransformRequest).
 * - Batch 57 (user, 2026-11-10): the layer sits ON the route line (under the stops), because TomTom's lines are thinner
 *   than the route line and lie on the same roads: under it they were hidden. The route reads green, orange or red where
 *   traffic is known. It is placed again whenever layers change, since the route line may be drawn after it.
 * - It only exists when the app uses server-side traffic.
 */

export const SRC_CONGESTION = 'rm-congestion'
export const LYR_CONGESTION = 'rm-congestion-flow'

// Matches the backend's allowed zoom range (config/traffic.php flow_tiles); beyond it a tile is refused.
const MIN_ZOOM = 8
const MAX_ZOOM = 17
const TILE_PATH = '/traffic/flow/'

const apiBase = () => String(api.defaults?.baseURL || '').replace(/\/+$/, '')

/** Only the server-side traffic provider has a key behind the tiles; the other providers have none. */
export function isCongestionLayerAvailable() {
  return String(import.meta.env?.VITE_TRAFFIC_PROVIDER || '').trim() === 'backend'
}

export function congestionTilesUrl() {
  return `${apiBase()}${TILE_PATH}{z}/{x}/{y}.png`
}

/**
 * MapLibre transformRequest: adds the staff token (and the ngrok header the rest of the app sends) to congestion tile
 * requests only. Every other request is left exactly as it was.
 */
export function congestionTransformRequest(url) {
  const base = apiBase()
  if (!base || typeof url !== 'string' || !url.startsWith(`${base}${TILE_PATH}`)) return undefined

  const headers = { Accept: 'application/json', 'ngrok-skip-browser-warning': '1' }
  const token = TokenManager.getStaffToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return { url, headers }
}

/** The first stops layer, which the congestion colours go under (so stops stay on top); undefined when none yet. */
const stopsLayerOf = (map) => [LYR_STOPS, LYR_STOP_NUMBERS].find((id) => map.getLayer(id))

/**
 * Batch 57: keeps the congestion layer above the route lines and under the stops. Moves it only when the order is
 * wrong, so it never causes a loop of style changes.
 */
export function placeCongestionLayer(map) {
  try {
    if (!map?.getLayer?.(LYR_CONGESTION) || typeof map.moveLayer !== 'function' || typeof map.getStyle !== 'function') return
    const order = (map.getStyle()?.layers || []).map((layer) => layer.id)
    const at = order.indexOf(LYR_CONGESTION)
    const lines = [LYR_ROUTE, LYR_SEGMENT].map((id) => order.indexOf(id)).filter((i) => i >= 0)
    const stops = [LYR_STOPS, LYR_STOP_NUMBERS].map((id) => order.indexOf(id)).filter((i) => i >= 0)
    const aboveLines = lines.every((i) => i < at)
    const underStops = stops.every((i) => i > at)
    if (!aboveLines || !underStops) map.moveLayer(LYR_CONGESTION, stopsLayerOf(map))
  } catch {
    // The map is being removed: nothing to place.
  }
}

const dropLayer = (map) => {
  try {
    if (map.getLayer(LYR_CONGESTION)) map.removeLayer(LYR_CONGESTION)
    if (map.getSource(SRC_CONGESTION)) map.removeSource(SRC_CONGESTION)
  } catch {
    // The map was already removed (the host went away first): nothing is left to clean up.
  }
}

/**
 * Shows the layer. Returns a function that hides it again.
 * onProblem(): the tiles cannot be loaded (limit reached, signed out, provider down).
 * onRecover(): tiles are loading again.
 */
export function showCongestionLayer(map, { onProblem, onRecover } = {}) {
  if (!map) return () => {}

  if (!map.getSource(SRC_CONGESTION)) {
    map.addSource(SRC_CONGESTION, {
      type: 'raster',
      tiles: [congestionTilesUrl()],
      tileSize: 256,
      minzoom: MIN_ZOOM,
      maxzoom: MAX_ZOOM,
      attribution: 'Traffic &copy; TomTom',
    })
  }
  if (!map.getLayer(LYR_CONGESTION)) {
    map.addLayer(
      { id: LYR_CONGESTION, type: 'raster', source: SRC_CONGESTION, paint: { 'raster-opacity': 0.85 } },
      stopsLayerOf(map),
    )
  }
  placeCongestionLayer(map)

  const handleError = (event) => {
    if (event?.sourceId === SRC_CONGESTION) onProblem?.()
  }
  const handleSourceData = (event) => {
    if (event?.sourceId === SRC_CONGESTION && event.isSourceLoaded && event.sourceDataType !== 'metadata') onRecover?.()
  }
  const handleStyleData = () => placeCongestionLayer(map)
  map.on('error', handleError)
  map.on('sourcedata', handleSourceData)
  map.on('styledata', handleStyleData)

  return () => {
    try {
      map.off('error', handleError)
      map.off('sourcedata', handleSourceData)
      map.off('styledata', handleStyleData)
    } catch {
      // see dropLayer
    }
    dropLayer(map)
  }
}
