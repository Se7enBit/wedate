import type { ReactNode } from 'react'

type Props = {
  emoji: string
  title: string
  hint: string
  /** Optional action, e.g. a button. */
  children?: ReactNode
}

export default function EmptyState({ emoji, title, hint, children }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-6 py-10 text-center">
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="text-sm text-text-muted">{hint}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
