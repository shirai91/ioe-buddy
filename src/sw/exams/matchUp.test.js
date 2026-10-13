import { describe, expect, it } from 'vitest'
import { generate, PAIRS_PER_ROUND } from './matchUp.js'

function word(name, { image = `content/images/${name}.png`, id = name } = {}) {
  return { id, word: name, letter: name[0].toUpperCase() + name[0], image }
}

const unitWords = [word('ball'), word('bike'), word('book'), word('bag'), word('bed'), word('box')]
const otherWords = [word('cat'), word('cup'), word('sun', { image: null })]
const allWords = [...unitWords, ...otherWords]

function ids(choices) {
  return choices.map((choice) => choice.id).sort()
}

function runMany(times, run) {
  for (let attempt = 0; attempt < times; attempt++) run()
}

describe('match up generator', () => {
  it('returns the asked number of rounds with plain data', () => {
    const rounds = generate({ words: unitWords, allWords, count: 10 })
    expect(rounds).toHaveLength(10)
    expect(JSON.parse(JSON.stringify(rounds))).toEqual(rounds)
    expect(rounds[0].id).toBe('match-up-1')
    expect(rounds[0].pictures[0]).toEqual({ id: expect.any(String), word: expect.any(String), letter: expect.any(String), image: expect.any(String) })
  })

  it('gives four distinct pairs per round with the same words in both columns', () => {
    runMany(40, () => {
      for (const round of generate({ words: unitWords, allWords, count: 10 })) {
        expect(round.words).toHaveLength(PAIRS_PER_ROUND)
        expect(ids(round.pictures)).toEqual(ids(round.words))
        expect(new Set(round.words.map((choice) => choice.word)).size).toBe(PAIRS_PER_ROUND)
      }
    })
  })

  it('uses only unit words when the unit has enough pictures', () => {
    runMany(40, () => {
      for (const round of generate({ words: unitWords, allWords, count: 10 })) {
        round.words.forEach((choice) => expect(unitWords.map((unitWord) => unitWord.id)).toContain(choice.id))
      }
    })
  })

  it('cycles through all unit words before it repeats one', () => {
    runMany(20, () => {
      const rounds = generate({ words: unitWords, allWords, count: 3 })
      const firstSix = new Set([...rounds[0].words, ...rounds[1].words].map((choice) => choice.id))
      expect(firstSix.size).toBeGreaterThanOrEqual(unitWords.length)
    })
  })

  it('fills small units with words from other units, pictures first, never duplicated', () => {
    const smallUnit = [word('ball'), word('bike'), word('book')]
    const everything = [...smallUnit, word('sun', { image: null }), word('cat'), word('ball', { id: 'unit-09-ball' })]
    runMany(40, () => {
      for (const round of generate({ words: smallUnit, allWords: everything, count: 10 })) {
        expect(ids(round.words)).toEqual(['ball', 'bike', 'book', 'cat'])
      }
    })
  })

  it('never shows the same column order twice in a row', () => {
    const exactUnit = unitWords.slice(0, PAIRS_PER_ROUND)
    runMany(40, () => {
      const rounds = generate({ words: exactUnit, allWords: exactUnit, count: 10 })
      rounds.slice(1).forEach((round, index) => {
        expect(round.words.map((choice) => choice.id)).not.toEqual(rounds[index].words.map((choice) => choice.id))
        expect(round.pictures.map((choice) => choice.id)).not.toEqual(rounds[index].pictures.map((choice) => choice.id))
      })
    })
  })

  it('makes a new random set on every call', () => {
    const first = JSON.stringify(generate({ words: unitWords, allWords, count: 10 }))
    const differs = Array.from({ length: 5 }, () => JSON.stringify(generate({ words: unitWords, allWords, count: 10 }))).some(
      (other) => other !== first,
    )
    expect(differs).toBe(true)
  })

  it('returns no rounds when there are no words', () => {
    expect(generate({ words: [], allWords: [], count: 10 })).toEqual([])
  })
})
