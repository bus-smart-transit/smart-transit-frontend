import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one overlay every dialog in the app sits on, so they all behave the same:
 * - rendered into <body> (portal), so no transformed/overflow-hidden ancestor and no sticky header
 *   or sidebar can cover it, and it stacks above them;
 * - the overlay itself scrolls and the dialog is centred with `min-h-full` + auto margins, so a
 *   dialog taller than the screen starts at its top instead of being centred past it (the cause of
 *   "the top of the modal is hidden");
 * - safe-area insets are respected, page scroll is locked, Esc closes, focus is trapped inside and
 *   restored to what had it when the dialog closes.
 *
 * `onClose` may be omitted for a dialog that must be answered (Esc and the overlay then do nothing).
 */
export default function ModalShell({
  label,
  onClose,
  children,
  closeOnOverlay = true,
  zClass = 'z-50',
  fullScreenOnMobile = false,
  overlayClassName = 'bg-navy-950/60 backdrop-blur-sm',
}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const focusables = () => (dialog ? [...dialog.querySelectorAll(FOCUSABLE)] : []);
    (focusables()[0] || dialog)?.focus({ preventScroll: true });

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
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 ${zClass} overflow-y-auto overscroll-contain animate-fade-in ${overlayClassName}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="presentation"
      onClick={closeOnOverlay ? () => onCloseRef.current?.() : undefined}
    >
      <div className={`flex min-h-full items-center justify-center ${fullScreenOnMobile ? 'p-0 sm:p-4' : 'p-4'}`}>
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={`flex outline-none ${fullScreenOnMobile ? 'min-h-full w-full justify-center sm:min-h-0' : 'w-full justify-center'}`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
