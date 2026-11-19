import { describe, expect, it, vi } from 'vitest';

// MapLibre 6 has only named exports; every map reads `{ default: maplibregl }` from loadMapLib().
const setWorkerUrl = vi.fn();
vi.mock('maplibre-gl', () => ({ Map: class SampleMap {}, Marker: class SampleMarker {}, LngLatBounds: class SampleBounds {}, setWorkerUrl }));

describe('loadMapLib', () => {
  it('hands over the named-export module as the default the maps read', async () => {
    const { loadMapLib } = await import('./mapDependencies');
    const { default: maplibregl } = await loadMapLib();
    expect(maplibregl.Map.name).toBe('SampleMap');
    expect(maplibregl.Marker.name).toBe('SampleMarker');
    expect(typeof maplibregl.LngLatBounds).toBe('function');
    // MapLibre 6 keeps its worker in its own file; the map is told where the build put it.
    expect(setWorkerUrl).toHaveBeenCalledWith(expect.stringContaining('maplibre-gl-worker'));
  });
});
