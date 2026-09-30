import { sliceLineBetween } from '../../utils/geo'

// Route line + journey segment + stop layers, shared by every map that shows
// a bus route (RouteMap itself and the passenger MapView). One implementation,
// canonical geometry only: with no geometry the line layers are simply empty.

export const SRC_ROUTE = 'rm-route'
export const SRC_SEGMENT = 'rm-segment'
export const SRC_STOPS = 'rm-stops'
export const LYR_ROUTE = 'rm-route-line'
export const LYR_SEGMENT = 'rm-segment-line'
export const LYR_STOPS = 'rm-stops-circle'
export const LYR_STOP_NUMBERS = 'rm-stops-number'

export const emptyCollection = { type: 'FeatureCollection', features: [] }

export function setGeoJson(map, id, data) {
  const source = map.getSource(id)
  if (source) source.setData(data)
  else map.addSource(id, { type: 'geojson', data })
}

/**
 * routeData: { routeId, direction, geometry, stops: [{ stopId, name, sequence, type, latitude, longitude }] }
 * highlight: { fromStopId, toStopId } dims everything outside that journey.
 * acknowledgedStopIds: stop ids already passed on this leg.
 * Returns the [lng, lat] points the view should fit to.
 */
export function renderRouteLayers(map, maplibregl, routeData, { highlight = null, acknowledgedStopIds = [] } = {}) {
  const stops = routeData?.stops || []
  const line = routeData?.geometry?.coordinates?.length >= 2 ? routeData.geometry.coordinates : null

  const fromStop = highlight ? stops.find((s) => s.stopId === Number(highlight.fromStopId)) : null
  const toStop = highlight ? stops.find((s) => s.stopId === Number(highlight.toStopId)) : null
  const hasHighlight = Boolean(fromStop && toStop)
  const segment = hasHighlight && line
    ? sliceLineBetween(line, [fromStop.longitude, fromStop.latitude], [toStop.longitude, toStop.latitude])
    : []
  const lo = hasHighlight ? Math.min(fromStop.sequence, toStop.sequence) : null
  const hi = hasHighlight ? Math.max(fromStop.sequence, toStop.sequence) : null
  const passed = new Set((acknowledgedStopIds || []).map(Number))

  setGeoJson(map, SRC_ROUTE, line
    ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }
    : emptyCollection)
  setGeoJson(map, SRC_SEGMENT, segment.length >= 2
    ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: segment } }
    : emptyCollection)
  setGeoJson(map, SRC_STOPS, {
    type: 'FeatureCollection',
    features: stops.map((stop) => {
      let state = 'upcoming'
      if (hasHighlight && (stop.sequence < lo || stop.sequence > hi)) state = 'outside'
      else if (passed.has(stop.stopId)) state = 'done'
      return {
        type: 'Feature',
        properties: {
          name: stop.name,
          type: stop.type,
          state,
          seqLabel: stop.type === 'pass_through' ? '' : String(stop.sequence),
        },
        geometry: { type: 'Point', coordinates: [stop.longitude, stop.latitude] },
      }
    }),
  })

  if (!map.getLayer(LYR_ROUTE)) {
    map.addLayer({
      id: LYR_ROUTE,
      type: 'line',
      source: SRC_ROUTE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#153a6b', 'line-width': 5, 'line-opacity': 0.9 },
    })
    map.addLayer({
      id: LYR_SEGMENT,
      type: 'line',
      source: SRC_SEGMENT,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#0d9488', 'line-width': 7, 'line-opacity': 1 },
    })
    map.addLayer({
      id: LYR_STOPS,
      type: 'circle',
      source: SRC_STOPS,
      paint: {
        'circle-radius': ['match', ['get', 'type'], 'terminal', 10, 'pass_through', 4, 8],
        'circle-color': [
          'case',
          ['==', ['get', 'state'], 'outside'], '#cbd5e1',
          ['==', ['get', 'state'], 'done'], '#14b8a6',
          ['==', ['get', 'type'], 'terminal'], '#153a6b',
          ['==', ['get', 'type'], 'pass_through'], '#ffffff',
          '#0284c7',
        ],
        'circle-stroke-color': ['case', ['==', ['get', 'type'], 'pass_through'], '#64748b', '#ffffff'],
        'circle-stroke-width': 2,
      },
    })
    map.addLayer({
      id: LYR_STOP_NUMBERS,
      type: 'symbol',
      source: SRC_STOPS,
      layout: {
        'text-field': ['get', 'seqLabel'],
        'text-size': 11,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#ffffff' },
    })

    // The stop name shows on tap only, so labels can never overlap or clip.
    map.on('click', LYR_STOPS, (event) => {
      const feature = event?.features?.[0]
      if (!feature) return
      const node = document.createElement('p')
      node.style.cssText = 'margin:0;font-size:12px;font-weight:700;color:#0f172a;'
      node.textContent = String(feature.properties?.name || 'Stop')
      new maplibregl.Popup({ offset: 12 }).setLngLat(feature.geometry.coordinates).setDOMContent(node).addTo(map)
    })
    map.on('mouseenter', LYR_STOPS, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', LYR_STOPS, () => { map.getCanvas().style.cursor = '' })
  }

  // Dim the whole line when a journey segment is highlighted.
  map.setPaintProperty(LYR_ROUTE, 'line-opacity', hasHighlight ? 0.3 : 0.9)

  return line || stops.map((s) => [s.longitude, s.latitude])
}

export function fitToPoints(map, maplibregl, points, options = {}) {
  if (!points || points.length === 0) return
  const bounds = points.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(points[0], points[0]))
  map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0, ...options })
}
