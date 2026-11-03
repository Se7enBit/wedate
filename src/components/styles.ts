// Shared class names for buttons and fields, so screens stay consistent.
const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-200 disabled:opacity-50'

export const btnPrimary = `${button} bg-gold text-bg hover:bg-gold-soft`
export const btnSecondary = `${button} border border-border bg-surface text-text hover:bg-surface-raised`
export const btnDanger = `${button} border border-danger/60 text-danger hover:bg-danger/10`

// 16px text stops iOS Safari zooming in on focus.
export const field =
  'w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-text-muted/70 focus:border-gold focus:outline-none'
