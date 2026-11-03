import {
  IdeaSchema,
  type Budget,
  type Category,
  type Duration,
  type Energy,
  type Idea,
  type Prep,
  type Setting,
  type Space,
  type TimeOfDay,
  type Vibe,
  type WeatherFit,
} from './idea.ts'

/** Form state for an own idea. Steps and bring are one item per line. */
export type IdeaFormValues = {
  title: string
  emoji: string
  summary: string
  steps: string
  bring: string
  category: Category
  budget: Budget
  duration: Duration
  setting: Setting
  space: Space
  energy: Energy
  timesOfDay: TimeOfDay[]
  weather: WeatherFit
  prep: Prep
  vibes: Vibe[]
  searchQuery: string
}

export type IdeaFormField = keyof IdeaFormValues
/** Field → Zod issue code of the first problem found in it. */
export type IdeaFormErrors = Partial<Record<IdeaFormField, string>>

export const EMPTY_IDEA_FORM: IdeaFormValues = {
  title: '',
  emoji: '💡',
  summary: '',
  steps: '',
  bring: '',
  category: 'romantic',
  budget: 0,
  duration: 'short',
  setting: 'home',
  space: 'indoor',
  energy: 'medium',
  timesOfDay: ['evening'],
  weather: 'any',
  prep: 'none',
  vibes: [],
  searchQuery: '',
}

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

export function formToIdea(
  values: IdeaFormValues,
  id: string,
): { ok: true; idea: Idea } | { ok: false; errors: IdeaFormErrors } {
  const bring = lines(values.bring)
  const searchQuery = values.searchQuery.trim()
  const result = IdeaSchema.safeParse({
    id,
    source: 'custom',
    title: values.title.trim(),
    summary: values.summary.trim(),
    steps: lines(values.steps),
    ...(bring.length > 0 && { bring }),
    category: values.category,
    emoji: values.emoji.trim(),
    budget: values.budget,
    duration: values.duration,
    setting: values.setting,
    space: values.space,
    energy: values.energy,
    timesOfDay: values.timesOfDay,
    weather: values.weather,
    prep: values.prep,
    vibes: values.vibes,
    ...(searchQuery && { searchQuery }),
  })
  if (result.success) return { ok: true, idea: result.data }

  const errors: IdeaFormErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as IdeaFormField
    errors[field] ??= issue.code
  }
  return { ok: false, errors }
}

export function ideaToForm(idea: Idea): IdeaFormValues {
  return {
    title: idea.title,
    emoji: idea.emoji,
    summary: idea.summary,
    steps: idea.steps.join('\n'),
    bring: (idea.bring ?? []).join('\n'),
    category: idea.category,
    budget: idea.budget,
    duration: idea.duration,
    setting: idea.setting,
    space: idea.space,
    energy: idea.energy,
    timesOfDay: [...idea.timesOfDay],
    weather: idea.weather,
    prep: idea.prep,
    vibes: [...idea.vibes],
    searchQuery: idea.searchQuery ?? '',
  }
}
