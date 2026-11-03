import { describe, expect, it } from 'vitest'
import { IdeaSchema, isSingleEmoji, ReactionSchema } from './idea.ts'
import { makeIdea } from './test-utils.ts'

const valid = (overrides: object) => IdeaSchema.safeParse({ ...makeIdea(), ...overrides }).success

describe('IdeaSchema', () => {
  it('accepts a valid idea, with optional fields', () => {
    expect(valid({})).toBe(true)
    expect(valid({ bring: ['Blanket'], searchQuery: 'park near me' })).toBe(true)
  })

  it('enforces title and summary lengths', () => {
    expect(valid({ title: 'x'.repeat(60) })).toBe(true)
    expect(valid({ title: 'x'.repeat(61) })).toBe(false)
    expect(valid({ title: '  ' })).toBe(false)
    expect(valid({ summary: 'x'.repeat(220) })).toBe(true)
    expect(valid({ summary: 'x'.repeat(221) })).toBe(false)
  })

  it('needs 2–6 steps', () => {
    expect(valid({ steps: ['One'] })).toBe(false)
    expect(valid({ steps: Array(6).fill('Step') })).toBe(true)
    expect(valid({ steps: Array(7).fill('Step') })).toBe(false)
    expect(valid({ steps: ['One', ''] })).toBe(false)
  })

  it('rejects out-of-range enums', () => {
    expect(valid({ budget: 4 })).toBe(false)
    expect(valid({ budget: '1' })).toBe(false)
    expect(valid({ category: 'sports' })).toBe(false)
    expect(valid({ vibes: ['moody'] })).toBe(false)
    expect(valid({ source: 'web' })).toBe(false)
  })

  it('needs at least one time of day, but vibes may be empty', () => {
    expect(valid({ timesOfDay: [] })).toBe(false)
    expect(valid({ vibes: [] })).toBe(true)
  })

  it('needs exactly one emoji', () => {
    expect(valid({ emoji: '🍕🍷' })).toBe(false)
    expect(valid({ emoji: 'A' })).toBe(false)
    expect(valid({ emoji: '' })).toBe(false)
  })
})

describe('isSingleEmoji', () => {
  it('accepts single emoji, including sequences, variation selectors, skin tones and flags', () => {
    for (const e of ['🎲', '👩‍❤️‍👨', '☀️', '☕', '👋🏽', '🇬🇷']) expect(isSingleEmoji(e)).toBe(true)
  })

  it('rejects text, pairs and emoji with text', () => {
    for (const e of ['x', '1', '🎲🎲', '🎲 ', 'hi🎲']) expect(isSingleEmoji(e)).toBe(false)
  })
})

describe('ReactionSchema', () => {
  it('needs an ISO timestamp', () => {
    expect(ReactionSchema.safeParse({ ideaId: 'a', reaction: 'skip', at: '2026-11-03T20:00:00.000Z' }).success).toBe(true)
    expect(ReactionSchema.safeParse({ ideaId: 'a', reaction: 'skip', at: 'yesterday' }).success).toBe(false)
    expect(ReactionSchema.safeParse({ ideaId: 'a', reaction: 'love', at: '2026-11-03T20:00:00Z' }).success).toBe(false)
  })
})
