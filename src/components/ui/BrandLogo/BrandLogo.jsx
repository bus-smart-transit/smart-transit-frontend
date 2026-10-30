/**
 * 2026-10-30: the SmartTransit logo, from public/brand/.
 * - variant "wordmark": the full logo (bus mark and the name).
 * - variant "icon": the bus mark alone (sign-in pages and other small spaces).
 * The logo's navy does not show on the site's navy bars, so `onDark` puts it on a white badge.
 * Size it with `className` (a height such as "h-8"; the width follows).
 */
const SOURCES = {
  wordmark: '/brand/logo.png',
  icon: '/brand/logo-icon.png',
};

export default function BrandLogo({ variant = 'wordmark', onDark = false, className = 'h-8', alt = 'SmartTransit' }) {
  const image = (
    <img
      src={SOURCES[variant] ?? SOURCES.wordmark}
      alt={alt}
      className={`${className} w-auto select-none object-contain`}
      draggable={false}
    />
  );
  if (!onDark) return image;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-white shadow-sm ${variant === 'icon' ? 'rounded-xl p-1.5' : 'rounded-lg px-2 py-1'}`}>
      {image}
    </span>
  );
}
