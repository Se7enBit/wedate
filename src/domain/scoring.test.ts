import { describe, expect, it } from 'vitest'
import type { Idea, Reaction } from './idea.ts'
import { rankForNow, type NowContext } from './scoring.ts'
import { makeIdea } from './test-utils.ts'

const now = new Date(2026, 10, 3, 19, 0) // evening, local time
const base: NowContext = { now, timeOfDay: 'evening', moods: [], maxBudget: 3, maxDuration: 'full_day' }
const ctx = (overrides: Partial<NowContext> = {}): NowContext => ({ ...base, ...overrides })
const ids = (ideas: Idea[], c: NowContext, history: Reaction[] = [], seed = 1) =>
  rankForNow(ideas, c, history, seed).map((i) => i.id)
const idea = (id: string, overrides: Partial<Idea> = {}) => makeIdea({ id, vibes: [], ...overrides })
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString()
const rain = { tempC: 14, isRaining: true, isDay: false }
const pleasant = { tempC: 22, isRaining: false, isDay: true }

describe('rankForNow — hard filters', () => {
  it('drops ideas over the max budget or duration', () => {
    const ideas = [idea('cheap', { budget: 1 }), idea('pricey', { budget: 3 })]
    expect(ids(ideas, ctx({ maxBudget: 1 }))).toEqual(['cheap'])
    const long = [idea('short', { duration: 'short' }), idea('day', { duration: 'full_day' })]
    expect(ids(long, ctx({ maxDuration: 'short' }))).toEqual(['short'])
  })

  it('matches the chosen setting, letting "either" through', () => {
    const ideas = [idea('home', { setting: 'home' }), idea('out', { setting: 'out' }), idea('either', { setting: 'either' })]
    expect(ids(ideas, ctx({ setting: 'out' })).sort()).toEqual(['either', 'out'])
    expect(ids(ideas, ctx()).length).toBe(3)
  })

  it('keeps the current time of day, plus the next one within 60 minutes of the switch', () => {
    const ideas = [idea('evening', { timesOfDay: ['evening'] }), idea('late', { timesOfDay: ['late_night'] })]
    expect(ids(ideas, ctx({ now: new Date(2026, 10, 3, 20, 30) }))).toEqual(['evening'])
    expect(ids(ideas, ctx({ now: new Date(2026, 10, 3, 21, 10) })).sort()).toEqual(['evening', 'late'])
  })

  it('drops needs_good in rain, cold or heat, but not without weather', () => {
    const ideas = [idea('sunny', { weather: 'needs_good' }), idea('any')]
    expect(ids(ideas, ctx({ weather: rain }))).toEqual(['any'])
    expect(ids(ideas, ctx({ weather: { ...pleasant, tempC: 7 } }))).toEqual(['any'])
    expect(ids(ideas, ctx({ weather: { ...pleasant, tempC: 36 } }))).toEqual(['any'])
    expect(ids(ideas, ctx({ weather: pleasant })).sort()).toEqual(['any', 'sunny'])
    expect(ids(ideas, ctx()).sort()).toEqual(['any', 'sunny'])
  })

  it('always drops plan_ahead', () => {
    expect(ids([idea('trip', { prep: 'plan_ahead' }), idea('easy', { prep: 'some' })], ctx())).toEqual(['easy'])
  })
})

describe('rankForNow — score', () => {
  it('adds 3 per matching mood', () => {
    const ideas = [idea('one', { vibes: ['cozy'] }), idea('two', { vibes: ['cozy', 'romantic'] }), idea('none')]
    expect(ids(ideas, ctx({ moods: ['cozy', 'romantic'] }))).toEqual(['two', 'one', 'none'])
  })

  it('adds 2 for great_when_bad when raining, only then', () => {
    const ideas = [idea('a'), idea('rainy', { weather: 'great_when_bad' })]
    for (const seed of [1, 2, 3]) expect(ids(ideas, ctx({ weather: rain }), [], seed)[0]).toBe('rainy')
    const dry = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => ids(ideas, ctx({ weather: pleasant }), [], s)[0]))
    expect(dry.size).toBe(2) // no bonus when dry: jitter alone decides
  })

  it('adds 1 for outdoor ideas when pleasant, dry and daytime', () => {
    // Jitter is < 1, so +1 decides between otherwise equal ideas.
    const ideas = [idea('in', { space: 'indoor' }), idea('outside', { space: 'outdoor' })]
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(ids(ideas, ctx({ weather: pleasant }), [], seed)[0]).toBe('outside')
    }
    const night = { ...pleasant, isDay: false }
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => ids(ideas, ctx({ weather: night }), [], s)[0]))
    expect(orders.size).toBe(2) // no bonus at night: jitter alone decides
  })

  it('subtracts 4 for a skip within 3 days and 6 for a go within 30 days', () => {
    const ideas = [idea('skipped', { vibes: ['cozy'] }), idea('plain')]
    const moods = ctx({ moods: ['cozy'] })
    expect(ids(ideas, moods, [{ ideaId: 'skipped', reaction: 'skip', at: daysAgo(1) }])[0]).toBe('plain')
    expect(ids(ideas, moods, [{ ideaId: 'skipped', reaction: 'skip', at: daysAgo(4) }])[0]).toBe('skipped')

    const done = [idea('done', { vibes: ['cozy', 'romantic'] }), idea('plain')]
    const twoMoods = ctx({ moods: ['cozy', 'romantic'] })
    expect(ids(done, twoMoods, [{ ideaId: 'done', reaction: 'go', at: daysAgo(10) }])[0]).toBe('plain')
    expect(ids(done, twoMoods, [{ ideaId: 'done', reaction: 'go', at: daysAgo(31) }])[0]).toBe('done')
    expect(ids(done, twoMoods, [{ ideaId: 'done', reaction: 'save', at: daysAgo(1) }])[0]).toBe('done')
  })
})

describe('rankForNow — determinism', () => {
  const many = Array.from({ length: 30 }, (_, i) => idea(`idea-${i}`))

  it('gives the same order for the same seed', () => {
    expect(ids(many, ctx(), [], 42)).toEqual(ids(many, ctx(), [], 42))
  })

  it('shuffles ties differently for a different seed', () => {
    expect(ids(many, ctx(), [], 1)).not.toEqual(ids(many, ctx(), [], 2))
  })

  it('does not mutate the input', () => {
    const copy = [...many]
    rankForNow(many, ctx(), [], 7)
    expect(many).toEqual(copy)
  })
})
