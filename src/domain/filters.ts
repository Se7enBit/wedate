import {
  BUDGETS,
  DURATIONS,
  type Budget,
  type Category,
  type Duration,
  type Energy,
  type Idea,
  type TimeOfDay,
  type Vibe,
} from './idea.ts'
import type { IdeaPrefs } from './prompt.ts'

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

/** Add `value` if missing, remove it if present (for multi-select chips). */
export function toggle<T>(list: readonly T[] | undefined, value: T): T[] {
  const current = list ?? []
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}

/** Deal ideas round-robin by category (in order of first appearance), keeping order within a category. */
export function mixCategories(ideas: readonly Idea[]): Idea[] {
  const groups = new Map<Category, Idea[]>()
  for (const idea of ideas) {
    const group = groups.get(idea.category)
    if (group) group.push(idea)
    else groups.set(idea.category, [idea])
  }
  const queues = [...groups.values()]
  const longest = Math.max(0, ...queues.map((q) => q.length))
  const mixed: Idea[] = []
  for (let round = 0; round < longest; round++) {
    for (const queue of queues) if (round < queue.length) mixed.push(queue[round])
  }
  return mixed
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

/**
 * Library ideas for AI prefs, the fallback when AI fails. Budget, duration and home/out always hold;
 * if nothing matches, vibes are dropped first, then energy.
 */
export function libraryPicks(ideas: readonly Idea[], prefs: IdeaPrefs, count = 5): Idea[] {
  const limits: Filters = {
    budgets: BUDGETS.filter((b) => b <= prefs.budget),
    durations: DURATIONS.slice(0, DURATIONS.indexOf(prefs.duration) + 1),
    settings: prefs.setting && [prefs.setting],
  }
  const energies = prefs.energy && [prefs.energy]
  for (const filters of [{ ...limits, energies, vibes: prefs.vibes }, { ...limits, energies }, limits]) {
    const matches = applyFilters(ideas, filters)
    if (matches.length > 0) return mixCategories(matches).slice(0, count)
  }
  return []
}
