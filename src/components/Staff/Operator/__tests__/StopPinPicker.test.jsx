import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useState } from 'react';
import StopPinPicker from '../StopPinPicker';

const lib = vi.hoisted(() => {
  const state = { maps: [], markers: [] };
  class FakeMarker {
    constructor(options = {}) { this.options = options; this.handlers = {}; this.lngLat = null; state.markers.push(this); }
    setLngLat(at) { this.lngLat = Array.isArray(at) ? { lng: at[0], lat: at[1] } : at; return this; }
    getLngLat() { return this.lngLat; }
    addTo() { this.added = true; return this; }
    on(name, fn) { this.handlers[name] = fn; return this; }
    remove() { this.removed = true; }
  }
  class FakeMap {
    constructor(options) { this.options = options; this.handlers = {}; this.flights = []; state.maps.push(this); }
    on(name, fn) { this.handlers[name] = fn; }
    once(name, fn) { this.handlers[`once:${name}`] = fn; }
    addControl() {}
    getZoom() { return 10; }
    flyTo(options) { this.flights.push(options); }
    resize() {}
    remove() { this.removed = true; }
  }
  return { state, FakeMap, FakeMarker };
});

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('../../../Map/mapDependencies', () => ({
  loadMapLib: () => Promise.resolve({ default: { Map: lib.FakeMap, Marker: lib.FakeMarker, NavigationControl: class {} } }),
}));
vi.mock('../../../Map/mapHealth', () => ({ watchMapHealth: () => () => {} }));
vi.mock('../../../../services/regionService', () => ({
  getRegion: () => Promise.resolve({ bounds: { minLat: 6, maxLat: 8, minLng: 125, maxLng: 127 } }),
  regionMapBounds: (region) => [[region.bounds.minLng, region.bounds.minLat], [region.bounds.maxLng, region.bounds.maxLat]],
}));

function Harness({ start = { latitude: '', longitude: '' }, otherStops = [] }) {
  const [pin, setPin] = useState(start);
  return (
    <>
      <StopPinPicker latitude={pin.latitude} longitude={pin.longitude} onChange={setPin} otherStops={otherStops} />
      <output>{`${pin.latitude}|${pin.longitude}`}</output>
    </>
  );
}

const shown = () => document.querySelector('output').textContent;
const draggablePin = () => lib.state.markers.find((marker) => marker.options.draggable);

const loadMap = async () => {
  await waitFor(() => expect(lib.state.maps).toHaveLength(1));
  const map = lib.state.maps[0];
  act(() => { map.handlers['once:load'](); });
  return map;
};

describe('StopPinPicker', () => {
  beforeEach(() => {
    lib.state.maps.length = 0;
    lib.state.markers.length = 0;
  });

  it('opens on the region and puts the pin where the map is tapped', async () => {
    render(<Harness />);
    const map = await loadMap();
    expect(map.options.bounds).toEqual([[125, 6], [127, 8]]);
    expect(screen.getByText(/Tap the map where the stop is/)).toBeInTheDocument();

    act(() => { map.handlers.click({ lngLat: { lat: 7.07123456, lng: 125.61234567 } }); });
    expect(shown()).toBe('7.071235|125.612346');
    expect(draggablePin().lngLat).toEqual({ lng: 125.612346, lat: 7.071235 });
  });

  it('flies to an existing pin, and moves it by dragging and by typing the numbers', async () => {
    render(<Harness start={{ latitude: '7.1', longitude: '125.6' }} />);
    const map = await loadMap();
    expect(map.flights[0].center).toEqual([125.6, 7.1]);
    const pin = draggablePin();

    pin.lngLat = { lat: 7.2, lng: 125.7 };
    act(() => { pin.handlers.dragend(); });
    expect(shown()).toBe('7.2|125.7');

    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '7.3' } });
    expect(shown()).toBe('7.3|125.7');
    expect(pin.lngLat).toEqual({ lng: 125.7, lat: 7.3 });
  });

  it('shows the other stops as dots and uses the phone location on request', async () => {
    const getCurrentPosition = vi.fn((ok) => ok({ coords: { latitude: 7.05, longitude: 125.55 } }));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    render(<Harness otherStops={[{ stop_id: 1, stop_name: 'Market', latitude: 7.01, longitude: 125.5 }, { stop_id: 2, stop_name: 'No place', latitude: null, longitude: null }]} />);
    await loadMap();
    const dots = lib.state.markers.filter((marker) => marker.options.element);
    expect(dots).toHaveLength(1);
    expect(dots[0].options.element.title).toBe('Market');

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(shown()).toBe('7.05|125.55');
  });

  it('says so when the location cannot be found', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) } });
    render(<Harness />);
    await loadMap();
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Your location could not be found');
  });

  it('opens a full-screen map and closes it with Done', async () => {
    render(<Harness />);
    await loadMap();
    fireEvent.click(screen.getByRole('button', { name: 'Full screen map' }));
    expect(screen.getByText('Tap the map to place the stop')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByText('Tap the map to place the stop')).not.toBeInTheDocument();
  });
});
