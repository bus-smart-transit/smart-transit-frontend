import { deriveCorridorName } from '../utils/corridor';
import { TRAFFIC_CONFIG } from '../config/trafficConfig';

const getEnv = (name) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name] || '';
  }
  return '';
};

const normalizeRoadName = (value, fallback) => {
  const label = String(value || '').trim();
  if (!label || label === '-' || label.toLowerCase() === 'unnamed') {
    return fallback;
  }
  return label;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let trafficFailureCount = 0;
let trafficBackoffUntil = 0;

const shouldRetryStatus = (status) => [406, 408, 429, 500, 502, 503, 504].includes(Number(status));

async function fetchWithRetry(url, options, { attempts = 3, baseDelayMs = 1000 } = {}) {
  let lastResponse = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      lastResponse = response;
      if (attempt >= attempts || !shouldRetryStatus(response.status)) {
        return response;
      }
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
    }

    await sleep(baseDelayMs * (2 ** (attempt - 1)));
  }

  return lastResponse;
}

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
    // ORS reports free-flow times only: a long segment is not evidence of congestion.
    const severity = 'info';

    alerts.push({
      road,
      severity,
      etaMinutes: durationMinutes,
      detail: `${road} segment is currently taking about ${durationMinutes} min.`,
    });
  }

  return alerts.slice(0, 4);
};

/**
 * "Unavailable" status: no provider, a failed request, or a provider answer
 * without a travel time. Never carries an invented ETA, delay or route name.
 */
export function buildFallbackTrafficStatus({
  route,
  stops,
  label = 'Live traffic unavailable',
  detail = 'Traffic provider data is unavailable; no ETA or delay estimate is shown.',
  dataSource = 'fallback',
} = {}) {
  const routeName = route?.route_name || route?.name || route?.routeName || '';
  const corridorName = deriveCorridorName(stops);

  return {
    level: 'unknown',
    label,
    etaMinutes: null,
    delayMinutes: null,
    suggestion: routeName
      ? `Live provider traffic data for ${routeName} is currently unavailable. Follow dispatcher guidance and on-road conditions.`
      : 'Live provider traffic data is currently unavailable. Follow dispatcher guidance and on-road conditions.',
    routeName,
    corridorName,
    alerts: [{
      road: routeName || 'Assigned route',
      severity: 'info',
      etaMinutes: null,
      detail,
    }],
    dataSource,
  };
}

/**
 * The provider's free-flow (no traffic) travel time for the same trip: the baseline that
 * congestion is judged against. Null when it cannot be had, which keeps the level unknown.
 */
