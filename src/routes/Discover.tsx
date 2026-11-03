import { Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState.tsx'
import { ChipGroup } from '../components/FilterChips.tsx'
import IdeaCard from '../components/IdeaCard.tsx'
import { btnPrimary, btnSecondary, field } from '../components/styles.ts'
import { LIBRARY } from '../content/library.ts'
import { applyFilters, mixCategories, toggle } from '../domain/filters.ts'
import { BUDGETS, CATEGORIES, DURATIONS, ENERGIES, TIMES_OF_DAY, VIBES } from '../domain/idea.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

const MIXED_LIBRARY = mixCategories(LIBRARY)

const options = <T extends string | number>(values: readonly T[], label: (v: T) => string) =>
  values.map((value) => ({ value, label: label(value) }))

export default function Discover() {
  const saved = useStore((s) => s.saved)
  const filters = useStore((s) => s.filters)
  const setFilters = useStore((s) => s.setFilters)
  const clearFilters = useStore((s) => s.clearFilters)
  const [showFilters, setShowFilters] = useState(false)

  // Own and AI ideas first (newest saved first), then the library.
  const ideas = useMemo(() => {
    const own = Object.values(saved)
      .filter((e) => e.idea.source !== 'library')
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
      .map((e) => e.idea)
    return applyFilters([...own, ...MIXED_LIBRARY], filters)
  }, [saved, filters])

  const activeCount = Object.entries(filters).reduce(
    (n, [key, value]) => (key !== 'query' && Array.isArray(value) ? n + value.length : n),
    0,
  )
  const { discover: d, labels: l } = strings
  const g = d.groups

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">{d.title}</h1>

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{d.search}</span>
          <Search
            size={18}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={filters.query ?? ''}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={d.search}
            className={`${field} pl-11`}
          />
        </label>
        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls="filters"
          onClick={() => setShowFilters((v) => !v)}
          className={`${btnSecondary} shrink-0 px-4`}
        >
          <SlidersHorizontal size={18} aria-hidden />
          {d.filters}
          {activeCount > 0 && <span className="rounded-full bg-gold px-2 text-xs text-bg">{activeCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div id="filters" className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4">
          <ChipGroup
            label={g.budgets}
            options={options(BUDGETS, (b) => l.budget[b])}
            selected={filters.budgets ?? []}
            onToggle={(v) => setFilters({ budgets: toggle(filters.budgets, v) })}
          />
          <ChipGroup
            label={g.durations}
            options={options(DURATIONS, (v) => l.duration[v])}
            selected={filters.durations ?? []}
            onToggle={(v) => setFilters({ durations: toggle(filters.durations, v) })}
          />
          <ChipGroup
            label={g.settings}
            options={options(['home', 'out'] as const, (v) => l.setting[v])}
            selected={filters.settings ?? []}
            onToggle={(v) => setFilters({ settings: toggle(filters.settings, v) })}
          />
          <ChipGroup
            label={g.spaces}
            options={options(['indoor', 'outdoor'] as const, (v) => l.space[v])}
            selected={filters.spaces ?? []}
            onToggle={(v) => setFilters({ spaces: toggle(filters.spaces, v) })}
          />
          <ChipGroup
            label={g.energies}
            options={options(ENERGIES, (v) => l.energy[v])}
            selected={filters.energies ?? []}
            onToggle={(v) => setFilters({ energies: toggle(filters.energies, v) })}
          />
          <ChipGroup
            label={g.timesOfDay}
            options={options(TIMES_OF_DAY, (v) => l.timeOfDay[v])}
            selected={filters.timesOfDay ?? []}
            onToggle={(v) => setFilters({ timesOfDay: toggle(filters.timesOfDay, v) })}
          />
          <ChipGroup
            label={g.categories}
            options={options(CATEGORIES, (v) => l.category[v])}
            selected={filters.categories ?? []}
            onToggle={(v) => setFilters({ categories: toggle(filters.categories, v) })}
          />
          <ChipGroup
            label={g.vibes}
            options={options(VIBES, (v) => l.vibe[v])}
            selected={filters.vibes ?? []}
            onToggle={(v) => setFilters({ vibes: toggle(filters.vibes, v) })}
          />
          {activeCount > 0 && (
            <button type="button" onClick={clearFilters} className={`${btnSecondary} self-start`}>
              {d.clearAll}
            </button>
          )}
        </div>
      )}

      <h2 className="text-sm text-text-muted" aria-live="polite">
        {d.count(ideas.length)}
      </h2>

      {ideas.length === 0 ? (
        <EmptyState emoji="🔍" title={d.emptyTitle} hint={d.emptyHint}>
          <button type="button" onClick={clearFilters} className={btnPrimary}>
            {d.clearFilters}
          </button>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <IdeaCard idea={idea} entry={saved[idea.id]} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
