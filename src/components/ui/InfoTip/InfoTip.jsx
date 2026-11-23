import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';

/**
 * 2026-11-23 (advisor): an (i) icon that holds an explanation, so screens stay short. It opens on hover (mouse), and on
 * click, tap or keyboard (Enter or Space on the focused icon); Escape, a second click or a click elsewhere closes it.
 * Only explanations go here: anything a person must see before acting (a refusal, a warning) stays on screen.
 *
 * Props: text (the explanation), label (what the icon explains, for screen readers), tone ('light' on white cards,
 * 'dark' on the dark Chauffeur panels), align ('left' | 'right': which edge of the icon the bubble lines up with).
 */
export default function InfoTip({ text, label = 'More information', tone = 'light', align = 'left', className = '' }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef(null);
  const id = useId();
  const shown = open || hover;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type !== 'keydown' && wrapRef.current?.contains(event.target)) return;
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

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
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
      {shown && (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-6 z-40 w-64 max-w-[80vw] rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-normal leading-relaxed text-slate-700 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
