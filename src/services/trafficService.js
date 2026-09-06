const getEnv = (name) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] || '';
  }
  return '';
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const decodePolyline = (encoded) => {
  if (!encoded || typeof encoded !== 'string') {
    return [];
  }

  let index = 0;
  const coordinates = [];
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
};

const normalizeRouteGeometry = (geometry, provider = 'fallback') => {
  if (!geometry) {
    return null;
  }

  if (provider === 'mapbox' && geometry?.type === 'LineString') {
    return geometry;
  }

  if (provider === 'ors' && typeof geometry === 'string') {
    return {
      type: 'LineString',
      coordinates: decodePolyline(geometry),
    };
  }

  if (Array.isArray(geometry)) {
    return {
      type: 'LineString',
      coordinates: geometry,
    };
  }

  return null;
};

const buildAssignedRouteAlternative = (route = {}) => {
  const routeName = route?.route_name || route?.name || route?.routeName || 'Assigned route';
  const origin = String(route?.origin || route?.from || '').toLowerCase();
  const destination = String(route?.destination || route?.to || '').toLowerCase();

  const knownCorridors = [
    { match: /davao|mata|toril|agdao|matina|ma-a|maa/, label: 'North Bypass Corridor' },
    { match: /bajada|pitong|panabo|mandug|sasa|tugbok|southern|south/, label: 'South Relief Corridor' },
    { match: /tagum|city|central|upland|bukidnon/, label: 'Central Diversion Road' },
  ];

  const matched = knownCorridors.find((item) => item.match.test(`${origin} ${destination}`) || item.match.test(String(routeName).toLowerCase()));
  const corridor = matched?.label || 'Parallel Bypass Corridor';

  return `${routeName} via ${corridor}`;
};

const toFiniteCoord = (lat, lng) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  return [parsedLng, parsedLat];
};

const extractRouteGeometryFromStops = (route = {}) => {
  const routeStops = route?.route_stops || route?.routeStops || [];
  if (!Array.isArray(routeStops) || routeStops.length < 2) return null;

  const coordinates = routeStops
    .slice()
    .sort((a, b) => Number(a?.stop_order ?? 0) - Number(b?.stop_order ?? 0))
    .map((stopRow) => {
      const lat = stopRow?.stop?.latitude ?? stopRow?.latitude;
      const lng = stopRow?.stop?.longitude ?? stopRow?.longitude;
      return toFiniteCoord(lat, lng);
    })
    .filter(Boolean);

  if (coordinates.length < 2) return null;

  return {
    type: 'LineString',
    coordinates,
  };
};

const normalizeRoadName = (value, fallback) => {
  const label = String(value || '').trim();
  if (!label || label === '-' || label.toLowerCase() === 'unnamed') {
    return fallback;
  }
  return label;
};

const buildMapboxAlerts = (routeData = {}, routeName = '') => {
  const steps = routeData?.legs?.[0]?.steps || [];
  const alerts = [];

  for (const step of steps) {
    const road = normalizeRoadName(step?.name, routeName || 'Route segment');
    const durationMinutes = Math.max(1, Math.round(Number(step?.duration || 0) / 60));
    const congestionLevel = Number(step?.congestion_numeric ?? step?.annotation?.congestion_numeric ?? 0);

    if (durationMinutes < 2 && congestionLevel < 40) {
      continue;
    }

    let severity = 'info';
    if (congestionLevel >= 65 || durationMinutes >= 8) severity = 'danger';
    else if (congestionLevel >= 40 || durationMinutes >= 4) severity = 'warn';

    alerts.push({
      road,
      severity,
      etaMinutes: durationMinutes,
      detail: `Congestion on ${road} adds around ${durationMinutes} min.`,
    });
  }

  return alerts.slice(0, 4);
};

const buildOrsAlerts = (routeData = {}, routeName = '') => {
  const steps = routeData?.segments?.[0]?.steps || [];
  const alerts = [];

  for (const step of steps) {
    const durationMinutes = Math.max(1, Math.round(Number(step?.duration || 0) / 60));
    if (durationMinutes < 2) continue;

    const road = normalizeRoadName(step?.name || step?.instruction, routeName || 'Route segment');
    const severity = durationMinutes >= 8 ? 'danger' : durationMinutes >= 4 ? 'warn' : 'info';

    alerts.push({
      road,
      severity,
      etaMinutes: durationMinutes,
      detail: `${road} segment is currently taking about ${durationMinutes} min.`,
    });
  }

  return alerts.slice(0, 4);
};

