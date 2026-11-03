import { describe, expect, it } from 'vitest'
import type { Reaction } from './idea.ts'
import { pruneReactions, REACTION_MAX, SavedEntrySchema, savedTab, type SavedEntry, type SavedMap } from './saved.ts'
import { makeIdea } from './test-utils.ts'

const entry = (id: string, overrides: Partial<SavedEntry> = {}, source: 'library' | 'ai' | 'custom' = 'library'): SavedEntry => ({
  idea: makeIdea({ id, source }),
  status: 'saved',
  note: '',
  savedAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
})

const saved: SavedMap = {
  lib: entry('lib', { updatedAt: '2026-11-01T10:00:00.000Z' }),
  ai: entry('ai', { updatedAt: '2026-11-03T10:00:00.000Z' }, 'ai'),
  done: entry('done', { status: 'done', updatedAt: '2026-11-02T10:00:00.000Z' }),
  mine: entry('mine', { updatedAt: '2026-11-04T10:00:00.000Z' }, 'custom'),
  mineDone: entry('mineDone', { status: 'done', updatedAt: '2026-11-05T10:00:00.000Z' }, 'custom'),
}
const ids = (tab: Parameters<typeof savedTab>[1]) => savedTab(saved, tab).map((e) => e.idea.id)

describe('savedTab', () => {
  it('Saved = saved library and AI ideas, newest change first', () => {
    expect(ids('saved')).toEqual(['ai', 'lib'])
  })

  it('Done = every done idea, own ones included', () => {
    expect(ids('done')).toEqual(['mineDone', 'done'])
  })

  it('Mine = own ideas, whatever their status', () => {
    expect(ids('mine')).toEqual(['mineDone', 'mine'])
  })

  it('handles an empty map', () => {
    expect(savedTab({}, 'saved')).toEqual([])
  })
})

describe('SavedEntrySchema', () => {
  it('accepts a valid entry and rejects a bad status or a long note', () => {
    expect(SavedEntrySchema.safeParse(entry('a')).success).toBe(true)
    expect(SavedEntrySchema.safeParse({ ...entry('a'), status: 'maybe' }).success).toBe(false)
    expect(SavedEntrySchema.safeParse({ ...entry('a'), note: 'x'.repeat(1001) }).success).toBe(false)
  })
})

describe('pruneReactions', () => {
  const now = new Date('2026-11-03T12:00:00.000Z')
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString()
  const r = (ideaId: string, at: string): Reaction => ({ ideaId, reaction: 'skip', at })

  it('drops reactions older than 60 days and sorts oldest first', () => {
    const kept = pruneReactions([r('new', daysAgo(1)), r('old', daysAgo(61)), r('edge', daysAgo(60))], now)
    expect(kept.map((x) => x.ideaId)).toEqual(['edge', 'new'])
  })

  it('keeps only the newest 500', () => {
    const many = Array.from({ length: REACTION_MAX + 20 }, (_, i) =>
      r(`i${i}`, new Date(now.getTime() - (REACTION_MAX + 20 - i) * 60_000).toISOString()),
    )
    const kept = pruneReactions(many, now)
    expect(kept).toHaveLength(REACTION_MAX)
    expect(kept[0].ideaId).toBe('i20')
    expect(kept.at(-1)?.ideaId).toBe(`i${REACTION_MAX + 19}`)
  })
})
