import { Download, ExternalLink, KeyRound, MapPin, Search, Trash2, Upload } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { btnDanger, btnPrimary, btnSecondary, field } from '../components/styles.ts'
import { APP_VERSION, DEFAULT_GEMINI_MODEL } from '../config.ts'
import { backupFileName, fromBackup, parseBackup, toBackup, type Backup, type RestoreMode } from '../domain/backup.ts'
import type { AiErrorCode } from '../domain/prompt.ts'
import { saveBackupFile } from '../services/backupFile.ts'
import { aiErrorCode, resolveModel, testKey } from '../services/gemini.ts'
import { ServiceError } from '../services/http.ts'
import { clearWeatherCache, searchCities, type CityOption } from '../services/weather.ts'
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

const MAX_BACKUP_BYTES = 5 * 1024 * 1024

function BackupSection() {
  const [pending, setPending] = useState<Backup>()
  const [message, setMessage] = useState<{ ok: boolean; text: string }>()
  const b = strings.settings.backup

  const exportBackup = async () => {
    const { saved, reactions, settings } = useStore.getState()
    const now = new Date()
    const backup = toBackup({ saved, reactions, city: settings.city }, now)
    const done = await saveBackupFile(backupFileName(now), JSON.stringify(backup, null, 2))
    setMessage(done ? { ok: true, text: b.exported } : undefined)
  }

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // So picking the same file again still fires.
    if (!file) return
    setPending(undefined)
    setMessage(undefined)
    if (file.size > MAX_BACKUP_BYTES) return setMessage({ ok: false, text: b.errors.too_big })
    const parsed = parseBackup(await file.text().catch(() => ''))
    if (parsed.ok) setPending(parsed.backup)
    else setMessage({ ok: false, text: b.errors[parsed.reason] })
  }

  const restore = (mode: RestoreMode) => {
    if (!pending) return
    if (mode === 'replace' && !window.confirm(b.confirmReplace)) return
    const { saved, reactions, settings, restore: apply } = useStore.getState()
    const data = fromBackup(pending, { saved, reactions, city: settings.city }, mode, new Date())
    apply(data)
    setPending(undefined)
    setMessage({ ok: true, text: b.restored(Object.keys(data.saved).length) })
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">{b.title}</h2>
      <p className="text-sm text-text-muted">{b.hint}</p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportBackup} className={btnSecondary}>
          <Download size={18} aria-hidden />
          {b.export}
        </button>
        <label className={`${btnSecondary} cursor-pointer focus-within:border-gold`}>
          <Upload size={18} aria-hidden />
          {b.import}
          <input type="file" accept=".json,application/json" onChange={pickFile} className="sr-only" />
        </label>
      </div>

      {pending && (
        <div className="flex flex-col gap-3 rounded-2xl border border-gold bg-surface-raised p-4">
          <p className="text-sm font-medium">
            {b.summary(
              new Date(pending.exportedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
              Object.keys(pending.saved).length,
            )}
          </p>
          <p className="text-sm text-text-muted">{b.mergeHint}</p>
          <p className="text-sm text-text-muted">{b.replaceHint}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => restore('merge')} className={btnPrimary}>
              {b.merge}
            </button>
            <button type="button" onClick={() => restore('replace')} className={btnDanger}>
              {b.replace}
            </button>
            <button type="button" onClick={() => setPending(undefined)} className={btnSecondary}>
              {b.cancel}
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {message && <p className={`text-sm ${message.ok ? 'text-success' : 'text-danger'}`}>{message.text}</p>}
      </div>
    </section>
  )
}

function ResetSection() {
  const [done, setDone] = useState(false)
  const r = strings.settings.reset

  const reset = () => {
    if (!window.confirm(r.confirm)) return
    useStore.getState().resetAll()
    clearWeatherCache()
    setDone(true)
  }

  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">{r.title}</h2>
      <p className="text-sm text-text-muted">{r.hint}</p>
      <button type="button" onClick={reset} className={btnDanger}>
        <Trash2 size={18} aria-hidden />
        {r.button}
      </button>
      <div aria-live="polite">{done && <p className="text-sm text-success">{r.done}</p>}</div>
    </section>
  )
}

function AboutSection() {
  const a = strings.settings.about
  return (
    <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <h2 className="font-display text-xl font-semibold">{a.title}</h2>
      <p className="text-sm text-text-muted">{a.privacy}</p>
      <p className="text-sm text-text-muted">
        {strings.appName} · {a.version} {APP_VERSION}
      </p>
    </section>
  )
}

export default function Settings() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">{strings.settings.title}</h1>
      <GeminiSection />
      <CitySection />
      <BackupSection />
      <ResetSection />
      <AboutSection />
    </section>
  )
}
