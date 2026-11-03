import {
  cityLabel,
  GeocodingSchema,
  OpenMeteoForecastSchema,
  weatherCacheFresh,
  weatherFromOpenMeteo,
  type CachedWeather,
  type WeatherSummary,
} from '../domain/context.ts'
import { getJson } from './http.ts'

const TIMEOUT_MS = 10_000
const CACHE_KEY = 'wedate-weather'

function readCache(): CachedWeather | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CachedWeather) : undefined
  } catch {
    return undefined
  }
}

function writeCache(entry: CachedWeather) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Storage full or blocked: the cache is only a nicety.
  }
}

/** Current weather from Open-Meteo, cached for 30 minutes. Throws ServiceError. */
export async function getWeather(lat: number, lon: number): Promise<WeatherSummary> {
  const cached = readCache()
  if (cached && weatherCacheFresh(cached, lat, lon, new Date())) return cached.weather

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    '&current=temperature_2m,precipitation,weather_code,is_day&timezone=auto'
  const data = await getJson(url, OpenMeteoForecastSchema, TIMEOUT_MS)
  const weather = weatherFromOpenMeteo(data.current)
  writeCache({ lat, lon, fetchedAt: new Date().toISOString(), weather })
  return weather
}

export type CityOption = { id: number; name: string; label: string; lat: number; lon: number }

/** Up to 5 places matching `name` (Open-Meteo geocoding). Throws ServiceError. */
export async function searchCities(name: string): Promise<CityOption[]> {
  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(name.trim())}&count=5&language=en&format=json`
  const data = await getJson(url, GeocodingSchema, TIMEOUT_MS)
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    label: cityLabel(r),
    lat: r.latitude,
    lon: r.longitude,
  }))
}
