import { describe, expect, it } from 'vitest';
import drawWhenReady from './drawWhenReady';

/** A tiny stand-in for a MapLibre map: idle listeners, and a style that is loading or ready. */
function fakeMap(loaded) {
  const listeners = new Set();
  return {
    loaded,
    isStyleLoaded() { return this.loaded; },
    once(event, fn) { if (event === 'idle') listeners.add(fn); },
    off(event, fn) { if (event === 'idle') listeners.delete(fn); },
    goIdle() { const fns = [...listeners]; listeners.clear(); fns.forEach((fn) => fn()); },
  };
}

describe('drawWhenReady (Batch 78)', () => {
  it('draws at once when the map is ready', () => {
    const drawn = [];
    drawWhenReady(fakeMap(true), () => drawn.push('pins'));
    expect(drawn).toEqual(['pins']);
  });

  it('waits for the map to be idle when it is busy', () => {
    const map = fakeMap(false);
    const drawn = [];
    drawWhenReady(map, () => drawn.push('pins'));
    expect(drawn).toEqual([]);
    map.goIdle();
    expect(drawn).toEqual(['pins']);
  });

  // The bug the user saw: the page-load run (no stops yet) waited for idle, the stops then arrived and were drawn, and
  // the old empty draw ran last and wiped the pins until a refresh.
  it('never lets a replaced draw overwrite a newer one', () => {
    const map = fakeMap(false);
    let pins = [];
    const cleanupOld = drawWhenReady(map, () => { pins = []; });
    cleanupOld(); // the effect re-ran with the stops
    map.loaded = true;
    drawWhenReady(map, () => { pins = ['Stop A', 'Stop B']; });
    map.goIdle();
    expect(pins).toEqual(['Stop A', 'Stop B']);
  });
});
