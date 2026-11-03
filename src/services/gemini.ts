import { z } from 'zod'
import { DEFAULT_GEMINI_MODEL } from '../config.ts'
import type { Idea } from '../domain/idea.ts'
import { buildPrompt, parseIdeas, type AiErrorCode, type IdeaPrefs, type PromptContext } from '../domain/prompt.ts'
import { newId, type Settings } from '../store/useStore.ts'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 20_000

type GeminiSettings = Pick<Settings, 'geminiKey' | 'geminiModel'>

export class GeminiError extends Error {
  readonly code: AiErrorCode

  constructor(code: AiErrorCode) {
    super(code)
    this.name = 'GeminiError'
    this.code = code
  }
}

/** The error code to show for anything a Gemini call throws. */
export function aiErrorCode(err: unknown): AiErrorCode {
  return err instanceof GeminiError ? err.code : 'unavailable'
}

/** The model to call: the one from Settings, or the default when that field is blank. */
export function resolveModel(model: string): string {
  return model.trim() || DEFAULT_GEMINI_MODEL
}

function errorForStatus(status: number): AiErrorCode {
  if (status === 400 || status === 401 || status === 403) return 'bad_key'
  if (status === 404) return 'bad_model'
  if (status === 429) return 'rate_limited'
  return 'unavailable'
}

/** POST to generateContent. The key only ever travels in the header. Throws GeminiError only. */
async function post(settings: GeminiSettings, body: object): Promise<unknown> {
  if (!settings.geminiKey) throw new GeminiError('no_key')
  if (navigator.onLine === false) throw new GeminiError('unavailable')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(resolveModel(settings.geminiModel))}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.geminiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) throw new GeminiError(errorForStatus(response.status))
    try {
      return await response.json()
    } catch {
      throw new GeminiError(controller.signal.aborted ? 'unavailable' : 'bad_output')
    }
  } catch (err) {
    throw err instanceof GeminiError ? err : new GeminiError('unavailable')
  } finally {
    clearTimeout(timer)
  }
}

// A blocked prompt comes back with no candidates, which ends up as `bad_output`.
const ResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional() })).optional() }).optional(),
      }),
    )
    .optional(),
})

/** 3–5 tailored ideas. Throws GeminiError, including `bad_output` when no idea is usable. */
export async function generateIdeas(
  settings: GeminiSettings,
  prefs: IdeaPrefs,
  ctx: PromptContext,
  avoidTitles: readonly string[],
): Promise<Idea[]> {
  const body = await post(settings, {
    contents: [{ parts: [{ text: buildPrompt(prefs, ctx, avoidTitles) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  })
  const parsed = ResponseSchema.safeParse(body)
  if (!parsed.success) throw new GeminiError('bad_output')

  const parts = parsed.data.candidates?.[0]?.content?.parts ?? []
  const ideas = parseIdeas(parts.map((p) => p.text ?? '').join(''), newId, avoidTitles)
  if (ideas.length === 0) throw new GeminiError('bad_output')
  return ideas
}

/** One tiny request to check the key and model. Any success counts. Throws GeminiError. */
export async function testKey(settings: GeminiSettings): Promise<void> {
  await post(settings, {
    contents: [{ parts: [{ text: 'Reply with OK.' }] }],
    generationConfig: { maxOutputTokens: 5 },
  })
}
