import { CircleCheck, Clock, Heart, House, MapPin, Shuffle, Sofa, Trees, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { Idea, Setting, Space } from '../domain/idea.ts'
import type { SavedEntry } from '../domain/saved.ts'
import { strings } from '../strings.ts'
import BudgetMeter from './BudgetMeter.tsx'

const SETTING_ICON: Record<Setting, LucideIcon> = { home: House, out: MapPin, either: Shuffle }
const SPACE_ICON: Record<Space, LucideIcon> = { indoor: Sofa, outdoor: Trees, either: Shuffle }

/** Budget · duration · home/out · indoor/outdoor, with icons. */
export function MetaRow({ idea }: { idea: Idea }) {
  const SettingIcon = SETTING_ICON[idea.setting]
  const SpaceIcon = SPACE_ICON[idea.space]
  const { labels } = strings
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
      <BudgetMeter budget={idea.budget} />
      <span className="inline-flex items-center gap-1">
        <Clock size={14} aria-hidden />
        {labels.duration[idea.duration]}
      </span>
      <span className="inline-flex items-center gap-1">
        <SettingIcon size={14} aria-hidden />
        {labels.setting[idea.setting]}
      </span>
      <span className="inline-flex items-center gap-1">
        <SpaceIcon size={14} aria-hidden />
        {labels.space[idea.space]}
      </span>
    </div>
  )
}

export default function IdeaCard({ idea, entry }: { idea: Idea; entry?: SavedEntry }) {
  return (
    <Link
      to={`/idea/${encodeURIComponent(idea.id)}`}
      className="flex gap-4 rounded-card border border-border bg-surface p-4 transition-colors duration-200 hover:bg-surface-raised"
    >
      <span className="text-4xl leading-none" aria-hidden>
        {idea.emoji}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl leading-tight font-semibold">{idea.title}</h3>
          {entry?.status === 'done' && (
            <CircleCheck size={18} className="mt-0.5 shrink-0 text-success" aria-label={strings.card.done} />
          )}
          {entry?.status === 'saved' && (
            <Heart size={18} fill="currentColor" className="mt-0.5 shrink-0 text-rose" aria-label={strings.card.saved} />
          )}
        </div>
        <p className="line-clamp-2 text-sm text-text-muted">{idea.summary}</p>
        <MetaRow idea={idea} />
      </div>
    </Link>
  )
}
