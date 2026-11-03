export type LocationProblem = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export type Place =
  | { ok: true; lat: number; lon: number; name?: string; source: 'device' | 'city' }
  | { ok: false; problem: LocationProblem }

type City = { name: string; lat: number; lon: number }

/** The device position. Rejects with a LocationProblem. Needs https or localhost. */
export function getDevicePosition(timeoutMs = 8000): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      reject('unsupported' satisfies LocationProblem)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        const problem: LocationProblem =
          err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable'
        reject(problem)
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 30 * 60 * 1000 },
    )
  })
}

/** Device location first, then the city from Settings. Never throws. */
export async function resolvePlace(city?: City): Promise<Place> {
  try {
    const pos = await getDevicePosition()
    return { ok: true, ...pos, source: 'device' }
  } catch (problem) {
    if (city) return { ok: true, lat: city.lat, lon: city.lon, name: city.name, source: 'city' }
    return { ok: false, problem: problem as LocationProblem }
  }
}
