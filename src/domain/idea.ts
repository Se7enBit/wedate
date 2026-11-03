import { z } from 'zod'

// Enums. Arrays keep a meaningful order (durations shortest first, times of day in clock order).
export const CATEGORIES = [
  'food_drink',
  'outdoors',
  'culture',
  'active',
  'cozy_home',
  'creative',
  'games',
  'learning',
  'nightlife',
  'adventure',
  'wellness',
  'romantic',
  'day_trip',
  'giving_back',
] as const
export const VIBES = [
  'cozy',
  'romantic',
  'playful',
  'adventurous',
  'chill',
  'creative',
  'fancy',
  'spontaneous',
] as const
export const TIMES_OF_DAY = ['morning', 'afternoon', 'evening', 'late_night'] as const
export const DURATIONS = ['quick', 'short', 'half_day', 'full_day'] as const
export const BUDGETS = [0, 1, 2, 3] as const
export const SETTINGS = ['home', 'out', 'either'] as const
export const SPACES = ['indoor', 'outdoor', 'either'] as const
export const ENERGIES = ['low', 'medium', 'high'] as const
export const WEATHER_FITS = ['any', 'needs_good', 'great_when_bad'] as const
export const PREPS = ['none', 'some', 'plan_ahead'] as const
export const SOURCES = ['library', 'ai', 'custom'] as const
export const REACTIONS = ['skip', 'save', 'go'] as const

export const CategorySchema = z.enum(CATEGORIES)
export const VibeSchema = z.enum(VIBES)
export const TimeOfDaySchema = z.enum(TIMES_OF_DAY)
export const DurationSchema = z.enum(DURATIONS)
export const BudgetSchema = z.literal(BUDGETS)

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' })

/** True when `s` is exactly one emoji (including ZWJ sequences, skin tones and flags). */
export function isSingleEmoji(s: string): boolean {
  const parts = [...graphemes.segment(s)]
  if (parts.length !== 1) return false
  return /\p{Extended_Pictographic}/u.test(s) || /^\p{Regional_Indicator}{2}$/u.test(s)
}

const text = (max: number) => z.string().trim().min(1).max(max)

export const IdeaSchema = z.object({
  id: z.string().min(1),
  source: z.enum(SOURCES),
  title: text(60),
  summary: text(220),
  steps: z.array(text(200)).min(2).max(6),
  bring: z.array(text(80)).optional(),
  category: CategorySchema,
  emoji: z.string().refine(isSingleEmoji, 'Must be exactly one emoji'),
  budget: BudgetSchema,
  duration: DurationSchema,
  setting: z.enum(SETTINGS),
  space: z.enum(SPACES),
  energy: z.enum(ENERGIES),
  timesOfDay: z.array(TimeOfDaySchema).min(1),
  weather: z.enum(WEATHER_FITS),
  prep: z.enum(PREPS),
  vibes: z.array(VibeSchema),
  searchQuery: text(120).optional(),
})

export const ReactionSchema = z.object({
  ideaId: z.string().min(1),
  reaction: z.enum(REACTIONS),
  at: z.iso.datetime(),
})

export type Idea = z.infer<typeof IdeaSchema>
export type Reaction = z.infer<typeof ReactionSchema>
export type Category = z.infer<typeof CategorySchema>
export type Vibe = z.infer<typeof VibeSchema>
export type TimeOfDay = z.infer<typeof TimeOfDaySchema>
export type Duration = z.infer<typeof DurationSchema>
export type Budget = z.infer<typeof BudgetSchema>
export type Setting = Idea['setting']
export type Space = Idea['space']
export type Energy = Idea['energy']
export type WeatherFit = Idea['weather']
export type Prep = Idea['prep']
