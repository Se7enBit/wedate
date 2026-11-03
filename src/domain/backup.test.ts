import { describe, expect, it } from 'vitest'
import { backupFileName, fromBackup, parseBackup, toBackup, type Backup, type BackupData } from './backup.ts'
import type { Reaction } from './idea.ts'
import type { SavedEntry } from './saved.ts'
import { makeIdea } from './test-utils.ts'

const NOW = new Date('2026-11-04T12:00:00.000Z')
const athens = { name: 'Athens', lat: 37.98, lon: 23.73 }
const oslo = { name: 'Oslo', lat: 59.91, lon: 10.75 }

const entry = (id: string, updatedAt: string, note = ''): SavedEntry => ({
  idea: makeIdea({ id, source: 'ai' }),
  status: 'saved',
  note,
  savedAt: '2026-10-01T10:00:00.000Z',
  updatedAt,
})
const reaction = (ideaId: string, at: string): Reaction => ({ ideaId, reaction: 'skip', at })

const data: BackupData = {
  saved: { a: entry('a', '2026-11-01T10:00:00.000Z', 'a note') },
  reactions: [reaction('a', '2026-11-01T10:00:00.000Z')],
  city: athens,
}
const backupOf = (d: BackupData): Backup => toBackup(d, NOW)
const emptyData: BackupData = { saved: {}, reactions: [] }

describe('toBackup', () => {
  it('holds the fields of the backup format', () => {
    expect(toBackup(data, NOW)).toEqual({
      app: 'wedate',
      version: 1,
      exportedAt: NOW.toISOString(),
      saved: data.saved,
      reactions: data.reactions,
      city: athens,
    })
  })

  it('never contains the Gemini key, even when the input has one', () => {
    const settingsLike = { ...data, geminiKey: 'SECRET-KEY', geminiModel: 'some-model', settings: { geminiKey: 'SECRET-KEY' } }
    const json = JSON.stringify(toBackup(settingsLike, NOW))
    expect(json).not.toContain('SECRET-KEY')
    expect(json).not.toContain('geminiKey')
    expect(json).not.toContain('geminiModel')
  })

  it('leaves the city out when there is none', () => {
    expect('city' in toBackup(emptyData, NOW)).toBe(false)
  })
})

describe('backupFileName', () => {
  it('uses the local date, zero-padded', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 30))).toBe('wedate-backup-2026-01-05.json')
    expect(backupFileName(new Date(2026, 10, 14, 0, 30))).toBe('wedate-backup-2026-11-14.json')
  })
})

describe('parseBackup', () => {
  const text = (over: object = {}) => JSON.stringify({ ...backupOf(data), ...over })

  it('accepts a valid backup', () => {
    const parsed = parseBackup(text())
    expect(parsed).toEqual({ ok: true, backup: backupOf(data) })
  })

  it('rejects text that is not JSON', () => {
    expect(parseBackup('not json {')).toEqual({ ok: false, reason: 'not_json' })
    expect(parseBackup('')).toEqual({ ok: false, reason: 'not_json' })
  })

  it('rejects JSON that is not a WeDate backup', () => {
    for (const bad of ['{}', '[]', 'null', text({ app: 'other' }), text({ version: 2 }), text({ exportedAt: 'yesterday' })]) {
      expect(parseBackup(bad)).toEqual({ ok: false, reason: 'not_backup' })
    }
  })

  it('rejects the whole file when one entry is invalid', () => {
    const bad = { ...entry('b', '2026-11-01T10:00:00.000Z'), status: 'maybe' }
    expect(parseBackup(text({ saved: { ...data.saved, b: bad } }))).toEqual({ ok: false, reason: 'not_backup' })
    expect(parseBackup(text({ reactions: [{ ideaId: 'a' }] }))).toEqual({ ok: false, reason: 'not_backup' })
  })

  it('strips unknown fields, such as a key added by hand', () => {
    const parsed = parseBackup(text({ geminiKey: 'SECRET-KEY', settings: { geminiKey: 'SECRET-KEY' } }))
    expect(parsed.ok).toBe(true)
    expect(JSON.stringify(parsed)).not.toContain('SECRET-KEY')
  })

  it('keys entries by idea id, whatever the file used', () => {
    const parsed = parseBackup(text({ saved: { wrong: data.saved.a } }))
    expect(parsed.ok && Object.keys(parsed.backup.saved)).toEqual(['a'])
  })
})

