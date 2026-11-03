import { describe, expect, it } from 'vitest'
import { googleSearchUrl, mapsUrl } from './links.ts'
import { makeIdea } from './test-utils.ts'

describe('links', () => {
  const out = makeIdea({ setting: 'out', searchQuery: 'wine & cheese bar near me' })

  it('builds a Google search URL from the searchQuery', () => {
    expect(googleSearchUrl(out)).toBe('https://www.google.com/search?q=wine%20%26%20cheese%20bar%20near%20me')
  })

  it('builds a Maps URL from the searchQuery', () => {
    expect(mapsUrl(out)).toBe(
      'https://www.google.com/maps/search/?api=1&query=wine%20%26%20cheese%20bar%20near%20me',
    )
  })

  it('falls back to the title and encodes accents', () => {
    const idea = makeIdea({ title: 'Crêpes at home', searchQuery: undefined })
    expect(googleSearchUrl(idea)).toBe('https://www.google.com/search?q=Cr%C3%AApes%20at%20home')
  })

  it('has Maps for out and either ideas, not home', () => {
    expect(mapsUrl(makeIdea({ setting: 'home' }))).toBeUndefined()
    expect(mapsUrl(makeIdea({ setting: 'either', title: 'Picnic' }))).toBe(
      'https://www.google.com/maps/search/?api=1&query=Picnic',
    )
  })
})
