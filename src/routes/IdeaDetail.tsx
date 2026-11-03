import { ArrowLeft, CircleCheck, ExternalLink, Heart, Map as MapIcon, Pencil, Search, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import { MetaRow } from '../components/IdeaCard.tsx'
import { btnDanger, btnPrimary, btnSecondary, field } from '../components/styles.ts'
import { findIdea } from '../content/library.ts'
import { googleSearchUrl, mapsUrl } from '../domain/links.ts'
import { NOTE_MAX } from '../domain/saved.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

export default function IdeaDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = useStore((s) => s.saved)
  const drafts = useStore((s) => s.drafts)
  const actions = useStore.getState()
  const d = strings.detail
  const l = strings.labels

  const idea = findIdea(id, saved, drafts)
  if (!idea) {
    return (
      <EmptyState emoji="🤷" title={d.notFoundTitle} hint={d.notFoundHint} titleAs="h1">
        <Link to="/" className={btnPrimary}>
          {d.goDiscover}
        </Link>
      </EmptyState>
    )
  }

  const entry = saved[idea.id]
  const isOwn = idea.source === 'custom'
  const isDone = entry?.status === 'done'
  const maps = mapsUrl(idea)
  const tags = [
    l.category[idea.category],
    l.energy[idea.energy],
    ...idea.timesOfDay.map((t) => l.timeOfDay[t]),
    l.weather[idea.weather],
    l.prep[idea.prep],
    ...idea.vibes.map((v) => l.vibe[v]),
  ]

  // Opened from a link with no history: go to Discover instead of leaving the app.
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  const toggleSave = () => {
    if (!entry) return actions.save(idea)
    if (entry.note && !window.confirm(d.confirmUnsave)) return
    actions.remove(idea.id)
  }

  const deleteOwn = () => {
    if (!window.confirm(d.confirmDelete)) return
    actions.remove(idea.id)
    navigate('/saved?tab=mine', { replace: true })
  }

  return (
    <article className="flex flex-col gap-6">
      <button
        type="button"
        onClick={goBack}
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1 px-2 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={18} aria-hidden />
        {d.back}
      </button>

      <header className="flex flex-col gap-3">
        <span className="text-6xl leading-none" aria-hidden>
          {idea.emoji}
        </span>
        <h1 className="font-display text-3xl font-semibold">{idea.title}</h1>
        <p className="text-text-muted">{idea.summary}</p>
        <MetaRow idea={idea} />
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag} className="rounded-full border border-border px-3 py-1 text-xs text-text-muted">
              {tag}
            </li>
          ))}
        </ul>
      </header>

      <div className="flex flex-wrap gap-2">
        {!isOwn && (
          <button
            type="button"
            aria-pressed={!!entry}
            onClick={toggleSave}
            className={`${btnSecondary} ${entry ? 'border-rose text-rose' : ''}`}
          >
            <Heart size={18} fill={entry ? 'currentColor' : 'none'} aria-hidden />
            {entry ? d.saved : d.save}
          </button>
        )}
        <button
          type="button"
          aria-pressed={isDone}
          onClick={() => (isDone ? actions.markNotDone(idea.id) : actions.markDone(idea))}
          className={`${btnSecondary} ${isDone ? 'border-success text-success' : ''}`}
        >
          <CircleCheck size={18} aria-hidden />
          {isDone ? d.done : d.markDone}
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">{d.steps}</h2>
        <ol className="flex flex-col gap-3">
          {idea.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-semibold text-gold">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {idea.bring && idea.bring.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold">{d.bring}</h2>
          <ul className="list-disc pl-5 text-text-muted">
            {idea.bring.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold">
          <label htmlFor="note">{d.note}</label>
        </h2>
        {entry ? (
          <textarea
            id="note"
            rows={3}
            maxLength={NOTE_MAX}
            value={entry.note}
            onChange={(e) => actions.setNote(idea.id, e.target.value)}
            placeholder={d.notePlaceholder}
            className={field}
          />
        ) : (
          <p className="text-sm text-text-muted">{d.noteHint}</p>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <a href={googleSearchUrl(idea)} target="_blank" rel="noopener" className={btnPrimary}>
          <Search size={18} aria-hidden />
          {d.google}
          <ExternalLink size={14} aria-hidden />
        </a>
        {maps && (
          <a href={maps} target="_blank" rel="noopener" className={btnSecondary}>
            <MapIcon size={18} aria-hidden />
            {d.maps}
            <ExternalLink size={14} aria-hidden />
          </a>
        )}
      </div>

      {isOwn && (
        <div className="flex gap-2">
          <Link to={`/idea/${encodeURIComponent(idea.id)}/edit`} className={btnSecondary}>
            <Pencil size={18} aria-hidden />
            {d.edit}
          </Link>
          <button type="button" onClick={deleteOwn} className={btnDanger}>
            <Trash2 size={18} aria-hidden />
            {d.delete}
          </button>
        </div>
      )}
    </article>
  )
}
