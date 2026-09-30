import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE_CLASS = { md: 'max-w-lg', xl: 'max-w-3xl' };

/**
 * Accessible dialog: Esc and overlay close, focus is trapped inside while open
 * and restored on close, page scroll is locked. `fullScreenOnMobile` makes the
 * panel fill the screen below the `sm` breakpoint.
 */
export default function Modal({ open, onClose, title, children, className = '', size = 'md', fullScreenOnMobile = false }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const focusables = () => (dialog ? [...dialog.querySelectorAll(FOCUSABLE)] : []);
    (focusables()[0] || dialog)?.focus();

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  const overlayClass = fullScreenOnMobile ? 'p-0 sm:p-4' : 'p-4';
  const panelClass = fullScreenOnMobile
    ? 'min-h-full rounded-none p-4 sm:min-h-0 sm:rounded-2xl sm:p-8'
    : 'rounded-2xl p-6 sm:p-8';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-950/60 backdrop-blur-sm animate-fade-in ${overlayClass}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${SIZE_CLASS[size] || SIZE_CLASS.md} bg-white shadow-card-hover outline-none ${panelClass} ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
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
        {children}
      </div>
    </div>
  );
}
