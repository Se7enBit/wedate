import { describe, expect, it } from 'vitest'
import { CATEGORIES, IdeaSchema, type Idea } from '../domain/idea.ts'
import raw from './ideas.json'

const ideas: Idea[] = raw.map((entry) => IdeaSchema.parse(entry))
const count = (test: (idea: Idea) => boolean) => ideas.filter(test).length

describe('idea library — every idea', () => {
  it('matches the schema', () => {
    for (const entry of raw) {
      const result = IdeaSchema.safeParse(entry)
      expect(result.success, `${entry.id}: ${result.error?.message}`).toBe(true)
    }
  })

  it('is a library idea with a lib-<kebab-slug> id', () => {
    for (const idea of ideas) {
      expect(idea.source, idea.id).toBe('library')
      expect(idea.id).toMatch(/^lib-[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('has a unique id and a unique title', () => {
    expect(new Set(ideas.map((i) => i.id)).size).toBe(ideas.length)
    expect(new Set(ideas.map((i) => i.title.toLowerCase())).size).toBe(ideas.length)
  })

  it('has at least one vibe', () => {
    for (const idea of ideas) expect(idea.vibes.length, idea.id).toBeGreaterThan(0)
  })

  it('has a searchQuery when it happens out', () => {
    for (const idea of ideas.filter((i) => i.setting === 'out')) expect(idea.searchQuery, idea.id).toBeTruthy()
  })
})

describe('idea library — mix targets (CLAUDE.md section 7)', () => {
  it('has at least 150 ideas', () => {
    expect(ideas.length).toBeGreaterThanOrEqual(150)
  })

  it.each(CATEGORIES)('has at least 8 ideas in %s', (category) => {
    expect(count((i) => i.category === category)).toBeGreaterThanOrEqual(8)
  })

  it('is at least 30% free', () => {
    expect(count((i) => i.budget === 0) / ideas.length).toBeGreaterThanOrEqual(0.3)
  })

  it('has at least 40 home, 25 rainy-day, 25 quick and 20 late-night ideas', () => {
    expect(count((i) => i.setting === 'home'), 'home').toBeGreaterThanOrEqual(40)
    expect(count((i) => i.weather === 'great_when_bad'), 'great_when_bad').toBeGreaterThanOrEqual(25)
    expect(count((i) => i.duration === 'quick'), 'quick').toBeGreaterThanOrEqual(25)
    expect(count((i) => i.timesOfDay.includes('late_night')), 'late_night').toBeGreaterThanOrEqual(20)
  })
})
