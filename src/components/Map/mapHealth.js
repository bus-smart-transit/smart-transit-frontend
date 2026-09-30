import { MAP_CONFIG } from '../../config/mapConfig'

/**
 * Batch 25, Issue 1: a map must never fail silently. This watches a MapLibre
 * map and reports what went wrong so the host can show "Map unavailable"
 * instead of leaving a blank rectangle.
 *
 * - onFail(reason): the basemap style never loaded ('style' = the style or a
 *   core resource errored before load, 'timeout' = no load within
 *   MAP_CONFIG.styleLoadTimeoutMs). Blocking.
 * - onTrouble(): the map loaded but tiles keep failing. Not blocking.
 * - onRecover(): the map loaded late, or tiles are loading again.
 *
 * Returns a function that stops watching.
 */
export function watchMapHealth(map, { onFail, onTrouble, onRecover } = {}) {
  let loaded = false
  let failed = false
  let troubled = false
  let tileErrors = 0

  const timer = setTimeout(() => {
    if (loaded || failed) return
    failed = true
    onFail?.('timeout')
  }, MAP_CONFIG.styleLoadTimeoutMs)

  const handleLoad = () => {
    loaded = true
    clearTimeout(timer)
    if (failed) {
      failed = false
      onRecover?.()
    }
  }

  const handleError = (event) => {
    const isTileError = Boolean(event?.sourceId || event?.tile)
    if (!loaded) {
      // Before load, anything that is not a single tile (style JSON, sprite,
      // auth/CORS) means the basemap cannot be drawn.
      if (!isTileError && !failed) {
        failed = true
        clearTimeout(timer)
        onFail?.('style')
      }
      return
    }
    if (!isTileError) return
    tileErrors += 1
    if (!troubled && tileErrors >= MAP_CONFIG.tileErrorThreshold) {
      troubled = true
      onTrouble?.()
    }
  }

  const handleSourceData = (event) => {
    if (!event?.isSourceLoaded || event.sourceDataType === 'metadata') return
    tileErrors = 0
    if (troubled) {
      troubled = false
      onRecover?.()
    }
  }

  map.on('load', handleLoad)
  map.on('error', handleError)
  map.on('sourcedata', handleSourceData)

  return () => {
    clearTimeout(timer)
    map.off('load', handleLoad)
    map.off('error', handleError)
    map.off('sourcedata', handleSourceData)
  }
}
