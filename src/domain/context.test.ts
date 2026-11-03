import { describe, expect, it } from 'vitest'
import { minutesUntilNextBucket, nextTimeOfDay, timeOfDay, weatherFromOpenMeteo, weatherKind } from './context.ts'

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
