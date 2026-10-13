import { describe, expect, it } from 'vitest'
import { generate, MAX_WORD_LENGTH, SNEAKY_LETTERS } from './letterPop.js'

const unitWords = [
  { id: 'ball', word: 'ball', letter: 'Bb', image: 'content/images/ball.png' },
  { id: 'cat', word: 'cat', letter: 'Cc', image: null },
  { id: 'cup', word: 'cup', letter: 'Cc', image: null },
  { id: 'apple', word: 'apple', letter: 'Aa', image: null },
  { id: 'teddy-bear', word: 'teddy bear', letter: 'Tt', image: null },
  { id: 'chicken', word: 'chicken', letter: 'Cc', image: null },
]

const otherWords = [
  { id: 'sun', word: 'sun', letter: 'Ss', image: null },
  { id: 'fish-and-chips', word: 'fish and chips', letter: 'Ff', image: null },
]

const allWords = [...unitWords, ...otherWords]

function letterPositionsThatSolve(question) {
  return question.letters
    .map((_, index) => index)
    .filter((index) => question.letters.filter((_, j) => j !== index).join('') === question.word)
}

describe('letter pop generator', () => {
  it('returns the asked number of questions', () => {
    expect(generate({ words: unitWords, allWords, count: 10 })).toHaveLength(10)
  })

  it('sneaks exactly one extra letter in, and only that letter solves it', () => {
    for (let run = 0; run < 50; run++) {
      for (const question of generate({ words: unitWords, allWords, count: 10 })) {
        expect(question.letters).toHaveLength(question.word.length + 1)
        expect(SNEAKY_LETTERS).toContain(question.letters[question.extraIndex])
        expect(letterPositionsThatSolve(question)).toEqual([question.extraIndex])
      }
    }
  })

  it('never asks the same word twice in a row', () => {
    for (let run = 0; run < 50; run++) {
      const words = generate({ words: unitWords, allWords, count: 10 }).map((question) => question.word)
      words.slice(1).forEach((word, index) => expect(word).not.toBe(words[index]))
    }
  })

  it('skips multi-word entries and words too long for the tile row', () => {
    for (let run = 0; run < 20; run++) {
      for (const question of generate({ words: unitWords, allWords, count: 10 })) {
        expect(question.word).toMatch(/^[a-z]+$/)
        expect(question.word.length).toBeLessThanOrEqual(MAX_WORD_LENGTH)
      }
    }
  })

  it('carries the word id, letter and image for the picture', () => {
    const questions = generate({ words: [unitWords[0], unitWords[1]], allWords, count: 10 })
    const ball = questions.find((question) => question.word === 'ball')
    expect(ball).toMatchObject({ wordId: 'ball', letter: 'Bb', image: 'content/images/ball.png' })
  })

  it('makes a new random set on every call', () => {
    const first = JSON.stringify(generate({ words: unitWords, allWords, count: 10 }))
    const others = Array.from({ length: 5 }, () => JSON.stringify(generate({ words: unitWords, allWords, count: 10 })))
    expect(others.some((other) => other !== first)).toBe(true)
  })

  it('falls back to all words when the unit has fewer than two playable words', () => {
    const questions = generate({ words: [otherWords[1], unitWords[1]], allWords, count: 10 })
    expect(new Set(questions.map((question) => question.word)).size).toBeGreaterThan(1)
  })

  it('returns no questions when there are no playable words', () => {
    expect(generate({ words: [], allWords: [otherWords[1]], count: 10 })).toEqual([])
  })
})
