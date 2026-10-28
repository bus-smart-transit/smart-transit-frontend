/**
 * 2026-10-29: the app's own map icons, drawn as inline SVG (sharp on phones, no image files, no third party), and
 * used by every map:
 *
 *  - The bus: a round badge in the status colour with a front-view bus in white. A small arrow on the badge's edge
 *    points the way the bus is heading; the bus itself stays upright so it is always readable.
 *  - "You are here": a teal map pin with a white dot, with a soft pulse under it, for the passenger's own position.
 *
 * Each create* function returns a DOM element for a MapLibre Marker (new maplibregl.Marker({ element })), plus small
 * setters for what changes while the marker is on the map.
 */

export const BUS_COLORS = {
  live: '#0d9488', // teal: a fresh GPS position on the route
  warning: '#f59e0b', // amber: off the route, or delayed
  stale: '#94a3b8', // grey: the position is old or weak
  selected: '#0f766e',
};

const BUS_SIZE = 40;

/** The bus badge as SVG markup (also used inline, e.g. in a map legend). */
export function busIconSvg(color = BUS_COLORS.live, size = BUS_SIZE) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="17" fill="${color}" stroke="#ffffff" stroke-width="3"/>
  <rect x="11.5" y="10" width="17" height="18" rx="3.5" fill="#ffffff"/>
  <rect x="13.5" y="12.5" width="13" height="7" rx="1.5" fill="${color}" opacity="0.85"/>
  <rect x="14" y="10.8" width="12" height="1.2" rx="0.6" fill="${color}" opacity="0.5"/>
  <circle cx="15" cy="23.5" r="1.6" fill="${color}"/>
  <circle cx="25" cy="23.5" r="1.6" fill="${color}"/>
  <rect x="12.5" y="28" width="4" height="2.6" rx="1" fill="#ffffff"/>
  <rect x="23.5" y="28" width="4" height="2.6" rx="1" fill="#ffffff"/>
</svg>`;
}

const HEADING_ARROW = `<svg xmlns="http://www.w3.org/2000/svg" width="${BUS_SIZE + 12}" height="${BUS_SIZE + 12}" viewBox="0 0 52 52" aria-hidden="true">
  <path d="M26 1 L31 8 L21 8 Z" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

/**
 * @param {{ color?: string, heading?: number|null, title?: string }} options
 * @returns {{ element: HTMLElement, setColor: (color: string) => void, setHeading: (deg: number|null) => void }}
 */
export function createBusMarkerElement({ color = BUS_COLORS.live, heading = null, title = 'Bus' } = {}) {
  const element = document.createElement('div');
  element.className = 'st-bus-marker';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', title);
  element.title = title;
  element.style.cssText = `position:relative;width:${BUS_SIZE}px;height:${BUS_SIZE}px;cursor:pointer;filter:drop-shadow(0 2px 3px rgba(15,23,42,0.35));`;

  const arrow = document.createElement('div');
  arrow.className = 'st-bus-heading';
  arrow.style.cssText = `position:absolute;left:-6px;top:-6px;width:${BUS_SIZE + 12}px;height:${BUS_SIZE + 12}px;pointer-events:none;transition:transform 0.4s linear;`;
  arrow.innerHTML = HEADING_ARROW;

  const badge = document.createElement('div');
  badge.className = 'st-bus-badge';
  badge.style.cssText = `position:absolute;inset:0;`;
  badge.innerHTML = busIconSvg(color);

  element.appendChild(arrow);
  element.appendChild(badge);

  const setColor = (next) => {
    badge.innerHTML = busIconSvg(next || BUS_COLORS.live);
  };
  const setHeading = (deg) => {
    const valid = typeof deg === 'number' && Number.isFinite(deg);
    arrow.style.display = valid ? 'block' : 'none';
    if (valid) arrow.style.transform = `rotate(${deg}deg)`;
  };
  setHeading(heading);

  return { element, setColor, setHeading };
}

let pulseStyleAdded = false;
function ensurePulseStyle() {
  if (pulseStyleAdded || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = '@keyframes st-you-pulse{0%{transform:scale(0.6);opacity:0.55}100%{transform:scale(1.9);opacity:0}}';
  document.head.appendChild(style);
  pulseStyleAdded = true;
}

/** The passenger's own position: a pin whose tip sits on the spot (use anchor: 'bottom'). */
export function createYouAreHereElement({ title = 'You are here' } = {}) {
  ensurePulseStyle();
  const element = document.createElement('div');
  element.className = 'st-you-marker';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', title);
  element.title = title;
  element.style.cssText = 'position:relative;width:30px;height:40px;filter:drop-shadow(0 2px 3px rgba(15,23,42,0.35));';
  element.innerHTML = `
    <span style="position:absolute;left:5px;bottom:-4px;width:20px;height:8px;border-radius:50%;background:rgba(13,148,136,0.45);animation:st-you-pulse 1.8s ease-out infinite;"></span>
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40" aria-hidden="true" style="position:absolute;inset:0;">
      <path d="M15 1C7.3 1 1.5 6.9 1.5 14.3c0 9.6 11.6 22.3 12.1 22.9a1.9 1.9 0 0 0 2.8 0c.5-.6 12.1-13.3 12.1-22.9C28.5 6.9 22.7 1 15 1z" fill="#0f766e" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="15" cy="14.5" r="5.5" fill="#ffffff"/>
      <circle cx="15" cy="14.5" r="2.6" fill="#0f766e"/>
    </svg>`;
  return element;
}
