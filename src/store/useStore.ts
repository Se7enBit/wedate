import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_GEMINI_MODEL, STORAGE_KEY } from '../config.ts'
import type { Filters } from '../domain/filters.ts'
import type { Budget, Duration, Idea, Reaction, Vibe } from '../domain/idea.ts'
import { NOTE_MAX, pruneReactions, type SavedEntry, type SavedMap } from '../domain/saved.ts'

export type Settings = {
  geminiKey?: string
  geminiModel: string
  city?: { name: string; lat: number; lon: number }
}

type PersistedState = {
  saved: SavedMap
  reactions: Reaction[]
  settings: Settings
}

/** Now-tab choices and deck position: kept while the app is open, not persisted. */
export type NowPrefs = {
  moods: Vibe[]
  setting?: 'home' | 'out'
  maxBudget: Budget
  maxDuration: Duration
}

type NowSession = NowPrefs & {
  seed: number
  /** Ideas already swiped in this deal. */
  passed: string[]
}

type State = PersistedState & {
  /** Discover filters: kept while the app is open, not persisted. */
  filters: Filters
  now: NowSession
  save: (idea: Idea) => void
  /** Removes a saved entry (for own ideas this deletes the idea). */
  remove: (id: string) => void
  markDone: (idea: Idea) => void
  markNotDone: (id: string) => void
  setNote: (id: string, note: string) => void
  addCustom: (idea: Idea) => void
  updateCustom: (idea: Idea) => void
  setFilters: (patch: Partial<Filters>) => void
  clearFilters: () => void
  /** Logs a skip reaction (left swipe). */
  skip: (id: string) => void
  setCity: (city: Settings['city']) => void
  /** Changing prefs starts a new deal. */
  setNowPrefs: (patch: Partial<NowPrefs>) => void
  pass: (id: string) => void
  redeal: () => void
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31)

const nowIso = () => new Date().toISOString()

function addReaction(reactions: Reaction[], ideaId: string, reaction: Reaction['reaction']): Reaction[] {
  return pruneReactions([...reactions, { ideaId, reaction, at: nowIso() }], new Date())
}

function newEntry(idea: Idea, status: SavedEntry['status']): SavedEntry {
  const t = nowIso()
  return { idea, status, note: '', savedAt: t, updatedAt: t }
}

/** A random UUID; falls back to getRandomValues where randomUUID is missing (plain-http LAN testing). */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      saved: {},
      reactions: [],
      settings: { geminiModel: DEFAULT_GEMINI_MODEL },
      filters: {},
      now: { moods: [], maxBudget: 3, maxDuration: 'full_day', seed: newSeed(), passed: [] },

      save: (idea) =>
        set((s) =>
          s.saved[idea.id]
            ? s
            : {
                saved: { ...s.saved, [idea.id]: newEntry(idea, 'saved') },
                reactions: addReaction(s.reactions, idea.id, 'save'),
              },
        ),

      remove: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.saved
          return { saved: rest }
        }),

      markDone: (idea) =>
        set((s) => {
          const existing = s.saved[idea.id]
          const entry = existing ? { ...existing, status: 'done' as const, updatedAt: nowIso() } : newEntry(idea, 'done')
          return {
            saved: { ...s.saved, [idea.id]: entry },
            reactions: addReaction(s.reactions, idea.id, 'go'),
          }
        }),

      markNotDone: (id) =>
        set((s) => {
          const existing = s.saved[id]
          if (!existing) return s
          return { saved: { ...s.saved, [id]: { ...existing, status: 'saved', updatedAt: nowIso() } } }
        }),

      setNote: (id, note) =>
        set((s) => {
          const existing = s.saved[id]
          if (!existing) return s
          return { saved: { ...s.saved, [id]: { ...existing, note: note.slice(0, NOTE_MAX), updatedAt: nowIso() } } }
        }),

      addCustom: (idea) => set((s) => ({ saved: { ...s.saved, [idea.id]: newEntry(idea, 'saved') } })),

      updateCustom: (idea) =>
        set((s) => {
          const existing = s.saved[idea.id]
          if (!existing) return s
          return { saved: { ...s.saved, [idea.id]: { ...existing, idea, updatedAt: nowIso() } } }
        }),

      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      clearFilters: () => set({ filters: {} }),

      skip: (id) => set((s) => ({ reactions: addReaction(s.reactions, id, 'skip') })),
      setCity: (city) => set((s) => ({ settings: { ...s.settings, city } })),
      setNowPrefs: (patch) => set((s) => ({ now: { ...s.now, ...patch, passed: [] } })),
      pass: (id) => set((s) => ({ now: { ...s.now, passed: [...s.now.passed, id] } })),
      redeal: () => set((s) => ({ now: { ...s.now, seed: newSeed(), passed: [] } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s): PersistedState => ({ saved: s.saved, reactions: s.reactions, settings: s.settings }),
      // Version 1 is the first stored shape; future versions convert older data here.
      migrate: (persisted) => persisted as PersistedState,
    },
  ),
)
