import { z } from 'zod'
import {
  CATEGORIES,
  ENERGIES,
  IdeaSchema,
  PREPS,
  SETTINGS,
  SPACES,
  TIMES_OF_DAY,
  VIBES,
  WEATHER_FITS,
  DURATIONS,
  type Budget,
  type Duration,
  type Energy,
  type Idea,
  type TimeOfDay,
  type Vibe,
} from './idea.ts'

export const NOTES_MAX = 300
const MAX_IDEAS = 5

export type AiErrorCode = 'no_key' | 'bad_key' | 'bad_model' | 'rate_limited' | 'unavailable' | 'bad_output'

export type IdeaPrefs = {
  vibes: Vibe[]
  /** Upper limits: "up to this much" and "up to this long". */
  budget: Budget
  duration: Duration
  setting?: 'home' | 'out'
  energy?: Energy
  notes?: string
}

export type PromptContext = {
  now: Date
  timeOfDay: TimeOfDay
  weather?: { tempC: number; isRaining: boolean }
  cityName?: string
  /** The date should start soon: it must fit the current time and need no planning. */
  rightNow?: boolean
}

const BUDGET_LIMIT: Record<Budget, string> = {
  0: 'free only',
  1: 'up to €20 for two',
  2: 'up to €60 for two',
  3: 'any budget',
}

const DURATION_LIMIT: Record<Duration, string> = {
  quick: 'under 1 hour',
  short: 'up to 3 hours',
  half_day: 'up to 6 hours',
  full_day: 'any length',
}

const oneOf = (values: readonly string[]) => `one of ${values.map((v) => `"${v}"`).join(', ')}`

const IDEA_SHAPE = `Each idea is an object with exactly these fields:
- title: string, at most 60 characters
- summary: string, 1-2 sentences, at most 220 characters
- steps: array of 2 to 6 short strings, each at most 200 characters
- bring: optional array of short strings, each at most 80 characters
- category: ${oneOf(CATEGORIES)}
- emoji: string, exactly one emoji
- budget: number for two people: 0 = free, 1 = up to €20, 2 = up to €60, 3 = over €60
- duration: ${oneOf(DURATIONS)} (under 1h, 1-3h, 3-6h, over 6h)
- setting: ${oneOf(SETTINGS)}
- space: ${oneOf(SPACES)}
- energy: ${oneOf(ENERGIES)}
- timesOfDay: non-empty array, each ${oneOf(TIMES_OF_DAY)}
- weather: ${oneOf(WEATHER_FITS)}
- prep: ${oneOf(PREPS)}
- vibes: array, each ${oneOf(VIBES)}
- searchQuery: string, at most 120 characters, what to look up on Google or Maps, e.g. "pottery class for couples near me"`

/** The Gemini prompt for tailored date ideas (CLAUDE.md section 9). */
export function buildPrompt(prefs: IdeaPrefs, ctx: PromptContext, avoidTitles: readonly string[]): string {
  const date = ctx.now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const notes = prefs.notes?.trim().slice(0, NOTES_MAX)

  const lines = [
    'Suggest 3 to 5 date ideas for a couple.',
    '',
    'What they want:',
    `- Vibes: ${prefs.vibes.length > 0 ? prefs.vibes.join(', ') : 'any'}`,
    `- Budget: ${BUDGET_LIMIT[prefs.budget]}`,
    `- Duration: ${DURATION_LIMIT[prefs.duration]}`,
    `- Setting: ${prefs.setting ?? 'home or out'}`,
    `- Energy: ${prefs.energy ?? 'any'}`,
    ...(notes ? [`- Their notes: ${notes}`] : []),
    '',
    'Context:',
    `- Date: ${date}`,
    `- Time of day: ${ctx.timeOfDay}`,
    ...(ctx.weather
      ? [`- Weather: ${Math.round(ctx.weather.tempC)}°C, ${ctx.weather.isRaining ? 'rain or snow' : 'dry'}`]
      : []),
    ...(ctx.cityName ? [`- City: ${ctx.cityName}`] : []),
    '',
    'Rules:',
    '- Stay within the budget and duration above. Budgets are realistic amounts in euros for two people.',
    '- Keep every idea safe, legal and consensual.',
    '- Describe kinds of places, like "a rooftop bar with a view". Never name a specific venue or business.',
    '- Keep steps short and practical.',
    '- Give every idea a searchQuery.',
    ...(ctx.rightNow
      ? [
          `- They want to start soon: timesOfDay must include "${ctx.timeOfDay}".`,
          '- prep must be "none" or "some", never "plan_ahead".',
        ]
      : []),
    ...(avoidTitles.length > 0
      ? ['- Do not repeat or closely imitate these ideas they have already seen:', ...avoidTitles.map((t) => `  - ${t}`)]
      : []),
    '',
    IDEA_SHAPE,
    '',
    'Reply with JSON only, in this shape: { "ideas": [ ... ] }',
  ]
  return lines.join('\n')
}

// The model never decides `id` or `source`.
const AiIdeaSchema = IdeaSchema.omit({ id: true, source: true })
const AiReplySchema = z.object({ ideas: z.array(z.unknown()) })

/**
 * Valid ideas from the model's JSON reply; invalid ones are dropped. `[]` if the reply is unusable.
 * Avoided titles are dropped here too, because the model can ignore that instruction.
 */
export function parseIdeas(json: string, makeId: () => string, avoidTitles: readonly string[] = []): Idea[] {
  let body: unknown
  try {
    body = JSON.parse(json)
  } catch {
    return []
  }
  const reply = AiReplySchema.safeParse(body)
  if (!reply.success) return []

  const avoid = new Set(avoidTitles.map((t) => t.trim().toLowerCase()))
  const ideas: Idea[] = []
  for (const item of reply.data.ideas) {
    const parsed = AiIdeaSchema.safeParse(item)
    if (!parsed.success || avoid.has(parsed.data.title.toLowerCase())) continue
    ideas.push({ ...parsed.data, id: makeId(), source: 'ai' })
    if (ideas.length === MAX_IDEAS) break
  }
  return ideas
}

/** Unique titles to pass as `avoidTitles`, keeping the first `max`. List the most relevant ideas first. */
export function recentTitles(ideas: readonly Idea[], max = 40): string[] {
  return [...new Set(ideas.map((idea) => idea.title))].slice(0, max)
}
