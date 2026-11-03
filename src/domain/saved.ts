import { z } from 'zod'
import { IdeaSchema, type Reaction } from './idea.ts'

export const NOTE_MAX = 1000
export const REACTION_DAYS = 60
export const REACTION_MAX = 500

export const SavedEntrySchema = z.object({
  idea: IdeaSchema,
  status: z.enum(['saved', 'done']),
  note: z.string().max(NOTE_MAX),
  savedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type SavedEntry = z.infer<typeof SavedEntrySchema>
export type SavedMap = Record<string, SavedEntry>

export const SAVED_TABS = ['saved', 'done', 'mine'] as const
export type SavedTab = (typeof SAVED_TABS)[number]

const inTab: Record<SavedTab, (e: SavedEntry) => boolean> = {
  saved: (e) => e.status === 'saved' && e.idea.source !== 'custom',
  done: (e) => e.status === 'done',
  mine: (e) => e.idea.source === 'custom',
}

/** Entries for a Saved-screen segment, most recently changed first. */
export function savedTab(saved: SavedMap, tab: SavedTab): SavedEntry[] {
  return Object.values(saved)
    .filter(inTab[tab])
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

/** Keep the last 60 days, at most 500, oldest first. */
export function pruneReactions(reactions: readonly Reaction[], now: Date): Reaction[] {
  const cutoff = now.getTime() - REACTION_DAYS * 24 * 60 * 60 * 1000
  return reactions
    .filter((r) => Date.parse(r.at) >= cutoff)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-REACTION_MAX)
}
