/**
 * Batch 78 (user, 2026-11-17: "the pins often disappear and I have to refresh the page"): draw on the map now if its
 * style is ready, otherwise once it is idle. Returns a cleanup for the effect that called it: it cancels a draw still
 * waiting, so a run that was replaced (often holding an empty list, from the page load or while a bus was chosen) can no
 * longer overwrite the newer drawing when the map finally goes idle.
 */
export default function drawWhenReady(map, draw) {
  if (!map) return () => {};
  if (map.isStyleLoaded?.()) {
    draw();
    return () => {};
  }
  map.once?.('idle', draw);
  return () => { map.off?.('idle', draw); };
}
