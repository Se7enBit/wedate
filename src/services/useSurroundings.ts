import { useEffect, useState } from 'react'
import type { WeatherSummary } from '../domain/context.ts'
import type { Settings } from '../store/useStore.ts'
import { ServiceError } from './http.ts'
import { resolvePlace } from './location.ts'
import { getWeather } from './weather.ts'

export type PlaceInfo = { name?: string; source: 'device' | 'city' }
export type Surroundings =
  | { status: 'loading' }
  | { status: 'ready'; weather: WeatherSummary; place: PlaceInfo }
  | { status: 'none'; reason: 'location' | 'offline' | 'unavailable'; place?: PlaceInfo }

/** Location then weather, refreshed when the Settings city changes. Never blocks the screen. */
export function useSurroundings(city: Settings['city']): Surroundings {
  const [state, setState] = useState<Surroundings>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    resolvePlace(city).then(async (place) => {
      if (cancelled) return
      if (!place.ok) return setState({ status: 'none', reason: 'location' })
      const info: PlaceInfo = { name: place.name, source: place.source }
      try {
        const weather = await getWeather(place.lat, place.lon)
        if (!cancelled) setState({ status: 'ready', weather, place: info })
      } catch (err) {
        const reason = err instanceof ServiceError && err.code === 'offline' ? 'offline' : 'unavailable'
        if (!cancelled) setState({ status: 'none', reason, place: info })
      }
    })
    return () => {
      cancelled = true
    }
  }, [city])
  return state
}
