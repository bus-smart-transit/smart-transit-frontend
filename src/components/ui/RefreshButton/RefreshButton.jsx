import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const MIN_MS = 600;
const DONE_MS = 2000;

/**
 * 2026-11-24 (user): one Refresh button for every portal, so a refresh always shows that it ran. While it works the icon
 * spins and it reads "Refreshing…"; then "Updated" (or "Couldn't refresh" when the call failed) for two seconds. A fast
 * answer still spins for a moment, so the press is never silent. `onRefresh` may return a promise.
 *
 * Props: onRefresh, label ('Refresh'), tone ('light' on white, 'dark' on the dark Chauffeur and Driver panels),
 * size ('md' | 'sm'), iconOnly (a square icon button; the state still reads to screen readers), variant ('button', or
 * 'chip' for the Driver and Chauffeur header chips, coloured by index.css), className.
 */
export default function RefreshButton({ onRefresh, label = 'Refresh', tone = 'light', size = 'md', iconOnly = false, variant = 'button', className = '', ...props }) {
  const [state, setState] = useState('idle');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const run = async () => {
    if (state === 'busy') return;
    clearTimeout(timer.current);
    setState('busy');
    const started = Date.now();
    let ok = true;
    try {
      await onRefresh?.();
    } catch {
      ok = false;
    }
    const wait = MIN_MS - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => { setTimeout(resolve, wait); });
    setState(ok ? 'done' : 'failed');
    timer.current = setTimeout(() => setState('idle'), DONE_MS);
  };

  const busy = state === 'busy';
  const text = state === 'done' ? 'Updated' : state === 'failed' ? "Couldn't refresh" : busy ? 'Refreshing…' : label;
  const palette = tone === 'dark'
    ? {
      idle: 'border-slate-600 bg-slate-800 text-slate-100 hover:border-teal-400 hover:text-white',
      busy: 'border-teal-400 bg-slate-800 text-teal-200',
      done: 'border-emerald-400 bg-emerald-900/40 text-emerald-200',
      failed: 'border-rose-400 bg-rose-900/40 text-rose-200',
    }
    : {
      idle: 'border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800',
      busy: 'border-teal-300 bg-teal-50 text-teal-800',
      done: 'border-emerald-300 bg-emerald-50 text-emerald-700',
      failed: 'border-rose-300 bg-rose-50 text-rose-700',
    };
  const sizing = iconOnly
    ? (size === 'sm' ? 'h-9 w-9' : 'h-11 w-11')
    : (size === 'sm' ? 'min-h-9 px-3 text-xs' : 'min-h-11 px-4 text-sm');
  const Icon = state === 'done' ? CheckCircle2 : state === 'failed' ? AlertCircle : RefreshCw;

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      aria-busy={busy}
      aria-label={iconOnly ? text : undefined}
      title={iconOnly ? text : undefined}
      className={variant === 'chip'
        ? `crew-chip-button transition-colors duration-300 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${className}`
        : `inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-semibold transition-all duration-300 active:scale-95 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${palette[state === 'idle' ? 'idle' : state]} ${sizing} ${className}`}
      data-testid="refresh-button"
      data-state={state}
      {...props}
    >
      <Icon className={`${variant === 'chip' ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${busy ? 'animate-spin' : state === 'idle' ? '' : 'animate-[op-pop_300ms_ease-out]'}`} aria-hidden="true" />
      {iconOnly ? <span className="sr-only" aria-live="polite">{text}</span> : <span aria-live="polite">{text}</span>}
    </button>
  );
}