async function fetchMapboxFreeFlowSeconds(liveUrl) {
  try {
    const free = new URL(liveUrl.toString());
    free.pathname = '/directions/v5/mapbox/driving';
    free.searchParams.delete('annotations');
    free.searchParams.set('steps', 'false');
    const response = await fetchWithRetry(free.toString(), { method: 'GET', headers: { Accept: 'application/json' } }, { attempts: 2 });
    if (!response.ok) return null;
    const seconds = Number((await response.json())?.routes?.[0]?.duration);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}

export async function fetchTrafficStatus({
  currentLat,
  currentLng,
  nextStop,
  route,
  stops,
}) {
  if (!currentLat || !currentLng || !nextStop) {
    return buildFallbackTrafficStatus({ route, stops });
  }

  const provider = getEnv('VITE_TRAFFIC_PROVIDER') || 'fallback';
  const endpointBase = getEnv('VITE_TRAFFIC_API_BASE') || '';
  const apiKey = getEnv('VITE_TRAFFIC_API_KEY') || '';

  if (provider === 'fallback' || !endpointBase) {
    return buildFallbackTrafficStatus({ route, stops });
  }

  if (Date.now() < trafficBackoffUntil) {
    return buildFallbackTrafficStatus({ route, stops });
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
      url.searchParams.set('annotations', 'duration,distance,congestion_numeric,speed');
      url.searchParams.set('steps', 'true');
      url.searchParams.set('coordinates', `${payload.start.join(',')};${payload.end.join(',')}`);
    } else if (provider === 'ors') {
      url.pathname = '/v2/directions/driving-car';
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('start', `${payload.start[0]},${payload.start[1]}`);
      url.searchParams.set('end', `${payload.end[0]},${payload.end[1]}`);
      url.searchParams.set('instructions', 'true');
    } else {
      return buildFallbackTrafficStatus({ route, stops });
    }

    const response = await fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        Accept: provider === 'ors' ? 'application/geo+json, application/json;q=0.9' : 'application/json',
      },
    });

    if (!response.ok) {
      trafficFailureCount += 1;
      if (trafficFailureCount >= 2) {
        trafficBackoffUntil = Date.now() + Math.min(60000, 15000 * trafficFailureCount);
      }
      return buildFallbackTrafficStatus({ route, stops });
    }

    trafficFailureCount = 0;
    trafficBackoffUntil = 0;

    const data = await response.json();

    const routeData = data?.routes?.[0];
    const routeName = route?.route_name || route?.name || route?.routeName || '';
    const corridorName = deriveCorridorName(stops);
    const durationSeconds = Number(provider === 'mapbox' ? routeData?.duration : routeData?.summary?.duration);

    // A provider answer without a travel time is "unavailable", never a default.
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return buildFallbackTrafficStatus({
        route,
        stops,
        label: 'ETA unavailable',
        detail: `${provider.toUpperCase()} returned no travel time for this trip; no ETA or delay estimate is shown.`,
        dataSource: provider,
      });
    }

    const etaMinutes = Math.max(2, Math.round(durationSeconds / 60));
    const alerts = provider === 'mapbox' ? buildMapboxAlerts(routeData, routeName) : buildOrsAlerts(routeData, routeName);

    // Congestion is only claimed against a real baseline: the provider's own free-flow time
    // for this same trip. Without one (ORS has no traffic data, or the baseline request
    // failed) the level is unknown and no delay figure is shown.
    const freeFlowSeconds = provider === 'mapbox' ? await fetchMapboxFreeFlowSeconds(url) : null;
    let level = 'unknown';
    let delayMinutes = null;
    if (freeFlowSeconds) {
      delayMinutes = Math.max(0, Math.round((durationSeconds - freeFlowSeconds) / 60));
      const ratio = (durationSeconds - freeFlowSeconds) / freeFlowSeconds;
      const { moderate, heavy } = TRAFFIC_CONFIG.delayRatio;
      const significant = delayMinutes >= TRAFFIC_CONFIG.minDelayMinutes;
      level = significant && ratio >= heavy ? 'heavy' : significant && ratio >= moderate ? 'moderate' : 'normal';
    }
    const label = level === 'heavy' ? 'Heavy traffic' : level === 'moderate' ? 'Moderate traffic' : level === 'normal' ? 'Normal flow' : 'Travel time only';
    const where = routeName ? `Assigned route ${routeName}${corridorName ? ` (${corridorName})` : ''}` : null;

    return {
      level,
      label,
      etaMinutes,
      delayMinutes,
      suggestion: level === 'unknown'
        ? `${where ? `${where}: ` : ''}travel time to the next stop from the routing provider. Live congestion data is not available; follow dispatcher guidance and on-road conditions.`
        : level === 'heavy'
        ? where
          ? `${where} is heavily congested. Follow dispatcher guidance and watch the next stop closely.`
          : 'Traffic is heavy. Follow dispatcher guidance and adjust departure timing if instructed.'
        : level === 'moderate'
          ? where
            ? `${where} is building congestion. Monitor the next stop closely.`
            : 'Traffic is building. Keep monitoring the route and next stop.'
          : where
            ? `${where} is stable. Proceed normally.`
            : 'Proceed normally — road conditions are stable.',
      routeName,
      corridorName,
      alerts: alerts.length > 0
        ? alerts
        : [{
          road: routeName || 'Assigned route',
          severity: level === 'heavy' ? 'danger' : level === 'moderate' ? 'warn' : 'info',
          etaMinutes,
          detail: `No detailed incident segments were returned by ${provider.toUpperCase()}, using travel-time signal.`,
        }],
      dataSource: provider,
    };
  } catch {
    return buildFallbackTrafficStatus({ route, stops });
  }
}