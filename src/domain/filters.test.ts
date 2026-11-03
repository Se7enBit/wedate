import { describe, expect, it } from 'vitest'
import { applyFilters, mixCategories, toggle } from './filters.ts'
import { makeIdea } from './test-utils.ts'

const picnic = makeIdea({
  id: 'picnic',
  title: 'Sunset picnic',
  summary: 'Pack snacks and watch the sky change.',
  searchQuery: 'scenic park near me',
  category: 'outdoors',
  budget: 1,
  duration: 'short',
  setting: 'out',
  space: 'outdoor',
  energy: 'medium',
  timesOfDay: ['evening'],
  vibes: ['romantic', 'chill'],
})
const movie = makeIdea({
  id: 'movie',
  title: 'Blanket-fort movie night',
  summary: 'Build a fort and pick a film.',
  category: 'cozy_home',
  budget: 0,
  duration: 'short',
  setting: 'home',
  space: 'indoor',
  energy: 'low',
  timesOfDay: ['evening', 'late_night'],
  vibes: ['cozy'],
})
const cafe = makeIdea({
  id: 'cafe',
  title: 'Café crawl',
  summary: 'Try three cafés in one afternoon.',
  category: 'food_drink',
  budget: 2,
  duration: 'half_day',
  setting: 'either',
  space: 'either',
  energy: 'medium',
  timesOfDay: ['morning', 'afternoon'],
  vibes: ['playful', 'spontaneous'],
})
const all = [picnic, movie, cafe]
const ids = (filters: Parameters<typeof applyFilters>[1]) => applyFilters(all, filters).map((i) => i.id)

describe('applyFilters', () => {
  it('returns everything, in order, with no or empty filters', () => {
    expect(ids({})).toEqual(['picnic', 'movie', 'cafe'])
    expect(ids({ budgets: [], vibes: [], query: '   ' })).toEqual(['picnic', 'movie', 'cafe'])
  })

  it('filters each group', () => {
    expect(ids({ budgets: [0] })).toEqual(['movie'])
    expect(ids({ durations: ['half_day'] })).toEqual(['cafe'])
    expect(ids({ energies: ['low'] })).toEqual(['movie'])
    expect(ids({ timesOfDay: ['late_night'] })).toEqual(['movie'])
    expect(ids({ categories: ['outdoors'] })).toEqual(['picnic'])
    expect(ids({ vibes: ['chill'] })).toEqual(['picnic'])
  })

  it('lets "either" match both home and out, indoor and outdoor', () => {
    expect(ids({ settings: ['home'] })).toEqual(['movie', 'cafe'])
    expect(ids({ settings: ['out'] })).toEqual(['picnic', 'cafe'])
    expect(ids({ spaces: ['indoor'] })).toEqual(['movie', 'cafe'])
    expect(ids({ spaces: ['outdoor'] })).toEqual(['picnic', 'cafe'])
  })

  it('ORs within a group and ANDs across groups', () => {
    expect(ids({ budgets: [0, 1] })).toEqual(['picnic', 'movie'])
    expect(ids({ vibes: ['cozy', 'playful'] })).toEqual(['movie', 'cafe'])
    expect(ids({ budgets: [0, 1], timesOfDay: ['late_night'] })).toEqual(['movie'])
    expect(ids({ settings: ['home'], categories: ['outdoors'] })).toEqual([])
  })

  it('searches title, summary and searchQuery, ignoring case and accents, all words required', () => {
    expect(ids({ query: 'CAFE' })).toEqual(['cafe'])
    expect(ids({ query: 'fort film' })).toEqual(['movie'])
    expect(ids({ query: 'fort picnic' })).toEqual([])
    expect(ids({ query: 'scenic' })).toEqual(['picnic'])
    expect(ids({ query: 'sunset', budgets: [0] })).toEqual([])
  })
})

describe('mixCategories', () => {
  const food = (n: number) => makeIdea({ id: `food-${n}`, category: 'food_drink' })
  const games = (n: number) => makeIdea({ id: `games-${n}`, category: 'games' })
  const art = (n: number) => makeIdea({ id: `art-${n}`, category: 'creative' })

  it('deals categories round-robin, keeping order within each', () => {
    const mixed = mixCategories([food(1), food(2), food(3), games(1), games(2), art(1)])
    expect(mixed.map((i) => i.id)).toEqual(['food-1', 'games-1', 'art-1', 'food-2', 'games-2', 'food-3'])
  })

  it('keeps every idea and handles an empty list', () => {
    expect(mixCategories(all)).toHaveLength(all.length)
    expect(mixCategories([])).toEqual([])
  })
})

describe('toggle', () => {
  it('adds a missing value and removes a present one', () => {
    expect(toggle(undefined, 'a')).toEqual(['a'])
    expect(toggle(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
  })
})