describe('fromBackup: merge', () => {
  const older = '2026-11-01T10:00:00.000Z'
  const newer = '2026-11-02T10:00:00.000Z'
  const merged = (current: BackupData, file: BackupData) => fromBackup(backupOf(file), current, 'merge', NOW)

  it('takes the entry with the newer updatedAt, in both directions', () => {
    const phoneNewer = merged(
      { ...emptyData, saved: { a: entry('a', newer, 'phone') } },
      { ...emptyData, saved: { a: entry('a', older, 'file') } },
    )
    expect(phoneNewer.saved.a.note).toBe('phone')

    const fileNewer = merged(
      { ...emptyData, saved: { a: entry('a', older, 'phone') } },
      { ...emptyData, saved: { a: entry('a', newer, 'file') } },
    )
    expect(fileNewer.saved.a.note).toBe('file')
  })

  it('keeps the current copy on a tie', () => {
    const tied = merged(
      { ...emptyData, saved: { a: entry('a', older, 'phone') } },
      { ...emptyData, saved: { a: entry('a', older, 'file') } },
    )
    expect(tied.saved.a.note).toBe('phone')
  })

  it('keeps entries that exist on only one side', () => {
    const both = merged(
      { ...emptyData, saved: { a: entry('a', older) } },
      { ...emptyData, saved: { b: entry('b', older) } },
    )
    expect(Object.keys(both.saved).sort()).toEqual(['a', 'b'])
  })

  it('combines reactions without duplicates, oldest first', () => {
    const shared = reaction('a', '2026-11-02T10:00:00.000Z')
    const phoneOnly = reaction('b', '2026-11-03T10:00:00.000Z')
    const fileOnly = reaction('c', '2026-11-01T10:00:00.000Z')
    const { reactions } = merged(
      { ...emptyData, reactions: [shared, phoneOnly] },
      { ...emptyData, reactions: [shared, fileOnly] },
    )
    expect(reactions).toEqual([fileOnly, shared, phoneOnly])
  })

  it('prunes reactions that are too old', () => {
    const { reactions } = merged(emptyData, { ...emptyData, reactions: [reaction('old', '2026-01-01T10:00:00.000Z')] })
    expect(reactions).toEqual([])
  })

  it('keeps the current city, and takes the file city when there is none', () => {
    expect(merged({ ...emptyData, city: oslo }, { ...emptyData, city: athens }).city).toEqual(oslo)
    expect(merged(emptyData, { ...emptyData, city: athens }).city).toEqual(athens)
  })
})

describe('fromBackup: replace', () => {
  const current: BackupData = {
    saved: { old: entry('old', '2026-12-01T10:00:00.000Z') },
    reactions: [reaction('old', '2026-11-03T10:00:00.000Z')],
    city: oslo,
  }

  it('takes everything from the file, even when the phone copy is newer', () => {
    const result = fromBackup(backupOf(data), current, 'replace', NOW)
    expect(Object.keys(result.saved)).toEqual(['a'])
    expect(result.reactions).toEqual(data.reactions)
    expect(result.city).toEqual(athens)
  })

  it('clears the city when the file has none', () => {
    expect(fromBackup(backupOf(emptyData), current, 'replace', NOW).city).toBeUndefined()
  })

  it('prunes reactions that are too old', () => {
    const file = { ...emptyData, reactions: [reaction('old', '2026-01-01T10:00:00.000Z')] }
    expect(fromBackup(backupOf(file), current, 'replace', NOW).reactions).toEqual([])
  })
})

describe('round trip', () => {
  it('restores the same data from the exported JSON', () => {
    const parsed = parseBackup(JSON.stringify(toBackup(data, NOW), null, 2))
    if (!parsed.ok) throw new Error('backup did not parse')
    expect(fromBackup(parsed.backup, emptyData, 'replace', NOW)).toEqual(data)
    expect(fromBackup(parsed.backup, emptyData, 'merge', NOW)).toEqual(data)
  })
})
