import { describe, expect, it } from 'vitest'
import { buildPrompt, NOTES_MAX, parseIdeas, recentTitles, type IdeaPrefs, type PromptContext } from './prompt.ts'
import { makeIdea } from './test-utils.ts'

const prefs: IdeaPrefs = { vibes: ['cozy', 'playful'], budget: 1, duration: 'short', setting: 'home', energy: 'low' }
const ctx: PromptContext = { now: new Date(2026, 10, 4, 18, 30), timeOfDay: 'evening' }

describe('buildPrompt', () => {
  it('includes the prefs, date and time of day', () => {
    const prompt = buildPrompt(prefs, ctx, [])
    expect(prompt).toContain('cozy, playful')
    expect(prompt).toContain('up to €20 for two')
    expect(prompt).toContain('up to 3 hours')
    expect(prompt).toContain('Setting: home')
    expect(prompt).toContain('Energy: low')
    expect(prompt).toContain('November 2026')
    expect(prompt).toContain('Time of day: evening')
  })

  it('says "any" for prefs left open', () => {
    const prompt = buildPrompt({ vibes: [], budget: 3, duration: 'full_day' }, ctx, [])
    expect(prompt).toContain('Vibes: any')
    expect(prompt).toContain('Budget: any budget')
    expect(prompt).toContain('Setting: home or out')
    expect(prompt).toContain('Energy: any')
  })

  it('states the rules and the reply shape', () => {
    const prompt = buildPrompt(prefs, ctx, [])
    expect(prompt).toContain('3 to 5')
    expect(prompt).toContain('safe, legal and consensual')
    expect(prompt).toContain('Never name a specific venue')
    expect(prompt).toContain('searchQuery')
    expect(prompt).toContain('{ "ideas": [ ... ] }')
    expect(prompt).toContain('"great_when_bad"')
  })

  it('includes weather and city only when known', () => {
    const without = buildPrompt(prefs, ctx, [])
    expect(without).not.toContain('Weather:')
    expect(without).not.toContain('City:')

    const known = buildPrompt(prefs, { ...ctx, weather: { tempC: 12.4, isRaining: true }, cityName: 'Athens' }, [])
    expect(known).toContain('Weather: 12°C, rain or snow')
    expect(known).toContain('City: Athens')
  })

  it('lists titles to avoid only when there are some', () => {
    expect(buildPrompt(prefs, ctx, [])).not.toContain('already seen')
    const prompt = buildPrompt(prefs, ctx, ['Sunset picnic', 'Café crawl'])
    expect(prompt).toContain('already seen')
    expect(prompt).toContain('- Sunset picnic')
    expect(prompt).toContain('- Café crawl')
  })

  it('includes notes capped at the limit, and skips blank notes', () => {
    expect(buildPrompt({ ...prefs, notes: '   ' }, ctx, [])).not.toContain('Their notes')
    const prompt = buildPrompt({ ...prefs, notes: 'x'.repeat(NOTES_MAX + 50) }, ctx, [])
    expect(prompt).toContain(`Their notes: ${'x'.repeat(NOTES_MAX)}`)
    expect(prompt).not.toContain('x'.repeat(NOTES_MAX + 1))
  })

  it('adds the right-now rules only when asked', () => {
    expect(buildPrompt(prefs, ctx, [])).not.toContain('They want to start soon')
    const prompt = buildPrompt(prefs, { ...ctx, rightNow: true }, [])
    expect(prompt).toContain('timesOfDay must include "evening"')
    expect(prompt).toContain('never "plan_ahead"')
  })
})

describe('parseIdeas', () => {
  const ids = () => {
    let n = 0
    return () => `id-${++n}`
  }
  const aiIdea = (title: string) => {
    const { id: _id, source: _source, ...fields } = makeIdea({ title })
    return fields
  }
  const reply = (...ideas: unknown[]) => JSON.stringify({ ideas })

  it('sets its own id and source, whatever the model sent', () => {
    const [idea] = parseIdeas(reply({ ...aiIdea('Stargazing'), id: 'lib-hijack', source: 'library' }), ids())
    expect(idea.id).toBe('id-1')
    expect(idea.source).toBe('ai')
    expect(idea.title).toBe('Stargazing')
  })

  it('drops invalid ideas and keeps the valid ones', () => {
    const ideas = parseIdeas(
      reply(
        aiIdea('Good one'),
        { ...aiIdea('Bad budget'), budget: 7 },
        { ...aiIdea('Two emoji'), emoji: '🎲🎲' },
        { ...aiIdea('One step'), steps: ['Only this'] },
        'not an object',
        aiIdea('Good two'),
      ),
      ids(),
    )
    expect(ideas.map((i) => i.title)).toEqual(['Good one', 'Good two'])
  })

  it('returns nothing for non-JSON or the wrong shape', () => {
    expect(parseIdeas('Sure! Here are some ideas', ids())).toEqual([])
    expect(parseIdeas('[]', ids())).toEqual([])
    expect(parseIdeas('{"ideas":"none"}', ids())).toEqual([])
    expect(parseIdeas('{"ideas":[]}', ids())).toEqual([])
  })

  it('keeps at most 5 ideas', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(aiIdea)
    expect(parseIdeas(reply(...many), ids()).map((i) => i.title)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('drops avoided titles, ignoring case and spacing', () => {
    const ideas = parseIdeas(reply(aiIdea('Sunset Picnic'), aiIdea('Stargazing')), ids(), ['  sunset picnic '])
    expect(ideas.map((i) => i.title)).toEqual(['Stargazing'])
  })
})

describe('recentTitles', () => {
  it('removes duplicates and keeps the order', () => {
    const ideas = ['A', 'B', 'A', 'C'].map((title) => makeIdea({ title }))
    expect(recentTitles(ideas)).toEqual(['A', 'B', 'C'])
  })

  it('keeps the first titles up to the cap', () => {
    const ideas = ['A', 'B', 'C'].map((title) => makeIdea({ title }))
    expect(recentTitles(ideas, 2)).toEqual(['A', 'B'])
  })
})
