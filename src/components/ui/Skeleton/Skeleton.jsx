/**
 * Batch 63 (user, 2026-11-13): skeleton loading. While data loads, grey shapes stand where the content will be, so
 * the page keeps its layout and does not jump when the data arrives. Screen readers hear the loading message (kept as
 * hidden text, so the words are the same as before); the shapes themselves are hidden from them. The pulse stops for
 * people who ask for reduced motion.
 */

const BAR = 'animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none';

/** One grey shape. Size it with className (height and width). */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <span aria-hidden="true" className={`block ${BAR} ${className}`} />;
}

/** The wrapper every skeleton uses: it says "loading" to screen readers and holds the shapes. */
export function SkeletonStatus({ label = 'Loading...', className = '', children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} data-testid="skeleton">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A few lines of text. */
export function SkeletonText({ label, lines = 3, className = '' }) {
  return (
    <SkeletonStatus label={label} className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />)}
    </SkeletonStatus>
  );
}

/** Rows of a list (each row: a round mark, a title line and a smaller line). */
export function SkeletonList({ label, rows = 4, className = '' }) {
  return (
    <SkeletonStatus label={label} className={`divide-y divide-slate-100 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
        </div>
      ))}
    </SkeletonStatus>
  );
}

/** A table: a header row and body rows. */
export function SkeletonTable({ label, rows = 5, cols = 5, className = '' }) {
  const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-3/5'];
  return (
    <SkeletonStatus label={label} className={`overflow-hidden ${className}`}>
      <div className="grid gap-4 border-b border-slate-200 pb-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className="h-3 w-1/2" />)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4 border-b border-slate-100 py-3.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className={`h-3.5 ${widths[(r + c) % widths.length]}`} />)}
        </div>
      ))}
    </SkeletonStatus>
  );
}

/** Cards (trip results, tickets): a title, two detail lines and a button on the right. */
export function SkeletonCards({ label, count = 3, className = '' }) {
  return (
    <SkeletonStatus label={label} className={`space-y-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3.5 w-1/4" />
            </div>
            <div className="hidden shrink-0 space-y-2 sm:block">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </SkeletonStatus>
  );
}

/** Figures in a row (stat tiles). */
export function SkeletonStats({ label, count = 4, className = '' }) {
  return (
    <SkeletonStatus label={label} className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-1/3" />
        </div>
      ))}
    </SkeletonStatus>
  );
}

/** A square (a QR code that is still being drawn). */
export function SkeletonSquare({ label, className = 'h-48 w-48' }) {
  return (
    <SkeletonStatus label={label} className="inline-block">
      <Skeleton className={`rounded-xl ${className}`} />
    </SkeletonStatus>
  );
}

/**
 * A whole page while a portal or route opens. `variant`: 'portal' (sidebar and content, the staff portals), 'crew'
 * (a phone screen: a big card, a list card and the bottom bar) or 'page' (a header and content, the public pages).
 */
export function SkeletonPage({ label = 'Loading...', variant = 'page' }) {
  if (variant === 'crew') {
    return (
      <SkeletonStatus label={label} className="space-y-4">
        <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-2/3" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      </SkeletonStatus>
    );
  }
  if (variant === 'portal') {
    return (
      <SkeletonStatus label={label} className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[260px_1fr]">
        <div className="hidden space-y-3 bg-[#0D1B2A] p-5 lg:block">
          <span aria-hidden="true" className="block h-9 w-40 animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
          {Array.from({ length: 7 }, (_, i) => <span key={i} aria-hidden="true" className="block h-10 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />)}
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <Skeleton className="h-8 w-56" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </SkeletonStatus>
    );
  }
  return (
    <SkeletonStatus label={label} className="min-h-screen bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-8">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </SkeletonStatus>
  );
}

export default Skeleton;
