import { describe, expect, it } from 'vitest'
import {
  cityLabel,
  fakeRain,
  GeocodingSchema,
  minutesUntilNextBucket,
  nextTimeOfDay,
  OpenMeteoForecastSchema,
  timeOfDay,
  weatherCacheFresh,
  weatherFromOpenMeteo,
  weatherKind,
} from './context.ts'

// Local time, so the tests pass in any timezone.
const at = (h: number, m = 0) => new Date(2026, 10, 3, h, m)

describe('timeOfDay', () => {
  it.each([
    [4, 59, 'late_night'],
    [5, 0, 'morning'],
    [11, 59, 'morning'],
    [12, 0, 'afternoon'],
    [16, 59, 'afternoon'],
    [17, 0, 'evening'],
    [21, 59, 'evening'],
    [22, 0, 'late_night'],
    [0, 30, 'late_night'],
  ] as const)('%i:%i is %s', (h, m, bucket) => {
    expect(timeOfDay(at(h, m))).toBe(bucket)
  })
})

describe('nextTimeOfDay', () => {
  it('goes round the clock', () => {
    expect(nextTimeOfDay('morning')).toBe('afternoon')
    expect(nextTimeOfDay('evening')).toBe('late_night')
    expect(nextTimeOfDay('late_night')).toBe('morning')
  })
})

describe('minutesUntilNextBucket', () => {
  it('counts to the next bucket start, across midnight', () => {
    expect(minutesUntilNextBucket(at(21, 10))).toBe(50)
    expect(minutesUntilNextBucket(at(5, 0))).toBe(7 * 60)
    expect(minutesUntilNextBucket(at(22, 0))).toBe(7 * 60)
    expect(minutesUntilNextBucket(at(23, 30))).toBe(5 * 60 + 30)
    expect(minutesUntilNextBucket(at(4, 30))).toBe(30)
  })
})

describe('weatherKind', () => {
  it.each([
    [0, 'clear'],
    [1, 'cloudy'],
    [3, 'cloudy'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'drizzle'],
    [57, 'drizzle'],
    [61, 'rain'],
    [67, 'rain'],
    [80, 'rain'],
    [82, 'rain'],
    [71, 'snow'],
    [77, 'snow'],
    [86, 'snow'],
    [95, 'storm'],
    [97, 'storm'],
    [99, 'storm'],
  ] as const)('code %i is %s', (code, kind) => {
    expect(weatherKind(code)).toBe(kind)
  })
})

describe('weatherFromOpenMeteo', () => {
  const current = { temperature_2m: 18.4, precipitation: 0, weather_code: 1, is_day: 1 }

  it('maps a dry day', () => {
    expect(weatherFromOpenMeteo(current)).toEqual({
      tempC: 18.4,
      isRaining: false,
      isDay: true,
      code: 1,
      kind: 'cloudy',
      emoji: '⛅',
    })
  })

  it('treats wet codes and any precipitation as raining', () => {
    expect(weatherFromOpenMeteo({ ...current, weather_code: 63 }).isRaining).toBe(true)
    expect(weatherFromOpenMeteo({ ...current, weather_code: 73 }).isRaining).toBe(true)
    expect(weatherFromOpenMeteo({ ...current, weather_code: 3, precipitation: 0.2 }).isRaining).toBe(true)
    expect(weatherFromOpenMeteo({ ...current, weather_code: 45 }).isRaining).toBe(false)
  })

  it('reads is_day', () => {
    expect(weatherFromOpenMeteo({ ...current, is_day: 0 }).isDay).toBe(false)
  })
})

describe('fakeRain', () => {
  it('is rainy and keeps day or night', () => {
    expect(fakeRain()).toMatchObject({ isRaining: true, isDay: true, kind: 'rain' })
    const night = weatherFromOpenMeteo({ temperature_2m: 20, precipitation: 0, weather_code: 0, is_day: 0 })
    expect(fakeRain(night).isDay).toBe(false)
  })
})

describe('API schemas', () => {
  it('accepts a real Open-Meteo forecast response', () => {
    const sample = {
      latitude: 40.665985,
      longitude: 22.88998,
      timezone: 'Europe/Athens',
      current_units: { time: 'iso8601', temperature_2m: '°C' },
      current: { time: '2026-11-04T00:00', interval: 900, temperature_2m: 12.4, precipitation: 0.0, weather_code: 3, is_day: 0 },
    }
    const parsed = OpenMeteoForecastSchema.parse(sample)
    expect(weatherFromOpenMeteo(parsed.current)).toMatchObject({ tempC: 12.4, kind: 'cloudy', isDay: false })
  })

  it('rejects a forecast without current data', () => {
    expect(OpenMeteoForecastSchema.safeParse({ latitude: 1 }).success).toBe(false)
  })

  it('accepts geocoding results and the no-results reply', () => {
    const sample = {
      results: [
        { id: 734077, name: 'Thessaloniki', latitude: 40.64072, longitude: 22.93493, country: 'Greece', admin1: 'Central Macedonia', population: 317778 },
      ],
    }
    expect(GeocodingSchema.parse(sample).results?.[0].name).toBe('Thessaloniki')
    expect(GeocodingSchema.parse({ generationtime_ms: 0.12 }).results).toBeUndefined()
  })
})

describe('cityLabel', () => {
  const base = { id: 1, latitude: 0, longitude: 0 }
  it('joins name, region and country, skipping missing and repeated parts', () => {
    expect(cityLabel({ ...base, name: 'Thessaloniki', admin1: 'Central Macedonia', country: 'Greece' })).toBe(
      'Thessaloniki, Central Macedonia, Greece',
    )
    expect(cityLabel({ ...base, name: 'Singapore', admin1: 'Singapore', country: 'Singapore' })).toBe('Singapore')
    expect(cityLabel({ ...base, name: 'Nowhere' })).toBe('Nowhere')
  })
})

describe('weatherCacheFresh', () => {
  const weather = fakeRain()
  const now = new Date('2026-11-04T12:00:00.000Z')
  const cached = { lat: 40.6401, lon: 22.9444, fetchedAt: '2026-11-04T11:40:00.000Z', weather }

  it('is fresh for 30 minutes at the same rounded place', () => {
    expect(weatherCacheFresh(cached, 40.6449, 22.9399, now)).toBe(true)
    expect(weatherCacheFresh({ ...cached, fetchedAt: '2026-11-04T11:30:00.000Z' }, 40.64, 22.94, now)).toBe(false)
    expect(weatherCacheFresh({ ...cached, fetchedAt: '2026-11-04T12:05:00.000Z' }, 40.64, 22.94, now)).toBe(false)
  })

  it('is stale somewhere else', () => {
    expect(weatherCacheFresh(cached, 40.66, 22.94, now)).toBe(false)
    expect(weatherCacheFresh(cached, 40.64, 23.0, now)).toBe(false)
  })
})
