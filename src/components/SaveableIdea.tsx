import { Heart } from 'lucide-react'
import type { Idea } from '../domain/idea.ts'
import { useStore } from '../store/useStore.ts'
import { strings } from '../strings.ts'
import IdeaCard from './IdeaCard.tsx'
import { btnSecondary } from './styles.ts'

/** An idea card with a save button, for ideas that are not in the Saved tab yet. */
export default function SaveableIdea({ idea }: { idea: Idea }) {
  const entry = useStore((s) => s.saved[idea.id])
  const d = strings.detail

  const toggleSave = () => {
    const { save, remove } = useStore.getState()
    if (!entry) return save(idea)
    if (entry.note && !window.confirm(d.confirmUnsave)) return
    remove(idea.id)
  }

  return (
    <div className="flex flex-col gap-2">
      <IdeaCard idea={idea} entry={entry} />
      <button
        type="button"
        aria-pressed={!!entry}
        aria-label={`${entry ? d.saved : d.save}: ${idea.title}`}
        onClick={toggleSave}
        className={`${btnSecondary} ${entry ? 'border-rose text-rose' : ''}`}
      >
        <Heart size={18} fill={entry ? 'currentColor' : 'none'} aria-hidden />
        {entry ? d.saved : d.save}
      </button>
    </div>
  )
}
