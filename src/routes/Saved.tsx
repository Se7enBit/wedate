import EmptyState from '../components/EmptyState.tsx'
import { strings } from '../strings.ts'

export default function Saved() {
  const { title, hint } = strings.screens.saved
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <EmptyState emoji="💛" title={strings.comingSoon} hint={hint} />
    </section>
  )
}
