import { describe, expect, it } from 'vitest'
import { EMPTY_IDEA_FORM, formToIdea, ideaToForm, type IdeaFormValues } from './ideaForm.ts'

const filled: IdeaFormValues = {
  ...EMPTY_IDEA_FORM,
  title: '  Taco Tuesday  ',
  summary: 'Make tacos together.',
  steps: 'Buy tortillas\n\n  Cook the filling  \nEat\n',
  bring: '',
  searchQuery: '   ',
}

describe('formToIdea', () => {
  it('builds a custom idea, trimming text and splitting lines', () => {
    const result = formToIdea(filled, 'abc')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.idea).toMatchObject({
      id: 'abc',
      source: 'custom',
      title: 'Taco Tuesday',
      steps: ['Buy tortillas', 'Cook the filling', 'Eat'],
    })
    expect(result.idea).not.toHaveProperty('bring')
    expect(result.idea).not.toHaveProperty('searchQuery')
  })

  it('keeps bring and searchQuery when given', () => {
    const result = formToIdea({ ...filled, bring: 'Salsa\nLimes', searchQuery: ' taco shop near me ' }, 'abc')
    expect(result.ok && result.idea.bring).toEqual(['Salsa', 'Limes'])
    expect(result.ok && result.idea.searchQuery).toBe('taco shop near me')
  })

  it('reports problems by field', () => {
    const result = formToIdea(
      { ...filled, title: 'x'.repeat(61), steps: 'Only one', emoji: '🌮🌮', timesOfDay: [] },
      'abc',
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual(['emoji', 'steps', 'timesOfDay', 'title'])
    expect(result.errors.title).toBe('too_big')
    expect(result.errors.steps).toBe('too_small')
  })

  it('flags an empty form', () => {
    const result = formToIdea(EMPTY_IDEA_FORM, 'abc')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.errors).sort()).toEqual(['steps', 'summary', 'title'])
  })
})

describe('ideaToForm', () => {
  it('round-trips through formToIdea', () => {
    const first = formToIdea({ ...filled, bring: 'Salsa', searchQuery: 'tacos', vibes: ['playful'] }, 'abc')
    if (!first.ok) throw new Error('expected a valid idea')
    const again = formToIdea(ideaToForm(first.idea), 'abc')
    expect(again).toEqual(first)
  })
})
