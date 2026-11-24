import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

const GUTTER = 16;
const GAP = 6;
const MAX_WIDTH = 256;

/**
 * 2026-11-23 (advisor): an (i) icon that holds an explanation, so screens stay short. It opens on hover (mouse), and on
 * click, tap or keyboard (Enter or Space on the focused icon); Escape, a second click or a click elsewhere closes it.
 * Only explanations go here: anything a person must see before acting (a refusal, a warning) stays on screen.
 *
 * 2026-11-24 (user): the bubble moved the layout on phones (a fixed 16rem box anchored to the icon ran past the screen
 * edge and widened the page). It now opens in its own layer (a portal, position: fixed), as wide as fits with a 16px
 * margin, below the icon or above it when there is no room below, and follows the icon on scroll.
 *
 * Props: text (the explanation), label (what the icon explains, for screen readers), tone ('light' on white cards,
 * 'dark' on the dark Chauffeur panels), align ('left' | 'right': which edge of the icon the bubble lines up with).
 */
export default function InfoTip({ text, label = 'More information', tone = 'light', align = 'left', className = '' }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [place, setPlace] = useState(null);
  const wrapRef = useRef(null);
  const iconRef = useRef(null);
  const bubbleRef = useRef(null);
  const id = useId();
  const shown = open || hover;

  const measure = useCallback(() => {
    const icon = iconRef.current?.getBoundingClientRect();
    if (!icon) return;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const width = Math.max(0, Math.min(MAX_WIDTH, viewWidth - GUTTER * 2));
    const wanted = align === 'right' ? icon.right - width : icon.left;
    const left = Math.max(GUTTER, Math.min(wanted, viewWidth - GUTTER - width));
    const height = bubbleRef.current?.offsetHeight ?? 0;
    const below = icon.bottom + GAP;
    const top = height && below + height > viewHeight - GUTTER && icon.top - GAP - height >= GUTTER
      ? icon.top - GAP - height
      : below;
    setPlace((previous) => (previous && previous.top === top && previous.left === left && previous.width === width
      ? previous
      : { top, left, width }));
  }, [align]);

  // Place the bubble before it paints, then again once its height is known (to open it above when needed).
  useLayoutEffect(() => {
    if (!shown) return;
    measure();
  }, [shown, measure, text]);

  useEffect(() => {
    if (!shown) return undefined;
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [shown, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type !== 'keydown' && (wrapRef.current?.contains(event.target) || bubbleRef.current?.contains(event.target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!text) return null;
  const iconTone = tone === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700';

  const bubble = shown && typeof document !== 'undefined'
    ? createPortal(
      <span
        ref={bubbleRef}
        id={id}
        role="tooltip"
        style={{
          position: 'fixed',
          top: place?.top ?? 0,
          left: place?.left ?? 0,
          width: place?.width ?? MAX_WIDTH,
          visibility: place ? 'visible' : 'hidden',
        }}
        className="z-[70] block rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-700 shadow-lg"
      >
        {text}
      </span>,
      document.body,
    )
    : null;

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        ref={iconRef}
        type="button"
        aria-label={label}
        aria-expanded={shown}
        aria-describedby={shown ? id : undefined}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value); }}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${iconTone} focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500`}
        data-testid="info-tip"
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {bubble}
    </span>
  );
}
