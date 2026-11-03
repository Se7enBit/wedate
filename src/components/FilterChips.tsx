type Option<T> = { value: T; label: string }

type Props<T> = {
  label: string
  options: readonly Option<T>[]
  selected: readonly T[]
  onToggle: (value: T) => void
}

/** A labelled row of pill chips. Multi or single select is up to `onToggle`. */
export function ChipGroup<T extends string | number>({ label, options, selected, onToggle }: Props<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
              className={`min-h-11 rounded-full border px-4 text-sm transition-colors duration-150 ${
                on ? 'border-gold bg-surface-raised text-text' : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
