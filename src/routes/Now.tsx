import { CloudOff, MapPin, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AiNotice from '../components/AiNotice.tsx'
import EmptyState from '../components/EmptyState.tsx'
import { ChipGroup } from '../components/FilterChips.tsx'
import { btnPrimary, btnSecondary } from '../components/styles.ts'
import SwipeDeck from '../components/SwipeDeck.tsx'
import { findIdea, LIBRARY } from '../content/library.ts'
import { fakeRain, timeOfDay } from '../domain/context.ts'
import { toggle } from '../domain/filters.ts'
import { BUDGETS, DURATIONS, VIBES, type Idea } from '../domain/idea.ts'
import { recentTitles } from '../domain/prompt.ts'
import { DECK_SIZE, rankForNow, type NowContext } from '../domain/scoring.ts'
import { aiErrorCode, GeminiError, generateIdeas } from '../services/gemini.ts'
import { useSurroundings } from '../services/useSurroundings.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

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
  const passed = new Set(now.passed)
  const unswiped = (idea: Idea) => !passed.has(idea.id)

  // AI ideas sit on top, and still have to fit the current limits, time and weather.
  const fresh = rankForNow(now.fresh, ctx, [], now.seed)
  const freshIds = new Set(now.fresh.map((i) => i.id))
  const ranked = rankForNow(pool, ctx, reactions, now.seed).filter((i) => !freshIds.has(i.id))
  const rankedPassed = now.passed.filter((id) => !freshIds.has(id)).length
  const deck = [
    ...fresh.filter(unswiped),
    ...ranked.filter(unswiped).slice(0, Math.max(0, DECK_SIZE - rankedPassed)),
  ]

  const { setNowPrefs, pass, redeal } = useStore.getState()
  const onSave = (idea: Idea) => {
    useStore.getState().save(idea)
    pass(idea.id)
  }
  const onSkip = (idea: Idea) => {
    useStore.getState().skip(idea.id)
    pass(idea.id)
  }

  const dealNew = async () => {
    const { settings, drafts, setDeal, addDrafts, dealFresh } = useStore.getState()
    const known = (ids: string[]) => ids.flatMap((id) => findIdea(id, saved, drafts) ?? [])
    const seen = [
      ...deck,
      ...known([...now.passed].reverse()),
      ...Object.values(drafts).reverse(),
      ...known(reactions.map((r) => r.ideaId).reverse()),
    ]
    setDeal({ dealing: true, dealError: undefined })
    try {
      const ideas = await generateIdeas(
        settings,
        { vibes: now.moods, budget: now.maxBudget, duration: now.maxDuration, setting: now.setting },
        { now: date, timeOfDay: bucket, weather, cityName: city?.name, rightNow: true },
        recentTitles(seen),
      )
      if (rankForNow(ideas, ctx, [], now.seed).length === 0) throw new GeminiError('bad_output')
      addDrafts(ideas)
      dealFresh(ideas)
      setDeal({ dealing: false })
    } catch (err) {
      setDeal({ dealing: false, dealError: aiErrorCode(err) })
    }
  }

  const dealNewButton = (
    <button type="button" onClick={dealNew} disabled={now.dealing} className={btnSecondary}>
      <Sparkles size={18} aria-hidden />
      {now.dealing ? n.dealing : n.dealNew}
    </button>
  )

  // Library ideas that fit, in a new order so they are not just the top of the deck again.
  const libraryRanked = now.dealError ? rankForNow(LIBRARY, ctx, reactions, now.seed + 1) : []
  const libraryUnswiped = libraryRanked.filter(unswiped)
  const picks = (libraryUnswiped.length > 0 ? libraryUnswiped : libraryRanked).slice(0, 5)

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
            <Link to="/settings" className={`${chip} min-h-11 text-gold`}>
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
            className="inline-flex min-h-11 w-fit items-center text-xs text-text-muted underline underline-offset-2"
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

      {deck.length > 0 ? (
        <>
          <SwipeDeck
            ideas={deck}
            saved={saved}
            onSave={onSave}
            onSkip={onSkip}
            onOpen={(idea) => navigate(`/idea/${encodeURIComponent(idea.id)}`)}
          />
          {dealNewButton}
        </>
      ) : ranked.length === 0 && fresh.length === 0 ? (
        <EmptyState emoji="🫥" title={n.emptyTitle} hint={n.emptyHint}>
          {dealNewButton}
        </EmptyState>
      ) : (
        <EmptyState emoji="🃏" title={n.doneTitle} hint={n.doneHint}>
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={redeal} className={btnPrimary}>
              {n.dealAgain}
            </button>
            {dealNewButton}
          </div>
        </EmptyState>
      )}

      {now.dealError && <AiNotice code={now.dealError} picks={picks} />}
    </section>
  )
}