export function buildFallbackTrafficStatus({
  currentLat,
  currentLng,
  nextStop,
  route,
}) {
  const routeName = route?.route_name || route?.name || route?.routeName || '';
  const alternateRoute = routeName ? buildAssignedRouteAlternative(route) : 'parallel bypass corridor';
  const routeStopGeometry = extractRouteGeometryFromStops(route);
  const currentCoord = toFiniteCoord(currentLat, currentLng);
  const nextCoord = toFiniteCoord(nextStop?.latitude, nextStop?.longitude);
  const routeGeometry = routeStopGeometry || ((currentCoord && nextCoord)
    ? {
      type: 'LineString',
      coordinates: [currentCoord, nextCoord],
    }
    : null);

  if (!currentLat || !currentLng || !nextStop) {
    return {
      level: 'normal',
      label: 'Normal flow',
      etaMinutes: 8,
      delayMinutes: 0,
      suggestion: routeName
        ? `Assigned route ${routeName} is stable. Continue the current schedule and monitor the route.`
        : 'Continue current route and keep monitoring the next stop.',
      routeName,
      rerouteRoute: alternateRoute,
      assignedRoute: !!routeName,
      routeGeometry,
      alerts: [{
        road: routeName || 'Assigned route',
        severity: 'info',
        etaMinutes: 8,
        detail: 'Live traffic feed is unavailable; showing route fallback estimate.',
      }],
      dataSource: 'fallback',
    };
  }

  const distanceM = window?.navigator?.geolocation
    ? 1000
    : 1500;

  const estimated = clamp(Math.round(distanceM / 280), 2, 22);
  const isHeavy = estimated >= 12 || distanceM > 3000;
  const isModerate = estimated >= 7;

  if (isHeavy) {
    return {
      level: 'heavy',
      label: 'Heavy traffic',
      etaMinutes: estimated,
      delayMinutes: Math.max(3, estimated - 6),
      suggestion: routeName
        ? `Assigned route ${routeName} is heavily congested. Consider rerouting via ${alternateRoute}.`
        : 'Consider rerouting or shifting departure timing if conditions worsen.',
      routeName,
      rerouteRoute: alternateRoute,
      assignedRoute: !!routeName,
      routeGeometry,
      alerts: [{
        road: routeName || 'Assigned route',
        severity: 'danger',
        etaMinutes: estimated,
        detail: `Estimated heavy traffic with about ${estimated} min to next stop (fallback estimate).`,
      }],
      dataSource: 'fallback',
    };
  }

  if (isModerate) {
    return {
      level: 'moderate',
      label: 'Moderate traffic',
      etaMinutes: estimated,
      delayMinutes: Math.max(1, estimated - 5),
      suggestion: routeName
        ? `Assigned route ${routeName} is moderately busy. Keep the route but monitor the next stop closely.`
        : 'Keep the route and monitor the next stop closely.',
      routeName,
      rerouteRoute: alternateRoute,
      assignedRoute: !!routeName,
      routeGeometry,
      alerts: [{
        road: routeName || 'Assigned route',
        severity: 'warn',
        etaMinutes: estimated,
        detail: `Estimated moderate traffic with about ${estimated} min to next stop (fallback estimate).`,
      }],
      dataSource: 'fallback',
    };
  }

  return {
    level: 'normal',
    label: 'Normal flow',
    etaMinutes: estimated,
    delayMinutes: 0,
    suggestion: routeName
      ? `Assigned route ${routeName} is stable. Proceed normally along the assigned route.`
      : 'Proceed normally — road conditions are stable.',
    routeName,
    rerouteRoute: alternateRoute,
    assignedRoute: !!routeName,
    routeGeometry,
    alerts: [{
      road: routeName || 'Assigned route',
      severity: 'info',
      etaMinutes: estimated,
      detail: 'Route conditions appear stable in fallback mode.',
    }],
    dataSource: 'fallback',
  };
}

