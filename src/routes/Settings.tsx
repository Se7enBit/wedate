import { MapPin, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { btnPrimary, btnSecondary, field } from '../components/styles.ts'
import { ServiceError } from '../services/http.ts'
import { searchCities, type CityOption } from '../services/weather.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

function CitySection() {
  const city = useStore((s) => s.settings.city)
  const setCity = useStore((s) => s.setCity)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityOption[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const c = strings.settings.city

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(undefined)
    setResults(undefined)
    try {
      setResults(await searchCities(query))
    } catch (err) {
      const code = err instanceof ServiceError ? err.code : undefined
      setError(code === 'offline' || code === 'timeout' ? c.errors[code] : c.errors.other)
    } finally {
      setLoading(false)
    }
  }

  const pick = (option: CityOption) => {
    setCity({ name: option.name, lat: option.lat, lon: option.lon })
    setResults(undefined)
    setQuery('')
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">{c.title}</h2>
      <p className="text-sm text-text-muted">{c.hint}</p>

      {city ? (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <MapPin size={16} aria-hidden className="text-gold" />
            <span>
              <span className="sr-only">{c.current}: </span>
              {city.name}
            </span>
          </span>
          <button type="button" onClick={() => setCity(undefined)} className={btnSecondary}>
            {c.remove}
          </button>
        </div>
      ) : (
        <p className="text-sm text-text-muted">{c.none}</p>
      )}

      <form onSubmit={search} className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">{c.search}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.search}
            className={field}
          />
        </label>
        <button type="submit" disabled={loading || !query.trim()} className={btnPrimary}>
          <Search size={18} aria-hidden />
          <span className="sr-only sm:not-sr-only">{c.searchButton}</span>
        </button>
      </form>

      <div aria-live="polite">
        {loading && <p className="text-sm text-text-muted">{c.searching}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {results?.length === 0 && <p className="text-sm text-text-muted">{c.noResults}</p>}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-muted">{c.results}</p>
            <ul className="flex flex-col gap-2">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-2xl border border-border px-4 text-left text-sm transition-colors duration-200 hover:bg-surface-raised"
                  >
                    <MapPin size={16} aria-hidden className="shrink-0 text-text-muted" />
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Settings() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">{strings.settings.title}</h1>
      <CitySection />
      <p className="text-sm text-text-muted">{strings.settings.moreSoon}</p>
    </section>
  )
}
