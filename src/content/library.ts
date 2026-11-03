import { z } from 'zod'
import { IdeaSchema, type Idea } from '../domain/idea.ts'
import type { SavedMap } from '../domain/saved.ts'
import raw from './ideas.json'

/** The curated library, validated once at startup (ideas.test.ts keeps it valid). */
export const LIBRARY: Idea[] = z.array(IdeaSchema).parse(raw)

const byId = new Map(LIBRARY.map((idea) => [idea.id, idea]))

/** The current library version first, else the saved snapshot (AI and own ideas), else an unsaved AI draft. */
export function findIdea(id: string, saved: SavedMap, drafts: Record<string, Idea> = {}): Idea | undefined {
  return byId.get(id) ?? saved[id]?.idea ?? drafts[id]
}
