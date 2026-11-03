import { ExternalLink, KeyRound, MapPin, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { btnPrimary, btnSecondary, field } from '../components/styles.ts'
import { DEFAULT_GEMINI_MODEL } from '../config.ts'
import type { AiErrorCode } from '../domain/prompt.ts'
import { aiErrorCode, resolveModel, testKey } from '../services/gemini.ts'
import { ServiceError } from '../services/http.ts'
import { searchCities, type CityOption } from '../services/weather.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

function GeminiSection() {
  const settings = useStore((s) => s.settings)
  const { geminiKey, geminiModel } = settings
  const { setGeminiKey, setGeminiModel } = useStore.getState()
  const [draft, setDraft] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<'ok' | AiErrorCode>()
  const g = strings.settings.gemini

  const saveKey = (e: FormEvent) => {
    e.preventDefault()
    const key = draft.trim()
    if (!key) return
    setGeminiKey(key)
    setDraft('')
    setResult(undefined)
  }

  const removeKey = () => {
    setGeminiKey(undefined)
    setResult(undefined)
  }

  const runTest = async () => {
    setTesting(true)
    setResult(undefined)
    try {
      await testKey(settings)
      setResult('ok')
    } catch (err) {
      setResult(aiErrorCode(err))
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">{g.title}</h2>
      <p className="text-sm text-text-muted">{g.hint}</p>
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-gold underline underline-offset-2"
      >
        {g.getKey}
        <ExternalLink size={14} aria-hidden />
      </a>

      {geminiKey ? (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <KeyRound size={16} aria-hidden className="text-gold" />
            <span>
              <span className="sr-only">{g.currentKey}: </span>
              •••• {geminiKey.slice(-4)}
            </span>
          </span>
          <button type="button" onClick={removeKey} className={btnSecondary}>
            {g.removeKey}
          </button>
        </div>
      ) : (
        <p className="text-sm text-text-muted">{g.noKey}</p>
      )}

      <form onSubmit={saveKey} className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">{g.key}</span>
          <input
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={geminiKey ? g.replacePlaceholder : g.keyPlaceholder}
            className={field}
          />
        </label>
        <button type="submit" disabled={!draft.trim()} className={btnPrimary}>
          {g.saveKey}
        </button>
      </form>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-muted">{g.model}</span>
        <input
          type="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={geminiModel}
          onChange={(e) => {
            setGeminiModel(e.target.value)
            setResult(undefined)
          }}
          placeholder={DEFAULT_GEMINI_MODEL}
          className={field}
        />
        <span className="text-xs text-text-muted">{g.modelHint(DEFAULT_GEMINI_MODEL)}</span>
      </label>

      <button type="button" onClick={runTest} disabled={testing || !geminiKey} className={`${btnSecondary} w-fit`}>
        {testing ? g.testing : g.test}
      </button>
      <div aria-live="polite">
        {result === 'ok' && <p className="text-sm text-success">{g.testResult.ok(resolveModel(geminiModel))}</p>}
        {result && result !== 'ok' && <p className="text-sm text-danger">{g.testResult[result]}</p>}
      </div>
    </section>
  )
}

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
      <GeminiSection />
      <CitySection />
      <p className="text-sm text-text-muted">{strings.settings.moreSoon}</p>
    </section>
  )
}
