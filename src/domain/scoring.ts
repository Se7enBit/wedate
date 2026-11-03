import { minutesUntilNextBucket, nextTimeOfDay } from './context.ts'
import { DURATIONS, type Budget, type Duration, type Idea, type Reaction, type TimeOfDay, type Vibe } from './idea.ts'

export const DECK_SIZE = 20

export type NowContext = {
  now: Date
  timeOfDay: TimeOfDay
  weather?: { tempC: number; isRaining: boolean; isDay: boolean }
  moods: Vibe[]
  setting?: 'home' | 'out'
  maxBudget: Budget
  maxDuration: Duration
}

const DAY_MS = 24 * 60 * 60 * 1000

/** FNV-1a 32-bit hash → [0, 1). */
function jitter(seed: number, id: string): number {
  let h = 0x811c9dc5
  for (const ch of `${seed}:${id}`) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 2 ** 32
}

/**
 * Ideas that fit right now, best first (CLAUDE.md section 8). Deterministic for a given seed.
 * A `go` reaction means the idea was done.
 */
export function rankForNow(
  ideas: readonly Idea[],
  ctx: NowContext,
  history: readonly Reaction[],
  seed: number,
): Idea[] {
  const { weather } = ctx
  const buckets: TimeOfDay[] = [ctx.timeOfDay]
  if (minutesUntilNextBucket(ctx.now) <= 60) buckets.push(nextTimeOfDay(ctx.timeOfDay))
  const badWeather = weather !== undefined && (weather.isRaining || weather.tempC < 8 || weather.tempC > 35)
  const pleasant =
    weather !== undefined && !weather.isRaining && weather.isDay && weather.tempC >= 15 && weather.tempC <= 28
  const maxDuration = DURATIONS.indexOf(ctx.maxDuration)

  const now = ctx.now.getTime()
  const recent = (kind: Reaction['reaction'], days: number) =>
    new Set(
      history
        .filter((r) => r.reaction === kind && now - Date.parse(r.at) <= days * DAY_MS)
        .map((r) => r.ideaId),
    )
  const skipped = recent('skip', 3)
  const done = recent('go', 30)

  return ideas
    .filter(
      (idea) =>
        idea.budget <= ctx.maxBudget &&
        DURATIONS.indexOf(idea.duration) <= maxDuration &&
        (!ctx.setting || idea.setting === ctx.setting || idea.setting === 'either') &&
        idea.timesOfDay.some((t) => buckets.includes(t)) &&
        !(badWeather && idea.weather === 'needs_good') &&
        idea.prep !== 'plan_ahead',
    )
    .map((idea) => {
      let score = 3 * idea.vibes.filter((v) => ctx.moods.includes(v)).length
      if (weather?.isRaining && idea.weather === 'great_when_bad') score += 2
      if (pleasant && idea.space === 'outdoor') score += 1
      if (skipped.has(idea.id)) score -= 4
      if (done.has(idea.id)) score -= 6
      return { idea, score: score + jitter(seed, idea.id) }
    })
    .sort((a, b) => b.score - a.score || (a.idea.id < b.idea.id ? -1 : 1))
    .map((s) => s.idea)
}
