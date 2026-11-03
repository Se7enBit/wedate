import { Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import AiNotice from '../components/AiNotice.tsx'
import { ChipGroup } from '../components/FilterChips.tsx'
import SaveableIdea from '../components/SaveableIdea.tsx'
import { btnPrimary, field } from '../components/styles.ts'
import { LIBRARY } from '../content/library.ts'
import { timeOfDay } from '../domain/context.ts'
import { libraryPicks, toggle } from '../domain/filters.ts'
import { BUDGETS, DURATIONS, ENERGIES, VIBES } from '../domain/idea.ts'
import { NOTES_MAX, recentTitles, type IdeaPrefs } from '../domain/prompt.ts'
import { aiErrorCode, generateIdeas } from '../services/gemini.ts'
import { useSurroundings } from '../services/useSurroundings.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

export default function Create() {
  const { prefs, loading, ideas, error } = useStore((s) => s.create)
  const city = useStore((s) => s.settings.city)
  const surroundings = useSurroundings(city)
  const c = strings.create
  const n = strings.now

  const setPrefs = (patch: Partial<IdeaPrefs>) => useStore.getState().setCreate({ prefs: { ...prefs, ...patch } })

  const generate = async (e: FormEvent) => {
    e.preventDefault()
    const { settings, saved, drafts, setCreate, addDrafts } = useStore.getState()
    const now = new Date()
    const seen = [...Object.values(drafts).reverse(), ...Object.values(saved).map((entry) => entry.idea)]
    setCreate({ loading: true, ideas: [], error: undefined })
    try {
      const generated = await generateIdeas(
        settings,
        prefs,
        {
          now,
          timeOfDay: timeOfDay(now),
          // Whatever is known by now: the weather never holds up the request.
          weather: surroundings.status === 'ready' ? surroundings.weather : undefined,
          cityName: city?.name,
        },
        recentTitles(seen),
      )
      addDrafts(generated)
      setCreate({ loading: false, ideas: generated })
    } catch (err) {
      setCreate({ loading: false, error: aiErrorCode(err) })
    }
  }

  const notes = prefs.notes ?? ''

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold">{c.title}</h1>
        <p className="text-sm text-text-muted">{c.hint}</p>
      </header>

      <form onSubmit={generate} className="flex flex-col gap-5">
        <ChipGroup
          label={c.vibes}
          options={VIBES.map((v) => ({ value: v, label: strings.labels.vibe[v] }))}
          selected={prefs.vibes}
          onToggle={(v) => setPrefs({ vibes: toggle(prefs.vibes, v) })}
        />
        <ChipGroup
          label={c.budget}
          options={BUDGETS.map((b) => ({ value: b, label: n.maxBudgetLabels[b] }))}
          selected={[prefs.budget]}
          onToggle={(v) => setPrefs({ budget: v })}
        />
        <ChipGroup
          label={c.duration}
          options={DURATIONS.map((d) => ({ value: d, label: n.maxDurationLabels[d] }))}
          selected={[prefs.duration]}
          onToggle={(v) => setPrefs({ duration: v })}
        />
        <ChipGroup
          label={c.setting}
          options={[
            { value: 'any', label: c.any },
            { value: 'home', label: strings.labels.setting.home },
            { value: 'out', label: strings.labels.setting.out },
          ]}
          selected={[prefs.setting ?? 'any']}
          onToggle={(v) => setPrefs({ setting: v === 'any' ? undefined : v })}
        />
        <ChipGroup
          label={c.energy}
          options={[
            { value: 'any', label: c.any },
            ...ENERGIES.map((e) => ({ value: e, label: strings.labels.energy[e] })),
          ]}
          selected={[prefs.energy ?? 'any']}
          onToggle={(v) => setPrefs({ energy: v === 'any' ? undefined : v })}
        />

        <label className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-text-muted">
            {c.notes}
            <span className="text-xs font-normal">
              {notes.length}/{NOTES_MAX}
            </span>
          </span>
          <textarea
            rows={3}
            maxLength={NOTES_MAX}
            value={notes}
            onChange={(e) => setPrefs({ notes: e.target.value })}
            placeholder={c.notesPlaceholder}
            className={field}
          />
          <span className="text-xs text-text-muted">{c.notesHint}</span>
        </label>

        <button type="submit" disabled={loading} className={btnPrimary}>
          <Sparkles size={18} aria-hidden />
          {loading ? c.generating : c.generate}
        </button>
      </form>

      {error && <AiNotice code={error} picks={libraryPicks(LIBRARY, prefs)} />}

      <div className="flex flex-col gap-3">
        {ideas.length > 0 && (
          <>
            <h2 className="font-display text-xl font-semibold">{c.results}</h2>
            <ul className="flex flex-col gap-4">
              {ideas.map((idea) => (
                <li key={idea.id}>
                  <SaveableIdea idea={idea} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
