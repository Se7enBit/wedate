import type { Idea } from './idea.ts'

/** A valid idea for tests; override only what a test cares about. */
export function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: 'lib-test-idea',
    source: 'library',
    title: 'Test idea',
    summary: 'A short summary.',
    steps: ['Do this', 'Then that'],
    category: 'cozy_home',
    emoji: '🎲',
    budget: 0,
    duration: 'short',
    setting: 'home',
    space: 'indoor',
    energy: 'low',
    timesOfDay: ['morning', 'afternoon', 'evening', 'late_night'],
    weather: 'any',
    prep: 'none',
    vibes: ['cozy'],
    ...overrides,
  }
}
