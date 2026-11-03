import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import { ChipGroup } from '../components/FilterChips.tsx'
import { btnPrimary, btnSecondary, field } from '../components/styles.ts'
import {
  BUDGETS,
  CATEGORIES,
  DURATIONS,
  ENERGIES,
  PREPS,
  SETTINGS,
  SPACES,
  TIMES_OF_DAY,
  VIBES,
  WEATHER_FITS,
} from '../domain/idea.ts'
import {
  EMPTY_IDEA_FORM,
  formToIdea,
  ideaToForm,
  type IdeaFormErrors,
  type IdeaFormField,
  type IdeaFormValues,
} from '../domain/ideaForm.ts'
import { toggle } from '../domain/filters.ts'
import { newId, useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'

const f = strings.form
const l = strings.labels

const options = <T extends string | number>(values: readonly T[], label: (v: T) => string) =>
  values.map((value) => ({ value, label: label(value) }))

const errorText = (field: IdeaFormField): string =>
  (f.errors as Partial<Record<IdeaFormField, string>>)[field] ?? f.errors.other

type TextFieldProps = {
  name: IdeaFormField
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  rows?: number
  maxLength?: number
}

function TextField({ name, value, onChange, error, hint, rows, maxLength }: TextFieldProps) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ') || undefined
  const props = {
    id: name,
    value,
    maxLength,
    'aria-invalid': !!error,
    'aria-describedby': describedBy,
    className: `${field} ${error ? 'border-danger' : ''}`,
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium text-text-muted">
        {f.fields[name]}
      </label>
      {rows ? (
        <textarea {...props} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...props} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export default function IdeaForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const editing = useStore((s) => (id ? s.saved[id] : undefined))
  const canEdit = !id || editing?.idea.source === 'custom'
  const [values, setValues] = useState<IdeaFormValues>(() =>
    editing && canEdit ? ideaToForm(editing.idea) : EMPTY_IDEA_FORM,
  )
  const [errors, setErrors] = useState<IdeaFormErrors>({})

  if (!canEdit) {
    return (
      <EmptyState emoji="🤷" title={strings.detail.notFoundTitle} hint={f.notFound}>
        <Link to="/saved" className={btnPrimary}>
          {strings.saved.title}
        </Link>
      </EmptyState>
    )
  }

  const set = <K extends IdeaFormField>(key: K, value: IdeaFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const error = (key: IdeaFormField) => (errors[key] ? errorText(key) : undefined)
  const cancel = () => (location.key === 'default' ? navigate('/saved?tab=mine') : navigate(-1))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const ideaId = editing?.idea.id ?? newId()
    const result = formToIdea(values, ideaId)
    if (!result.ok) {
      setErrors(result.errors)
      window.scrollTo(0, 0)
      return
    }
    const { addCustom, updateCustom } = useStore.getState()
    if (editing) updateCustom(result.idea)
    else addCustom(result.idea)
    navigate(`/idea/${encodeURIComponent(ideaId)}`, { replace: true })
  }

  const hasErrors = Object.values(errors).some(Boolean)
  const chipError = (key: IdeaFormField) =>
    error(key) && <p className="-mt-3 text-sm text-danger">{error(key)}</p>

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold">{editing ? f.editTitle : f.newTitle}</h1>
      {hasErrors && (
        <p role="alert" className="rounded-2xl border border-danger/60 px-4 py-3 text-sm text-danger">
          {f.errorSummary}
        </p>
      )}

      <TextField name="title" value={values.title} onChange={(v) => set('title', v)} error={error('title')} maxLength={60} />
      <TextField
        name="emoji"
        value={values.emoji}
        onChange={(v) => set('emoji', v)}
        error={error('emoji')}
        hint={f.hints.emoji}
      />
      <TextField
        name="summary"
        value={values.summary}
        onChange={(v) => set('summary', v)}
        error={error('summary')}
        rows={3}
        maxLength={220}
      />
      <TextField
        name="steps"
        value={values.steps}
        onChange={(v) => set('steps', v)}
        error={error('steps')}
        hint={f.hints.steps}
        rows={5}
      />
      <TextField
        name="bring"
        value={values.bring}
        onChange={(v) => set('bring', v)}
        error={error('bring')}
        hint={f.hints.bring}
        rows={3}
      />

      <ChipGroup
        label={f.fields.category}
        options={options(CATEGORIES, (v) => l.category[v])}
        selected={[values.category]}
        onToggle={(v) => set('category', v)}
      />
      <ChipGroup
        label={f.fields.budget}
        options={options(BUDGETS, (v) => l.budget[v])}
        selected={[values.budget]}
        onToggle={(v) => set('budget', v)}
      />
      <ChipGroup
        label={f.fields.duration}
        options={options(DURATIONS, (v) => l.duration[v])}
        selected={[values.duration]}
        onToggle={(v) => set('duration', v)}
      />
      <ChipGroup
        label={f.fields.setting}
        options={options(SETTINGS, (v) => l.setting[v])}
        selected={[values.setting]}
        onToggle={(v) => set('setting', v)}
      />
      <ChipGroup
        label={f.fields.space}
        options={options(SPACES, (v) => l.space[v])}
        selected={[values.space]}
        onToggle={(v) => set('space', v)}
      />
      <ChipGroup
        label={f.fields.energy}
        options={options(ENERGIES, (v) => l.energy[v])}
        selected={[values.energy]}
        onToggle={(v) => set('energy', v)}
      />
      <ChipGroup
        label={f.fields.timesOfDay}
        options={options(TIMES_OF_DAY, (v) => l.timeOfDay[v])}
        selected={values.timesOfDay}
        onToggle={(v) => set('timesOfDay', toggle(values.timesOfDay, v))}
      />
      {chipError('timesOfDay')}
      <ChipGroup
        label={f.fields.weather}
        options={options(WEATHER_FITS, (v) => l.weather[v])}
        selected={[values.weather]}
        onToggle={(v) => set('weather', v)}
      />
      <ChipGroup
        label={f.fields.prep}
        options={options(PREPS, (v) => l.prep[v])}
        selected={[values.prep]}
        onToggle={(v) => set('prep', v)}
      />
      <ChipGroup
        label={f.fields.vibes}
        options={options(VIBES, (v) => l.vibe[v])}
        selected={values.vibes}
        onToggle={(v) => set('vibes', toggle(values.vibes, v))}
      />

      <TextField
        name="searchQuery"
        value={values.searchQuery}
        onChange={(v) => set('searchQuery', v)}
        error={error('searchQuery')}
        hint={f.hints.searchQuery}
        maxLength={120}
      />

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {f.save}
        </button>
        <button type="button" onClick={cancel} className={btnSecondary}>
          {f.cancel}
        </button>
      </div>
    </form>
  )
}
