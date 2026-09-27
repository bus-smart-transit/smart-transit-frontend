import { LOCATIONS } from '../../data/mockData'

export function createBusMarkerElement() {
  const el = document.createElement('div')
  Object.assign(el.style, {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'white',
    border: '3px solid #f59e0b',
    boxShadow: '0 3px 12px rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  })
  el.innerHTML = `
    <div style="width:34px;height:34px;border-radius:9px;background:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:20px;">
      🚌
    </div>`
  return el
}

export function createCircleMarkerElement(color) {
  const el = document.createElement('div')
  Object.assign(el.style, {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: color,
    border: '3px solid #0a0e1a',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.15)',
  })
  return el
}

export function normalizeLocation(name) {
  if (!name) return ''
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function getLocationCoordinates(name) {
  const normalized = normalizeLocation(name)
  if (LOCATIONS[normalized]) {
    return LOCATIONS[normalized]
  }
  const key = Object.keys(LOCATIONS).find(
    (location) => normalized.includes(location) || location.includes(normalized),
  )
  if (key) {
    return LOCATIONS[key]
  }
  return null
}

export function getTripLocations(trip) {
  if (trip.origin && trip.destination) {
    return {
      originName: trip.origin,
      destinationName: trip.destination,
      origin: getLocationCoordinates(trip.origin),
      destination: getLocationCoordinates(trip.destination),
    }
  }

  if (trip.route) {
    const parts = trip.route.split(/\s[-–—]\s/)

    if (parts.length >= 2) {
      const originName = parts[0].trim()
      const destinationName = parts.slice(1).join(' - ').trim()

      return {
        originName,
        destinationName,
        origin: getLocationCoordinates(originName),
        destination: getLocationCoordinates(destinationName),
      }
    }
  }

  return {
    originName: 'Unknown',
    destinationName: 'Unknown',
    origin: null,
    destination: null,
  }
}

export function getPointAlongRoute(route, progress) {
  if (!route || route.length === 0) {
    return null
  }
  if (route.length === 1) {
    return route[0]
  }

  const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0))
  const distances = []
  let totalDistance = 0

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i]
    const end = route[i + 1]
    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2),
    )
    distances.push(distance)
    totalDistance += distance
  }

  const targetDistance = totalDistance * safeProgress
  let accumulatedDistance = 0

  for (let i = 0; i < distances.length; i++) {
    const segmentDistance = distances[i]

    if (accumulatedDistance + segmentDistance >= targetDistance) {
      const distanceIntoSegment = targetDistance - accumulatedDistance
      const segmentProgress =
        segmentDistance === 0 ? 0 : distanceIntoSegment / segmentDistance

      const start = route[i]
      const end = route[i + 1]

      return [
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress,
      ]
    }

    accumulatedDistance += segmentDistance
  }

  return route[route.length - 1]
}

export function getCompletedRoute(route, progress) {
  if (!route || route.length === 0) {
    return []
  }
  if (route.length === 1) {
    return route
  }

  const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0))

  if (safeProgress <= 0) {
    return [route[0]]
  }
  if (safeProgress >= 1) {
    return route
  }

  const distances = []
  let totalDistance = 0

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i]
    const end = route[i + 1]
    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2),
    )
    distances.push(distance)
    totalDistance += distance
  }

  const targetDistance = totalDistance * safeProgress
  let accumulatedDistance = 0
  const completed = [route[0]]

  for (let i = 0; i < distances.length; i++) {
    const segmentDistance = distances[i]

    if (accumulatedDistance + segmentDistance >= targetDistance) {
      const distanceIntoSegment = targetDistance - accumulatedDistance
      const segmentProgress =
        segmentDistance === 0 ? 0 : distanceIntoSegment / segmentDistance

      const start = route[i]
      const end = route[i + 1]

      completed.push([
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress,
      ])

      break
    }

    completed.push(route[i + 1])
    accumulatedDistance += segmentDistance
  }

  return completed
}
