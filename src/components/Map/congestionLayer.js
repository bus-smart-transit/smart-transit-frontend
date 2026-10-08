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
 * - The layer sits under the route line and stops, so the driver's route is never hidden by it.
 * - It is off until the driver switches it on, and it only exists when the app uses server-side traffic.
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
    // Under the route line and stops when they exist, so the route stays readable on top of the colours.
    const beforeId = [LYR_ROUTE, LYR_SEGMENT, LYR_STOPS, LYR_STOP_NUMBERS].find((id) => map.getLayer(id))
    map.addLayer(
      { id: LYR_CONGESTION, type: 'raster', source: SRC_CONGESTION, paint: { 'raster-opacity': 0.85 } },
      beforeId,
    )
  }

  const handleError = (event) => {
    if (event?.sourceId === SRC_CONGESTION) onProblem?.()
  }
  const handleSourceData = (event) => {
    if (event?.sourceId === SRC_CONGESTION && event.isSourceLoaded && event.sourceDataType !== 'metadata') onRecover?.()
  }
  map.on('error', handleError)
  map.on('sourcedata', handleSourceData)

  return () => {
    try {
      map.off('error', handleError)
      map.off('sourcedata', handleSourceData)
    } catch {
      // see dropLayer
    }
    dropLayer(map)
  }
}
