import { X } from 'lucide-react';
import ModalShell from './ModalShell';

const SIZE_CLASS = { md: 'max-w-lg', xl: 'max-w-3xl' };

/**
 * A titled dialog on the shared overlay (see ModalShell). The title row stays put while the body
 * scrolls, and the dialog never grows past the screen: `max-h` uses dynamic viewport units, so
 * mobile browser toolbars do not push the bottom off screen. `fullScreenOnMobile` fills the screen
 * below the `sm` breakpoint.
 */
export default function Modal({ open, onClose, title, children, className = '', size = 'md', fullScreenOnMobile = false }) {
  if (!open) return null;

  const panelClass = fullScreenOnMobile
    ? 'h-dvh max-h-dvh rounded-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl'
    : 'max-h-[calc(100dvh-2rem)] rounded-2xl';

  return (
    <ModalShell label={title} onClose={onClose} fullScreenOnMobile={fullScreenOnMobile}>
      <div className={`flex w-full ${SIZE_CLASS[size] || SIZE_CLASS.md} flex-col bg-white shadow-card-hover ${panelClass} ${className}`}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          {title && <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </div>
    </ModalShell>
  );
}
