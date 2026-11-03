import { CloudOff, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import { ChipGroup } from '../components/FilterChips.tsx'
import { btnPrimary } from '../components/styles.ts'
import SwipeDeck from '../components/SwipeDeck.tsx'
import { LIBRARY } from '../content/library.ts'
import { fakeRain, timeOfDay, type WeatherSummary } from '../domain/context.ts'
import { toggle } from '../domain/filters.ts'
import { BUDGETS, DURATIONS, VIBES } from '../domain/idea.ts'
import { DECK_SIZE, rankForNow, type NowContext } from '../domain/scoring.ts'
import { ServiceError } from '../services/http.ts'
import { resolvePlace } from '../services/location.ts'
import { getWeather } from '../services/weather.ts'
import { useStore, type Settings } from '../store/useStore.ts'
import { strings } from '../strings.ts'

type PlaceInfo = { name?: string; source: 'device' | 'city' }
type Surroundings =
  | { status: 'loading' }
  | { status: 'ready'; weather: WeatherSummary; place: PlaceInfo }
  | { status: 'none'; reason: keyof typeof strings.now.noWeatherReason; place?: PlaceInfo }

/** Location then weather, refreshed when the Settings city changes. Never blocks the deck. */
function useSurroundings(city: Settings['city']): Surroundings {
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

/** The current time, ticking every minute. */
function useClock(): Date {
  const [date, setDate] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return date
}

const chip = 'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm'

export default function Now() {
  const navigate = useNavigate()
  const saved = useStore((s) => s.saved)
  const reactions = useStore((s) => s.reactions)
  const city = useStore((s) => s.settings.city)
  const now = useStore((s) => s.now)
  const surroundings = useSurroundings(city)
  const date = useClock()
  const [fake, setFake] = useState(false)
  const n = strings.now

  const bucket = timeOfDay(date)
  const realWeather = surroundings.status === 'ready' ? surroundings.weather : undefined
  const weather = import.meta.env.DEV && fake ? fakeRain(realWeather) : realWeather
  const place = surroundings.status === 'loading' ? undefined : surroundings.place

  const pool = useMemo(
    () => [...LIBRARY, ...Object.values(saved).filter((e) => e.idea.source !== 'library').map((e) => e.idea)],
    [saved],
  )
  const ctx: NowContext = {
    now: date,
    timeOfDay: bucket,
    weather,
    moods: now.moods,
    setting: now.setting,
    maxBudget: now.maxBudget,
    maxDuration: now.maxDuration,
  }
  const ranked = rankForNow(pool, ctx, reactions, now.seed)
  const passed = new Set(now.passed)
  const deck = ranked.filter((i) => !passed.has(i.id)).slice(0, Math.max(0, DECK_SIZE - now.passed.length))

  const { setNowPrefs, pass, redeal } = useStore.getState()
  const onSave = (idea: (typeof deck)[number]) => {
    useStore.getState().save(idea)
    pass(idea.id)
  }
  const onSkip = (idea: (typeof deck)[number]) => {
    useStore.getState().skip(idea.id)
    pass(idea.id)
  }

  const clock = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const limitsSummary = [
    now.setting ? strings.labels.setting[now.setting] : n.any,
    n.maxBudgetLabels[now.maxBudget],
    n.maxDurationLabels[now.maxDuration],
  ].join(' · ')

  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold">{n.title}</h1>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={chip}>
            <span aria-hidden>{n.timeEmoji[bucket]}</span>
            {strings.labels.timeOfDay[bucket]} · {clock}
          </span>

          {surroundings.status === 'loading' && <span className={`${chip} text-text-muted`}>{n.weatherLoading}</span>}
          {weather && (
            <span className={chip}>
              <span aria-hidden>{weather.emoji}</span>
              {Math.round(weather.tempC)}°C · {n.weatherKind[weather.kind]}
              {import.meta.env.DEV && fake && <span className="text-gold">{n.fake}</span>}
            </span>
          )}
          {surroundings.status === 'none' && !weather && (
            <span className={`${chip} text-text-muted`}>
              <CloudOff size={14} aria-hidden />
              {n.noWeather} · {n.noWeatherReason[surroundings.reason]}
            </span>
          )}

          {place && (
            <span className={chip}>
              <MapPin size={14} aria-hidden />
              {place.name ?? n.yourLocation}
            </span>
          )}
          {surroundings.status === 'none' && !place && (
            <Link to="/settings" className={`${chip} text-gold`}>
              <MapPin size={14} aria-hidden />
              {n.setCity}
            </Link>
          )}

          {import.meta.env.DEV && (
            <button
              type="button"
              aria-pressed={fake}
              onClick={() => setFake((v) => !v)}
              className={`${chip} border-dashed ${fake ? 'border-gold text-gold' : 'text-text-muted'}`}
            >
              {n.devFakeRain}
            </button>
          )}
        </div>
        {realWeather && (
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener"
            className="w-fit text-xs text-text-muted underline underline-offset-2"
          >
            {n.attribution}
          </a>
        )}
      </div>

      <ChipGroup
        label={n.moods}
        options={VIBES.map((v) => ({ value: v, label: strings.labels.vibe[v] }))}
        selected={now.moods}
        onToggle={(v) => setNowPrefs({ moods: toggle(now.moods, v) })}
      />

      <details className="rounded-card border border-border bg-surface px-4 py-3">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-sm">
          <span className="font-medium">{n.limits}</span>
          <span className="text-text-muted">{limitsSummary}</span>
        </summary>
        <div className="flex flex-col gap-5 pt-3 pb-1">
          <ChipGroup
            label={n.setting}
            options={[
              { value: 'any', label: n.any },
              { value: 'home', label: strings.labels.setting.home },
              { value: 'out', label: strings.labels.setting.out },
            ]}
            selected={[now.setting ?? 'any']}
            onToggle={(v) => setNowPrefs({ setting: v === 'any' ? undefined : v })}
          />
          <ChipGroup
            label={n.maxBudget}
            options={BUDGETS.map((b) => ({ value: b, label: n.maxBudgetLabels[b] }))}
            selected={[now.maxBudget]}
            onToggle={(v) => setNowPrefs({ maxBudget: v })}
          />
          <ChipGroup
            label={n.maxDuration}
            options={DURATIONS.map((d) => ({ value: d, label: n.maxDurationLabels[d] }))}
            selected={[now.maxDuration]}
            onToggle={(v) => setNowPrefs({ maxDuration: v })}
          />
        </div>
      </details>

      {ranked.length === 0 ? (
        <EmptyState emoji="🫥" title={n.emptyTitle} hint={n.emptyHint} />
      ) : deck.length === 0 ? (
        <EmptyState emoji="🃏" title={n.doneTitle} hint={n.doneHint}>
          <button type="button" onClick={redeal} className={btnPrimary}>
            {n.dealAgain}
          </button>
        </EmptyState>
      ) : (
        <SwipeDeck
          ideas={deck}
          saved={saved}
          onSave={onSave}
          onSkip={onSkip}
          onOpen={(idea) => navigate(`/idea/${encodeURIComponent(idea.id)}`)}
        />
      )}
    </section>
  )
}
