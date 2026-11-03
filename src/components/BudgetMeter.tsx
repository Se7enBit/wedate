import type { Budget } from '../domain/idea.ts'
import { strings } from '../strings.ts'

export default function BudgetMeter({ budget }: { budget: Budget }) {
  const label = strings.labels.budgetAria[budget]
  if (budget === 0) {
    return (
      <span role="img" aria-label={label} className="font-medium text-success">
        {strings.labels.budget[0]}
      </span>
    )
  }
  return (
    <span role="img" aria-label={label} className="font-semibold tracking-wider">
      {[1, 2, 3].map((n) => (
        <span key={n} aria-hidden className={n <= budget ? 'text-gold' : 'text-text-muted/70'}>
          €
        </span>
      ))}
    </span>
  )
}