export async function fetchTrafficStatus({
  currentLat,
  currentLng,
  nextStop,
  route,
}) {
  if (!currentLat || !currentLng || !nextStop) {
    return buildFallbackTrafficStatus({ currentLat, currentLng, nextStop, route });
  }

  const provider = getEnv('VITE_TRAFFIC_PROVIDER') || 'fallback';
  const endpointBase = getEnv('VITE_TRAFFIC_API_BASE') || '';
  const apiKey = getEnv('VITE_TRAFFIC_API_KEY') || '';

  if (provider === 'fallback' || !endpointBase) {
    return buildFallbackTrafficStatus({ currentLat, currentLng, nextStop, route });
  }

  try {
    const url = new URL(endpointBase);
    const payload = {
      start: [Number(currentLng), Number(currentLat)],
      end: [Number(nextStop.longitude), Number(nextStop.latitude)],
    };

    if (provider === 'mapbox') {
      url.pathname = '/directions/v5/mapbox/driving-traffic';
      url.searchParams.set('access_token', apiKey);
      url.searchParams.set('geometries', 'geojson');
      url.searchParams.set('annotations', 'duration,distance,congestion_numeric,speed');
      url.searchParams.set('steps', 'true');
      url.searchParams.set('alternatives', 'true');
      url.searchParams.set('coordinates', `${payload.start.join(',')};${payload.end.join(',')}`);
    } else if (provider === 'ors') {
      url.pathname = '/v2/directions/driving-car';
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('start', `${payload.start[0]},${payload.start[1]}`);
      url.searchParams.set('end', `${payload.end[0]},${payload.end[1]}`);
      url.searchParams.set('alternatives', 'true');
      url.searchParams.set('geometry', 'true');
      url.searchParams.set('geometries', 'geojson');
      url.searchParams.set('instructions', 'true');
    } else {
      return buildFallbackTrafficStatus({ currentLat, currentLng, nextStop });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return buildFallbackTrafficStatus({ currentLat, currentLng, nextStop, route });
    }

    const data = await response.json();

    let etaMinutes = 8;
    let routeGeometry = null;
    let alternateEtaMinutes = null;
    let alternateRouteGeometry = null;
    const routeData = data?.routes?.[0];
    const alternativeData = (data?.routes || [])[1] || routeData;
    const routeName = route?.route_name || route?.name || route?.routeName || '';
    let alerts = [];

    if (provider === 'mapbox') {
      const duration = Number(routeData?.duration || 0);
      etaMinutes = duration > 0 ? Math.max(2, Math.round(duration / 60)) : 8;
      routeGeometry = normalizeRouteGeometry(routeData?.geometry, provider);
      alternateEtaMinutes = Number(alternativeData?.duration || 0) > 0 ? Math.max(2, Math.round(Number(alternativeData.duration) / 60)) : etaMinutes;
      alternateRouteGeometry = normalizeRouteGeometry(alternativeData?.geometry, provider) || routeGeometry;
      alerts = buildMapboxAlerts(routeData, routeName);
    } else if (provider === 'ors') {
      const duration = Number(routeData?.summary?.duration || 0);
      etaMinutes = duration > 0 ? Math.max(2, Math.round(duration / 60)) : 8;
      routeGeometry = normalizeRouteGeometry(routeData?.geometry, provider);
      alternateEtaMinutes = Number(alternativeData?.summary?.duration || 0) > 0 ? Math.max(2, Math.round(Number(alternativeData.summary.duration) / 60)) : etaMinutes;
      alternateRouteGeometry = normalizeRouteGeometry(alternativeData?.geometry, provider) || routeGeometry;
      alerts = buildOrsAlerts(routeData, routeName);
    }

    const level = etaMinutes >= 12 ? 'heavy' : etaMinutes >= 7 ? 'moderate' : 'normal';
    const label = level === 'heavy' ? 'Heavy traffic' : level === 'moderate' ? 'Moderate traffic' : 'Normal flow';
    const routeStopGeometry = extractRouteGeometryFromStops(route);
    const alternateRoute = routeName ? buildAssignedRouteAlternative(route) : 'parallel bypass corridor';
    const timeSavedMinutes = alternateEtaMinutes ? Math.max(0, etaMinutes - alternateEtaMinutes) : 0;

    if (alerts.length === 0) {
      alerts = [{
        road: routeName || 'Assigned route',
        severity: level === 'heavy' ? 'danger' : level === 'moderate' ? 'warn' : 'info',
        etaMinutes,
        detail: `No detailed incident segments were returned by ${provider.toUpperCase()}, using travel-time signal.`,
      }];
    }

    return {
      level,
      label,
      etaMinutes,
      delayMinutes: level === 'heavy' ? Math.max(3, etaMinutes - 6) : level === 'moderate' ? Math.max(1, etaMinutes - 5) : 0,
      suggestion: level === 'heavy'
        ? routeName
          ? `Assigned route ${routeName} is heavily congested. Consider rerouting to ${alternateRoute} to reduce delay.`
          : 'Traffic is heavy. Consider rerouting or adjusting departure timing.'
        : level === 'moderate'
          ? routeName
            ? `Assigned route ${routeName} is building congestion. Keep the route but monitor the next stop closely; ${alternateRoute} remains the safer diversion.`
            : 'Traffic is building. Keep monitoring the route and next stop.'
          : routeName
            ? `Assigned route ${routeName} is stable. Proceed normally along the assigned route.`
            : 'Proceed normally — road conditions are stable.',
      routeName,
      rerouteRoute: alternateRoute,
      assignedRoute: !!routeName,
      routeGeometry: routeGeometry || routeStopGeometry || (toFiniteCoord(currentLat, currentLng) && toFiniteCoord(nextStop?.latitude, nextStop?.longitude)
        ? {
          type: 'LineString',
          coordinates: [toFiniteCoord(currentLat, currentLng), toFiniteCoord(nextStop?.latitude, nextStop?.longitude)],
        }
        : null),
      alternateEtaMinutes: alternateEtaMinutes ?? etaMinutes,
      alternateRoute: alternateRoute,
      alternateRouteGeometry: alternateRouteGeometry || routeGeometry || routeStopGeometry || (toFiniteCoord(currentLat, currentLng) && toFiniteCoord(nextStop?.latitude, nextStop?.longitude)
        ? {
          type: 'LineString',
          coordinates: [toFiniteCoord(currentLat, currentLng), toFiniteCoord(nextStop?.latitude, nextStop?.longitude)],
        }
        : null),
      timeSavedMinutes,
      alerts,
      dataSource: provider,
    };
  } catch {
    return buildFallbackTrafficStatus({ currentLat, currentLng, nextStop, route });
  }
}
