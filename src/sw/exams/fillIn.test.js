import { describe, expect, it } from 'vitest'
import { blankCountFor, EXTRA_LETTERS, generate, TILE_COUNT } from './fillIn.js'

const unitWords = [
  { id: 'ball', word: 'ball', letter: 'Bb', image: 'content/images/ball.png' },
  { id: 'cat', word: 'cat', letter: 'Cc', image: null },
  { id: 'football', word: 'football', letter: 'Ff', image: null },
  { id: 'teddy-bear', word: 'teddy bear', letter: 'Tt', image: null },
]

const allWords = [...unitWords, { id: 'sun', word: 'sun', letter: 'Ss', image: null }]

function countLetters(letters) {
  return letters.reduce((counts, letter) => ({ ...counts, [letter]: (counts[letter] ?? 0) + 1 }), {})
}

describe('fill in generator', () => {
  it('returns the asked number of questions', () => {
    expect(generate({ words: unitWords, allWords, count: 10 })).toHaveLength(10)
  })

  it('hides 1 letter in short words and 2 in longer words, in order', () => {
    expect(blankCountFor('cat')).toBe(1)
    expect(blankCountFor('ball')).toBe(2)
    for (let run = 0; run < 50; run++) {
      for (const question of generate({ words: unitWords, allWords, count: 10 })) {
        expect(question.blanks).toHaveLength(blankCountFor(question.word))
        expect([...question.blanks].sort((a, b) => a - b)).toEqual(question.blanks)
        expect(new Set(question.blanks).size).toBe(question.blanks.length)
        question.blanks.forEach((index) => expect(index).toBeLessThan(question.word.length))
      }
    }
  })

  it('offers six tiles that hold every missing letter plus extras', () => {
    for (let run = 0; run < 50; run++) {
      for (const question of generate({ words: unitWords, allWords, count: 10 })) {
        const missing = question.blanks.map((index) => question.word[index])
        const tileCounts = countLetters(question.tiles)
        expect(question.tiles).toHaveLength(TILE_COUNT)
        for (const [letter, count] of Object.entries(countLetters(missing))) {
          expect(tileCounts[letter]).toBe(count)
        }
        question.tiles.filter((letter) => !missing.includes(letter)).forEach((letter) => expect(EXTRA_LETTERS).toContain(letter))
      }
    }
  })

  it('never asks the same word twice in a row and skips multi-word entries', () => {
    for (let run = 0; run < 50; run++) {
      const words = generate({ words: unitWords, allWords, count: 10 }).map((question) => question.word)
      words.forEach((word) => expect(word).toMatch(/^[a-z]+$/))
      words.slice(1).forEach((word, index) => expect(word).not.toBe(words[index]))
    }
  })

  it('carries the word id, letter and image for the picture', () => {
    const ball = generate({ words: unitWords, allWords, count: 10 }).find((question) => question.word === 'ball')
    expect(ball).toMatchObject({ wordId: 'ball', letter: 'Bb', image: 'content/images/ball.png' })
  })

  it('makes a new random set on every call', () => {
    const first = JSON.stringify(generate({ words: unitWords, allWords, count: 10 }))
    const others = Array.from({ length: 5 }, () => JSON.stringify(generate({ words: unitWords, allWords, count: 10 })))
    expect(others.some((other) => other !== first)).toBe(true)
  })

  it('returns no questions when there are no playable words', () => {
    expect(generate({ words: [unitWords[3]], allWords: [unitWords[3]], count: 10 })).toEqual([])
  })

  it('shows every picture at 0 stars', () => {
    const questions = generate({ words: unitWords, allWords, count: 10, stars: 0 })
    expect(questions.filter((question) => question.letter === '?')).toHaveLength(0)
  })

  it('shows the picture in 3 of 10 questions at 100 stars and hides the others behind a ? tile', () => {
    for (let run = 0; run < 20; run++) {
      const questions = generate({ words: unitWords, allWords, count: 10, stars: 100 })
      const hidden = questions.filter((question) => question.letter === '?')
      expect(hidden).toHaveLength(7)
      hidden.forEach((question) => expect(question.image).toBeNull())
    }
  })

  it('hides every picture from 200 stars', () => {
    const questions = generate({ words: unitWords, allWords, count: 10, stars: 200 })
    questions.forEach((question) => expect(question).toMatchObject({ image: null, letter: '?' }))
  })
})
