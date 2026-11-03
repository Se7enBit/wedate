import { Link } from 'react-router'
import EmptyState from '../components/EmptyState.tsx'
import { btnPrimary, btnSecondary } from '../components/styles.ts'
import { strings } from '../strings.ts'

/** Shown instead of a blank screen when a screen crashes. */
export function RouteError() {
  const p = strings.problem
  return (
    <div className="mx-auto max-w-lg p-4">
      <EmptyState emoji="🌧️" title={p.errorTitle} hint={p.errorHint} titleAs="h1">
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className={btnPrimary}>
            {p.reload}
          </button>
          <Link to="/" className={btnSecondary}>
            {p.goDiscover}
          </Link>
        </div>
      </EmptyState>
    </div>
  )
}

export function NotFound() {
  const p = strings.problem
  return (
    <EmptyState emoji="🧭" title={p.notFoundTitle} hint={p.notFoundHint} titleAs="h1">
      <Link to="/" className={btnPrimary}>
        {p.goDiscover}
      </Link>
    </EmptyState>
  )
}
