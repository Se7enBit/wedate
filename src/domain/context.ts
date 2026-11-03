import { z } from 'zod'
import { TIMES_OF_DAY, type TimeOfDay } from './idea.ts'

// Bucket start hours (local time): morning 05–12, afternoon 12–17, evening 17–22, late_night 22–05.
const BUCKET_START: Record<TimeOfDay, number> = {
  morning: 5,
  afternoon: 12,
  evening: 17,
  late_night: 22,
}

export function timeOfDay(date: Date): TimeOfDay {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'late_night'
}

export function nextTimeOfDay(bucket: TimeOfDay): TimeOfDay {
  return TIMES_OF_DAY[(TIMES_OF_DAY.indexOf(bucket) + 1) % TIMES_OF_DAY.length]
}

/** Minutes from `date` until the current bucket ends (local time). */
export function minutesUntilNextBucket(date: Date): number {
  const nextStart = BUCKET_START[nextTimeOfDay(timeOfDay(date))]
  const nowMin = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
  return (nextStart * 60 - nowMin + 24 * 60) % (24 * 60)
}

// Weather — Open-Meteo `current=temperature_2m,precipitation,weather_code,is_day`.

export type OpenMeteoCurrent = {
  temperature_2m: number
  precipitation: number
  weather_code: number
  is_day: number
}

export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

export type WeatherSummary = {
  tempC: number
  /** Any precipitation, snow included. */
  isRaining: boolean
  isDay: boolean
  code: number
  kind: WeatherKind
  emoji: string
}

const KIND_EMOJI: Record<WeatherKind, string> = {
  clear: '☀️',
  cloudy: '⛅',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  snow: '❄️',
  storm: '⛈️',
}

const WET: readonly WeatherKind[] = ['drizzle', 'rain', 'snow', 'storm']

/** WMO weather interpretation codes, as listed in the Open-Meteo docs. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95 && code <= 99) return 'storm'
  return 'cloudy'
}

export function weatherFromOpenMeteo(current: OpenMeteoCurrent): WeatherSummary {
  const kind = weatherKind(current.weather_code)
  return {
    tempC: current.temperature_2m,
    isRaining: current.precipitation > 0 || WET.includes(kind),
    isDay: current.is_day === 1,
    code: current.weather_code,
    kind,
    emoji: KIND_EMOJI[kind],
  }
}

/** A rainy day for the dev-only "fake rain" switch; keeps day/night from the real weather. */
export function fakeRain(weather?: WeatherSummary): WeatherSummary {
  return { tempC: 12, isRaining: true, isDay: weather?.isDay ?? true, code: 63, kind: 'rain', emoji: KIND_EMOJI.rain }
}

// API response shapes (validated before use).

export const OpenMeteoForecastSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    precipitation: z.number(),
    weather_code: z.number().int(),
    is_day: z.number().int(),
  }),
})

export const GeocodingSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
})

export type GeocodingResult = NonNullable<z.infer<typeof GeocodingSchema>['results']>[number]

/** "Thessaloniki, Central Macedonia, Greece", skipping missing and repeated parts. */
export function cityLabel(result: GeocodingResult): string {
  const parts = [result.name, result.admin1, result.country].filter((p): p is string => !!p)
  return parts.filter((p, i) => parts.indexOf(p) === i).join(', ')
}

// Weather cache: reuse a reading for 30 minutes within roughly 1 km (coordinates rounded to 2 decimals).

export const WEATHER_CACHE_MINUTES = 30

export type CachedWeather = { lat: number; lon: number; fetchedAt: string; weather: WeatherSummary }

const round2 = (n: number) => Math.round(n * 100) / 100

export function weatherCacheFresh(cached: CachedWeather, lat: number, lon: number, now: Date): boolean {
  const ageMs = now.getTime() - Date.parse(cached.fetchedAt)
  return (
    ageMs >= 0 &&
    ageMs < WEATHER_CACHE_MINUTES * 60 * 1000 &&
    round2(cached.lat) === round2(lat) &&
    round2(cached.lon) === round2(lon)
  )
}
