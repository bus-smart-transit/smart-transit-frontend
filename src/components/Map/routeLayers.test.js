import { describe, expect, it, vi } from 'vitest';
import { LYR_STOPS, SRC_STOPS, STOP_CLICK_KEY, renderRouteLayers } from './routeLayers';

function mapHarness() {
  const sources = new Map();
  const layers = new Set();
  const handlers = new Map();
  const popup = {
    setLngLat: vi.fn().mockReturnThis(),
    setDOMContent(node) { this.content = node; return this; },
    addTo: vi.fn().mockReturnThis(),
  };
  const map = {
    getSource: (id) => sources.get(id),
    addSource: (id, source) => sources.set(id, { data: source.data, setData(data) { this.data = data; } }),
    getLayer: (id) => layers.has(id),
    addLayer: (layer) => layers.add(layer.id),
    setPaintProperty: vi.fn(),
    on: (event, layer, handler) => handlers.set(`${event}:${layer}`, handler),
    getCanvas: () => ({ style: {} }),
  };

  return { map, sources, handlers, maplibregl: { Popup: vi.fn(function PopupMock() { return popup; }) }, popup };
}

const routeData = {
  routeId: 1,
  direction: 'outbound',
  geometry: { type: 'LineString', coordinates: [[125.6, 7.0], [125.7, 7.2]] },
  stops: [{ stopId: 1, name: 'Stop A', sequence: 1, type: 'stop', latitude: 7.001, longitude: 125.601, distanceToLineM: 18.4 }],
};

describe('renderRouteLayers stop offsets', () => {
  it('carries the measured source-stop offset into the stop feature and popup', () => {
    const { map, sources, handlers, maplibregl, popup } = mapHarness();

    renderRouteLayers(map, maplibregl, routeData, { showStopOffsets: true });

    const feature = sources.get(SRC_STOPS).data.features[0];
    expect(feature.properties.distanceToLineM).toBe(18.4);
    expect(feature.geometry.coordinates).toEqual([125.601, 7.001]);
    handlers.get(`click:${LYR_STOPS}`)({ features: [feature] });
    expect(popup.content.textContent).toBe('Stop A - 18.4 m from route line');
  });

  it('keeps the existing name-only popup on shared maps', () => {
    const { map, handlers, maplibregl, popup } = mapHarness();

    renderRouteLayers(map, maplibregl, routeData);
    const feature = { properties: { name: 'Stop A' }, geometry: { coordinates: [125.601, 7.001] } };
    handlers.get(`click:${LYR_STOPS}`)({ features: [feature] });
    expect(popup.content.textContent).toBe('Stop A');
  });
});
// 2026-11-21 (user): on Track Bus a stop of the chosen bus's route opens its Next arrivals card.
describe('renderRouteLayers stop clicks', () => {
  const coded = { ...routeData, stops: [{ ...routeData.stops[0], code: 'STP-A' }] };

  it('hands the stop to the map\'s stop click handler instead of the name popup', () => {
    const { map, handlers, maplibregl } = mapHarness();
    const onStopClick = vi.fn();
    map[STOP_CLICK_KEY] = onStopClick;
    renderRouteLayers(map, maplibregl, coded);

    handlers.get(`click:${LYR_STOPS}`)({ features: [{ properties: { name: 'Stop A', code: 'STP-A' }, geometry: { coordinates: [125.601, 7.001] } }] });

    expect(onStopClick).toHaveBeenCalledWith({ code: 'STP-A', name: 'Stop A' });
    expect(maplibregl.Popup).not.toHaveBeenCalled();
  });

  it('keeps the name popup when no handler is set', () => {
    const { map, handlers, maplibregl } = mapHarness();
    renderRouteLayers(map, maplibregl, coded);
    handlers.get(`click:${LYR_STOPS}`)({ features: [{ properties: { name: 'Stop A', code: 'STP-A' }, geometry: { coordinates: [125.601, 7.001] } }] });
    expect(maplibregl.Popup).toHaveBeenCalled();
  });
});
