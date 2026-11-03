import { Link } from 'react-router'
import type { Idea } from '../domain/idea.ts'
import type { AiErrorCode } from '../domain/prompt.ts'
import { strings } from '../strings.ts'
import SaveableIdea from './SaveableIdea.tsx'
import { btnSecondary } from './styles.ts'

type Props = {
  code: AiErrorCode
  /** Library ideas for the same prefs; not shown for `no_key`. */
  picks: readonly Idea[]
}

/** The friendly side of an AI failure: what happened, where to fix it, and something to pick anyway. */
export default function AiNotice({ code, picks }: Props) {
  const a = strings.ai
  const fixInSettings = code === 'no_key' || code === 'bad_key' || code === 'bad_model'

  return (
    <div className="flex flex-col gap-4">
      <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-4">
        <p>{a.errors[code]}</p>
        {fixInSettings && (
          <Link to="/settings" className={btnSecondary}>
            {a.openSettings}
          </Link>
        )}
      </div>
      {code !== 'no_key' && picks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">{a.picks}</h2>
          <ul className="flex flex-col gap-4">
            {picks.map((idea) => (
              <li key={idea.id}>
                <SaveableIdea idea={idea} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
