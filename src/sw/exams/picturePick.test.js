import { describe, expect, it } from 'vitest'
import { generate, OPTIONS_PER_QUESTION } from './picturePick.js'
import { shuffle, wordSequence } from './wordTools.js'

function word(name, { image = `content/images/${name}.png`, id = name, sight } = {}) {
  return { id, word: name, letter: name[0].toUpperCase() + name[0], image, ...(sight && { sight }) }
}

const unitWords = [word('ball'), word('bike'), word('book')]
const otherWords = [word('cat'), word('cup'), word('sun', { image: null }), word('fish')]
const allWords = [...unitWords, ...otherWords, word('ball', { id: 'unit-09-ball' })]

function runMany(times, run) {
  for (let attempt = 0; attempt < times; attempt++) run()
}

describe('picture pick generator', () => {
  it('returns the asked number of questions with plain data', () => {
    const questions = generate({ words: unitWords, allWords, count: 10 })
    expect(questions).toHaveLength(10)
    expect(JSON.parse(JSON.stringify(questions))).toEqual(questions)
    expect(questions[0]).toEqual({
      id: 'picture-pick-1',
      answerId: expect.any(String),
      word: expect.any(String),
      options: expect.any(Array),
    })
  })

  it('asks only unit words and includes the answer once among four distinct options', () => {
    runMany(40, () => {
      for (const question of generate({ words: unitWords, allWords, count: 10 })) {
        expect(unitWords.map((unitWord) => unitWord.id)).toContain(question.answerId)
        expect(question.options).toHaveLength(OPTIONS_PER_QUESTION)
        expect(question.options.filter((option) => option.id === question.answerId)).toHaveLength(1)
        expect(question.options.find((option) => option.id === question.answerId).word).toBe(question.word)
        const names = question.options.map((option) => option.word)
        expect(new Set(names).size).toBe(names.length)
      }
    })
  })

  it('never asks the same word twice in a row', () => {
    runMany(40, () => {
      const answers = generate({ words: unitWords, allWords, count: 10 }).map((question) => question.word)
      answers.slice(1).forEach((answer, index) => expect(answer).not.toBe(answers[index]))
    })
  })

  it('uses every unit word as a distractor before words from other units', () => {
    runMany(40, () => {
      for (const question of generate({ words: unitWords, allWords, count: 10 })) {
        const unitIds = question.options.filter((option) => unitWords.some((unitWord) => unitWord.id === option.id))
        expect(unitIds).toHaveLength(unitWords.length)
      }
    })
  })

  it('prefers distractors with pictures', () => {
    runMany(40, () => {
      for (const question of generate({ words: unitWords, allWords, count: 10 })) {
        expect(question.options.every((option) => option.image)).toBe(true)
      }
    })
  })

  it('falls back to words without pictures when it must', () => {
    const plainWords = [word('red', { image: null }), word('blue', { image: null })]
    const questions = generate({ words: plainWords, allWords: plainWords, count: 3 })
    expect(questions).toHaveLength(3)
    expect(questions[0].options).toHaveLength(2)
    expect(questions[0].options[0]).toEqual({ id: expect.any(String), word: expect.any(String), letter: expect.any(String), image: null })
  })

  it('makes a new random set on every call', () => {
    const many = [...unitWords, ...otherWords]
    const first = JSON.stringify(generate({ words: many, allWords: many, count: 10 }))
    const differs = Array.from({ length: 5 }, () => JSON.stringify(generate({ words: many, allWords: many, count: 10 }))).some(
      (other) => other !== first,
    )
    expect(differs).toBe(true)
  })

  it('returns no questions when the unit has no words', () => {
    expect(generate({ words: [], allWords, count: 10 })).toEqual([])
  })
})

describe('helpers', () => {
  it('shuffle keeps every item', () => {
    expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4])
  })

  it('wordSequence repeats a single word when that is all there is', () => {
    expect(wordSequence([word('ball')], 3).map((entry) => entry.word)).toEqual(['ball', 'ball', 'ball'])
  })

  it('does not ask sight words when there are enough words with real pictures', () => {
    const sightWords = [word('hi', { sight: true }), word('bye', { sight: true })]
    runMany(40, () => {
      for (const question of generate({ words: [...unitWords, ...sightWords], allWords, count: 10 })) {
        expect(['hi', 'bye']).not.toContain(question.word)
        expect(question.options.map((option) => option.word)).not.toContain('hi')
      }
    })
  })
})
