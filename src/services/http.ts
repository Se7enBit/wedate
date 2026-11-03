import type { z } from 'zod'

export type ServiceErrorCode = 'offline' | 'timeout' | 'http' | 'bad_response'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  readonly status?: number

  constructor(code: ServiceErrorCode, status?: number) {
    super(status ? `${code} (${status})` : code)
    this.name = 'ServiceError'
    this.code = code
    this.status = status
  }
}

/** GET a JSON URL with a timeout and validate it. Throws ServiceError only. */
export async function getJson<T>(url: string, schema: z.ZodType<T>, timeoutMs: number): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ServiceError('offline')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch {
    throw new ServiceError(controller.signal.aborted ? 'timeout' : 'offline')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) throw new ServiceError('http', response.status)
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ServiceError('bad_response')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ServiceError('bad_response')
  return parsed.data
}
