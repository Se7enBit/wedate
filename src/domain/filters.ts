import type { Budget, Category, Duration, Energy, Idea, TimeOfDay, Vibe } from './idea.ts'

/** Each group is multi-select: OR within a group, AND across groups. Empty or missing = no constraint. */
export type Filters = {
  query?: string
  budgets?: Budget[]
  durations?: Duration[]
  settings?: ('home' | 'out')[]
  spaces?: ('indoor' | 'outdoor')[]
  energies?: Energy[]
  timesOfDay?: TimeOfDay[]
  categories?: Category[]
  vibes?: Vibe[]
}

/** Lowercase and strip accents, so "cafe" finds "Café". */
function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function allows<T>(chosen: readonly T[] | undefined, test: (value: T) => boolean): boolean {
  return !chosen || chosen.length === 0 || chosen.some(test)
}

export function applyFilters(ideas: readonly Idea[], filters: Filters): Idea[] {
  const words = fold(filters.query ?? '').split(/\s+/).filter(Boolean)

  return ideas.filter((idea) => {
    if (words.length > 0) {
      const haystack = fold([idea.title, idea.summary, idea.searchQuery ?? ''].join(' '))
      if (!words.every((w) => haystack.includes(w))) return false
    }
    return (
      allows(filters.budgets, (b) => idea.budget === b) &&
      allows(filters.durations, (d) => idea.duration === d) &&
      allows(filters.settings, (s) => idea.setting === s || idea.setting === 'either') &&
      allows(filters.spaces, (s) => idea.space === s || idea.space === 'either') &&
      allows(filters.energies, (e) => idea.energy === e) &&
      allows(filters.timesOfDay, (t) => idea.timesOfDay.includes(t)) &&
      allows(filters.categories, (c) => idea.category === c) &&
      allows(filters.vibes, (v) => idea.vibes.includes(v))
    )
  })
}
