import { z } from 'zod'
import { ReactionSchema, type Reaction } from './idea.ts'
import { pruneReactions, SavedEntrySchema, type SavedMap } from './saved.ts'

const CitySchema = z.object({ name: z.string().min(1), lat: z.number(), lon: z.number() })

export const BackupSchema = z.object({
  app: z.literal('wedate'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  saved: z.record(z.string(), SavedEntrySchema),
  reactions: z.array(ReactionSchema),
  city: CitySchema.optional(),
})

export type Backup = z.infer<typeof BackupSchema>

/** What a backup carries. The Gemini key and model are deliberately not part of it. */
export type BackupData = {
  saved: SavedMap
  reactions: Reaction[]
  city?: z.infer<typeof CitySchema>
}

export type RestoreMode = 'merge' | 'replace'

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; reason: 'not_json' | 'not_backup' }

/** Picks each field by name, so nothing else in the store can end up in the file. */
export function toBackup(data: BackupData, now: Date): Backup {
  return {
    app: 'wedate',
    version: 1,
    exportedAt: now.toISOString(),
    saved: data.saved,
    reactions: data.reactions,
    ...(data.city ? { city: data.city } : {}),
  }
}

/** `wedate-backup-YYYY-MM-DD.json`, using the local date. */
export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `wedate-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

/** Validates a whole file: one bad entry rejects it. Unknown fields are stripped. */
export function parseBackup(text: string): ParsedBackup {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'not_json' }
  }
  const parsed = BackupSchema.safeParse(body)
  if (!parsed.success) return { ok: false, reason: 'not_backup' }
  // Entries are looked up by idea id, whatever keys the file used.
  const saved = Object.fromEntries(Object.values(parsed.data.saved).map((entry) => [entry.idea.id, entry]))
  return { ok: true, backup: { ...parsed.data, saved } }
}

/**
 * The data to keep after restoring. Merge: the newer `updatedAt` wins, ties keep the current copy, and the
 * current city stays if there is one. Replace: everything comes from the backup.
 */
export function fromBackup(backup: Backup, current: BackupData, mode: RestoreMode, now: Date): BackupData {
  if (mode === 'replace') {
    return { saved: backup.saved, reactions: pruneReactions(backup.reactions, now), city: backup.city }
  }

  const saved = { ...current.saved }
  for (const [id, entry] of Object.entries(backup.saved)) {
    const existing = saved[id]
    if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt)) saved[id] = entry
  }

  const seen = new Set<string>()
  const reactions = [...current.reactions, ...backup.reactions].filter((r) => {
    const key = `${r.ideaId}|${r.reaction}|${r.at}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { saved, reactions: pruneReactions(reactions, now), city: current.city ?? backup.city }
}
