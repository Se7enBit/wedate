import type { Idea } from './idea.ts'

function query(idea: Idea): string {
  return encodeURIComponent(idea.searchQuery ?? idea.title)
}

export function googleSearchUrl(idea: Idea): string {
  return `https://www.google.com/search?q=${query(idea)}`
}

/** Maps link for ideas that can happen out; `undefined` for home-only ideas. */
export function mapsUrl(idea: Idea): string | undefined {
  if (idea.setting === 'home') return undefined
  return `https://www.google.com/maps/search/?api=1&query=${query(idea)}`
}
