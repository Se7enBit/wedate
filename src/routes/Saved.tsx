import { Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import IdeaCard from '../components/IdeaCard.tsx'
import { btnPrimary } from '../components/styles.ts'
import { findIdea } from '../content/library.ts'
import { SAVED_TABS, savedTab, type SavedTab } from '../domain/saved.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

const EMPTY_EMOJI: Record<SavedTab, string> = { saved: '💛', done: '✅', mine: '✍️' }

export default function Saved() {
  const saved = useStore((s) => s.saved)
  const [params, setParams] = useSearchParams()
  const tab: SavedTab = SAVED_TABS.find((t) => t === params.get('tab')) ?? 'saved'
  const entries = savedTab(saved, tab)
  const s = strings.saved

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">{s.title}</h1>

      <div role="group" aria-label={s.title} className="grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1">
        {SAVED_TABS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === tab}
            onClick={() => setParams({ tab: t }, { replace: true })}
            className={`min-h-11 rounded-full text-sm font-medium transition-colors duration-200 ${
              t === tab ? 'bg-surface-raised text-gold' : 'text-text-muted hover:text-text'
            }`}
          >
            {s.tabs[t]} <span className="text-xs opacity-75">{savedTab(saved, t).length}</span>
          </button>
        ))}
      </div>

      <Link to="/idea/new" className={btnPrimary}>
        <Plus size={18} aria-hidden />
        {s.add}
      </Link>

      {entries.length === 0 ? (
        <EmptyState emoji={EMPTY_EMOJI[tab]} title={s.empty[tab].title} hint={s.empty[tab].hint} />
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.idea.id}>
              <IdeaCard idea={findIdea(entry.idea.id, saved) ?? entry.idea} entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
