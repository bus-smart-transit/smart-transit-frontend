import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, Bell, CheckCircle2, X } from 'lucide-react';
import { dismissToast, getToasts, subscribeToasts } from '../../../utils/toastStore';

const TONES = {
  info: { box: 'border-slate-200 bg-white text-slate-800', icon: 'text-teal-700', Icon: Bell, action: 'bg-teal-700 hover:bg-teal-800 text-white' },
  success: { box: 'border-emerald-200 bg-white text-slate-800', icon: 'text-emerald-600', Icon: CheckCircle2, action: 'bg-emerald-700 hover:bg-emerald-800 text-white' },
  danger: { box: 'border-rose-300 bg-rose-50 text-rose-950', icon: 'text-rose-600', Icon: AlertTriangle, action: 'bg-rose-700 hover:bg-rose-800 text-white' },
};

function Toast({ toast }) {
  const tone = TONES[toast.tone] || TONES.info;
  const { Icon } = tone;
  const [entered, setEntered] = useState(false);
  const paused = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Leaves by itself after its time, unless sticky; hovering or focusing it holds it.
  useEffect(() => {
    if (toast.sticky) return undefined;
    let left = toast.duration;
    let last = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      if (!paused.current) left -= now - last;
      last = now;
      if (left <= 0) dismissToast(toast.id);
    }, 250);
    return () => clearInterval(tick);
  }, [toast.id, toast.sticky, toast.duration]);

  return (
    <li
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }}
      onBlur={() => { paused.current = false; }}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-3.5 shadow-lg transition duration-300 ease-out ${tone.box} ${entered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
      data-testid="toast"
      data-tone={toast.tone}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-bold leading-snug">{toast.title}</p>}
        {toast.body && <p className="mt-0.5 break-words text-sm leading-snug opacity-90">{toast.body}</p>}
        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            onClick={() => { toast.onAction(); dismissToast(toast.id); }}
            className={`mt-2 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${tone.action}`}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-60 transition hover:bg-black/5 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * 2026-11-24 (user): the website's toasts, mounted once at the app root. Top of the screen with a 16px margin on a
 * phone, top right on a wider screen; newest at the bottom of the stack.
 */
export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (toasts.length === 0) return null;
  return (
    <ol
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 top-4 z-[80] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-96"
      data-testid="toaster"
    >
      {toasts.map((toast) => <Toast key={toast.id} toast={toast} />)}
    </ol>
  );
}
