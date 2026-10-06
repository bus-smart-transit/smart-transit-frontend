// Batch 31: design tokens for the Operator pages. Spacing is a 4px scale (Tailwind steps 1, 2, 3, 4, 6, 8 are
// 4, 8, 12, 16, 24, 32 px); the classes below are the only spacing the Operator primitives use, so a page
// built from them cannot drift off the scale.

export const OP_SPACE = {
  stack: 'space-y-6',
  grid: 'grid gap-4',
  gridTight: 'grid gap-3',
  inline: 'flex flex-wrap items-center gap-2',
};

// One tone vocabulary for chips, bars and dots. Meaning is never carried by colour alone: every chip has text.
export const OP_TONES = {
  neutral: { chip: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400', dot: 'bg-slate-400' },
  info: { chip: 'bg-sky-100 text-sky-700', bar: 'bg-sky-500', dot: 'bg-sky-500' },
  success: { chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  warning: { chip: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  danger: { chip: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500', dot: 'bg-rose-500' },
};

export const toneOf = (tone) => OP_TONES[tone] ?? OP_TONES.neutral;

// The trip statuses the backend stores, mapped to a tone.
export const TRIP_STATUS_TONE = {
  scheduled: 'neutral',
  delayed: 'danger',
  boarding: 'info',
  departed: 'warning',
  'in-progress': 'warning',
  completed: 'success',
  cancelled: 'danger',
};
