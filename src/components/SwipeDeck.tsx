import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Heart, Maximize2, X } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'
import type { Idea } from '../domain/idea.ts'
import type { SavedMap } from '../domain/saved.ts'
import { strings } from '../strings.ts'
import { MetaRow } from './IdeaCard.tsx'

type Props = {
  ideas: Idea[]
  saved: SavedMap
  onSave: (idea: Idea) => void
  onSkip: (idea: Idea) => void
  onOpen: (idea: Idea) => void
}

const SWIPE_PX = 100
const FLICK_PX_PER_S = 600
const TAP_SLOP_PX = 8

function DeckCard({ idea, saved }: { idea: Idea; saved: boolean }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-xl shadow-bg/60">
      <div className="flex items-start justify-between">
        <span className="text-7xl leading-none" aria-hidden>
          {idea.emoji}
        </span>
        {saved && <Heart size={22} fill="currentColor" className="text-rose" role="img" aria-label={strings.card.saved} />}
      </div>
      <h2 className="font-display text-2xl leading-tight font-semibold">{idea.title}</h2>
      <p className="line-clamp-4 text-text-muted">{idea.summary}</p>
      <div className="mt-auto flex flex-col gap-3">
        <MetaRow idea={idea} />
        <ul className="flex flex-wrap gap-2">
          {idea.vibes.map((v) => (
            <li key={v} className="rounded-full border border-border px-3 py-1 text-xs text-text-muted">
              {strings.labels.vibe[v]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type TopCardProps = {
  idea: Idea
  saved: boolean
  flingRef: RefObject<((dir: 1 | -1) => void) | null>
  onDecide: (dir: 1 | -1) => void
  onOpen: () => void
}

function TopCard({ idea, saved, flingRef, onDecide, onOpen }: TopCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const saveOpacity = useTransform(x, [20, SWIPE_PX], [0, 1])
  const skipOpacity = useTransform(x, [-SWIPE_PX, -20], [1, 0])
  const dragDistance = useRef(0)
  const decided = useRef(false)

  const fling = (dir: 1 | -1) => {
    if (decided.current) return
    decided.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onDecide(dir)
    animate(x, dir * 600, { duration: 0.22, ease: 'easeIn' }).then(() => onDecide(dir))
  }

  useEffect(() => {
    flingRef.current = fling
  })

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, touchAction: 'pan-y' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onTapStart={() => {
        dragDistance.current = 0
      }}
      onDrag={(_, info) => {
        dragDistance.current = Math.max(dragDistance.current, Math.abs(info.offset.x))
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_PX || (info.offset.x > 0 && info.velocity.x > FLICK_PX_PER_S)) fling(1)
        else if (info.offset.x < -SWIPE_PX || (info.offset.x < 0 && info.velocity.x < -FLICK_PX_PER_S)) fling(-1)
      }}
      onTap={() => {
        if (dragDistance.current < TAP_SLOP_PX) onOpen()
      }}
    >
      <DeckCard idea={idea} saved={saved} />
      <motion.span
        aria-hidden
        style={{ opacity: saveOpacity }}
        className="absolute top-6 right-6 -rotate-12 rounded-xl border-2 border-rose px-3 py-1 font-display text-xl font-semibold text-rose"
      >
        {strings.deck.saveOverlay}
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: skipOpacity }}
        className="absolute top-6 left-6 rotate-12 rounded-xl border-2 border-text-muted px-3 py-1 font-display text-xl font-semibold text-text-muted"
      >
        {strings.deck.skipOverlay}
      </motion.span>
    </motion.div>
  )
}

/** Swipe deck: right = save, left = skip, tap = open. Buttons do the same. */
export default function SwipeDeck({ ideas, saved, onSave, onSkip, onOpen }: Props) {
  const flingRef = useRef<((dir: 1 | -1) => void) | null>(null)
  const top = ideas[0]
  if (!top) return null

  const behind = ideas.slice(1, 3)
  const d = strings.deck
  const roundButton =
    'flex items-center justify-center rounded-full border border-border bg-surface transition-colors duration-200 hover:bg-surface-raised'

  return (
    <section aria-label={d.label} className="flex flex-col gap-4">
      <div className="relative h-[25rem]">
        {behind
          .map((idea, i) => (
            <div
              key={idea.id}
              aria-hidden
              className="absolute inset-0 transition-transform duration-200"
              style={{ transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.04})` }}
            >
              <DeckCard idea={idea} saved={!!saved[idea.id]} />
            </div>
          ))
          .reverse()}
        <TopCard
          key={top.id}
          idea={top}
          saved={!!saved[top.id]}
          flingRef={flingRef}
          onDecide={(dir) => (dir > 0 ? onSave(top) : onSkip(top))}
          onOpen={() => onOpen(top)}
        />
      </div>

      <div className="mt-2 flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label={d.skip}
          onClick={() => flingRef.current?.(-1)}
          className={`${roundButton} size-14 text-text-muted`}
        >
          <X size={26} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={d.open}
          onClick={() => onOpen(top)}
          className={`${roundButton} size-11 text-text-muted`}
        >
          <Maximize2 size={18} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={d.save}
          onClick={() => flingRef.current?.(1)}
          className={`${roundButton} size-14 text-rose`}
        >
          <Heart size={26} aria-hidden />
        </button>
      </div>
      <p className="text-center text-xs text-text-muted">
        {d.left(ideas.length)} · {d.hint}
      </p>
    </section>
  )
}
