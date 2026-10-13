import { describe, expect, it } from 'vitest'
import {
  EXAM_POOL_MINIMUM,
  MIN_RECALL_GAP,
  SESSION_SIZE,
  buildSession,
  cardState,
  examPool,
  learningLoad,
  warmupWeight,
  wordOfTheDayPool,
} from './pool.js'
import { MILLISECONDS_PER_DAY } from './srs.js'
import { makeWord, words as fixtureWords } from './testSupport.js'

const NOW = new Date(2026, 9, 13, 9).getTime()
const LONG_AGO = new Date(2026, 5, 1, 9).getTime()

function daysFromNow(days) {
  return NOW + days * MILLISECONDS_PER_DAY
}

function numberedWords(count) {
  return Array.from({ length: count }, (_, index) =>
    makeWord({ id: `w${String(index + 1).padStart(2, '0')}`, unit: 1 + Math.floor(index / 10), lesson: 1, position: 1 + (index % 10) }),
  )
}

function progressRow(overrides = {}) {
  return {
    rating: 'easy',
    box: 3,
    dueAt: daysFromNow(5),
    reviewedAt: LONG_AGO,
    introducedAt: LONG_AGO,
    promotedOn: null,
    seen: 3,
    lapses: 0,
    ...overrides,
  }
}

function progressFor(entries) {
  return new Map(entries.map(([word, overrides]) => [word.id, { wordId: word.id, ...progressRow(overrides) }]))
}

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

function session(words, progressByWordId = new Map(), random = seededRandom(1)) {
  return buildSession({ words, progressByWordId, now: NOW, random })
}

function idsOfKind(cards, kind) {
  return cards.filter((card) => card.kind === kind).map((card) => card.id)
}

function positionOfKey(cards, key) {
  return cards.findIndex((card) => card.key === key)
}

function expectWellFormed(cards) {
  expect(new Set(cards.map((card) => card.key)).size).toBe(cards.length)
  const countById = new Map()
  for (const card of cards) countById.set(card.id, (countById.get(card.id) ?? 0) + 1)
  expect(Math.max(0, ...countById.values())).toBeLessThanOrEqual(2)
  cards.slice(1).forEach((card, index) => expect(card.id).not.toBe(cards[index].id))
}

function expectRecallsSpacedOut(cards) {
  cards.forEach((card, position) => {
    if (card.kind !== 'recall') return
    const newPosition = positionOfKey(cards, `${card.id}:1`)
    expect(cards[newPosition].kind).toBe('new')
    expect(position - newPosition - 1).toBeGreaterThanOrEqual(MIN_RECALL_GAP)
  })
}

describe('cardState and learningLoad', () => {
  it('names each state from the progress row', () => {
    expect(cardState(undefined, NOW)).toBe('new')
    expect(cardState(progressRow({ rating: 'hard', box: 0, dueAt: NOW }), NOW)).toBe('tricky')
    expect(cardState(progressRow({ box: 2, dueAt: NOW }), NOW)).toBe('due')
    expect(cardState(progressRow({ box: 1, dueAt: daysFromNow(1) }), NOW)).toBe('learning')
    expect(cardState(progressRow({ box: 2, dueAt: daysFromNow(1) }), NOW)).toBe('resting')
  })

  it('counts tricky and box 0-1 words as learning load', () => {
    const words = numberedWords(5)
    const progress = progressFor([
      [words[0], { rating: 'hard', box: 0 }],
      [words[1], { box: 1, dueAt: NOW - 1 }],
      [words[2], { box: 0, rating: 'medium' }],
      [words[3], { box: 2 }],
    ])
    expect(learningLoad(words, progress)).toBe(3)
  })
})

describe('buildSession for a fresh learner', () => {
  it('teaches the first 5 words by rank, each with a recall, in 10 cards', () => {
    const cards = session(fixtureWords)

    expect(cards).toHaveLength(SESSION_SIZE)
    expect(idsOfKind(cards, 'new')).toEqual(['ball', 'book', 'bike', 'bag', 'car'])
    expect(idsOfKind(cards, 'recall').sort()).toEqual(['bag', 'ball', 'bike', 'book', 'car'])
    expect(cards[0]).toEqual({ ...fixtureWords[0], key: 'ball:1', kind: 'new', box: 0 })
    expectWellFormed(cards)
    expectRecallsSpacedOut(cards)
  })

  it('spreads the new cards over the first 60% of the session', () => {
    const cards = session(fixtureWords)
    const lastNewPosition = Math.max(...cards.map((card, position) => (card.kind === 'new' ? position : -1)))
    expect(lastNewPosition).toBeLessThan(Math.ceil(SESSION_SIZE * 0.6))
  })

  it('takes rank order from the words, not from the input order', () => {
    const cards = session([...fixtureWords].reverse())
    expect(idsOfKind(cards, 'new')).toEqual(['ball', 'book', 'bike', 'bag', 'car'])
  })
})

describe('buildSession limits', () => {
  it('puts the oldest tricky words first in priority and caps them at 4', () => {
    const words = numberedWords(30)
    const tricky = words.slice(0, 6).map((word, index) => [word, { rating: 'hard', box: 0, dueAt: NOW, reviewedAt: daysFromNow(-10 + index) }])
    const due = words.slice(6, 16).map((word) => [word, { box: 3, dueAt: daysFromNow(-1) }])

    const cards = session(words, progressFor([...due, ...tricky]))

    expect(cards).toHaveLength(SESSION_SIZE)
    expect(idsOfKind(cards, 'tricky').sort()).toEqual(['w01', 'w02', 'w03', 'w04'])
    expect(idsOfKind(cards, 'due')).toHaveLength(4)
    expect(idsOfKind(cards, 'new')).toEqual(['w17'])
    expect(cards[0].kind).toBe('due')
    expectWellFormed(cards)
  })

  it('keeps tricky cards in the middle with easier cards between them', () => {
    const words = numberedWords(20)
    const tricky = words.slice(0, 4).map((word) => [word, { rating: 'hard', box: 0, dueAt: NOW }])
    const resting = words.slice(4, 20).map((word) => [word, { box: 4 }])

    const cards = session(words, progressFor([...tricky, ...resting]))
    const trickyPositions = cards.flatMap((card, position) => (card.kind === 'tricky' ? [position] : []))

    expect(trickyPositions).toHaveLength(4)
    expect(trickyPositions[0]).toBeGreaterThan(0)
    trickyPositions.slice(1).forEach((position, index) => expect(position - trickyPositions[index]).toBeGreaterThan(1))
  })

  it('allows only 1 new word for a learning load of 5 to 7', () => {
    const words = numberedWords(25)
    for (const load of [5, 7]) {
      const learning = words.slice(0, load).map((word) => [word, { box: 1, dueAt: daysFromNow(1) }])
      const cards = session(words, progressFor(learning))
      expect(cards).toHaveLength(SESSION_SIZE)
      expect(idsOfKind(cards, 'new')).toEqual([words[load].id])
      expectWellFormed(cards)
    }
  })

  it('allows no new words for a learning load of 8 or more', () => {
    const words = numberedWords(25)
    const learning = words.slice(0, 8).map((word) => [word, { box: 1, dueAt: daysFromNow(1) }])

    const cards = session(words, progressFor(learning))

    expect(cards).toHaveLength(SESSION_SIZE)
    expect(idsOfKind(cards, 'new')).toEqual([])
    expect(idsOfKind(cards, 'recall')).toEqual([])
    expectWellFormed(cards)
  })

  it('stops new words at 8 a day', () => {
    const words = numberedWords(25)
    const introducedToday = (count) => words.slice(0, count).map((word) => [word, { box: 3, introducedAt: daysFromNow(-0.1) }])

    expect(idsOfKind(session(words, progressFor(introducedToday(8))), 'new')).toEqual([])
    expect(idsOfKind(session(words, progressFor(introducedToday(7))), 'new')).toEqual(['w08'])
    expect(idsOfKind(session(words, progressFor(introducedToday(5))), 'new')).toEqual(['w06', 'w07', 'w08'])
  })

  it('does not count words introduced on another day', () => {
    const words = numberedWords(25)
    const introducedYesterday = words.slice(0, 8).map((word) => [word, { box: 3, introducedAt: daysFromNow(-1) }])
    const cards = session(words, progressFor(introducedYesterday))
    expect(idsOfKind(cards, 'new')).toEqual(['w09', 'w10', 'w11', 'w12'])
    expect(cards[0].kind).toBe('warmup')
  })
})

describe('buildSession fill steps', () => {
  it('picks due words by lowest box, then most overdue, then rank', () => {
    const words = numberedWords(12)
    const due = words.map((word, index) => [word, { box: index < 6 ? 4 : 2, dueAt: daysFromNow(index % 2 === 0 ? -3 : -1) }])

    const cards = session(words, progressFor(due))

    expect(cards).toHaveLength(SESSION_SIZE)
    expect(idsOfKind(cards, 'due').sort()).toEqual(['w01', 'w02', 'w03', 'w05', 'w07', 'w08', 'w09', 'w10', 'w11', 'w12'])
  })

  it('fills to 10 with warm-up words when nothing is due', () => {
    const words = numberedWords(15)
    const resting = words.map((word) => [word, { box: 4 }])

    const cards = session(words, progressFor(resting))

    expect(cards).toHaveLength(SESSION_SIZE)
    expect(cards.every((card) => card.kind === 'warmup')).toBe(true)
    expect(new Set(cards.map((card) => card.id)).size).toBe(SESSION_SIZE)
  })

  it('weights warm-up words that are weak or old more', () => {
    expect(warmupWeight(progressRow({ box: 5, reviewedAt: NOW }), NOW)).toBe(1)
    expect(warmupWeight(progressRow({ box: 0, reviewedAt: daysFromNow(-7) }), NOW)).toBe(12)

    const words = numberedWords(2)
    const progress = progressFor([
      [words[0], { box: 5, reviewedAt: NOW }],
      [words[1], { box: 0, rating: 'medium', reviewedAt: daysFromNow(-7) }],
    ])
    const firstPick = buildSession({ words: numberedWords(2), progressByWordId: progress, now: NOW, random: () => 0.5 })
    expect(firstPick.map((card) => card.kind)).toEqual(['warmup', 'warmup', 'repeat', 'repeat'])
    expect(firstPick[0].id).toBe('w02')
  })

  it('adds a second card for words in the session, tricky first, when words run out', () => {
    const words = numberedWords(6)
    const progress = progressFor(words.map((word, index) => [word, index === 5 ? { rating: 'hard', box: 0, dueAt: NOW } : { box: 4 }]))

    const cards = session(words, progress)

    expect(cards).toHaveLength(SESSION_SIZE)
    expect(idsOfKind(cards, 'repeat')).toContain('w06')
    expect(idsOfKind(cards, 'repeat')).toHaveLength(4)
    expectWellFormed(cards)
  })

  it('works with fewer than 10 words', () => {
    const three = session(fixtureWords.slice(0, 3))
    expect(three).toHaveLength(6)
    expect(idsOfKind(three, 'new')).toEqual(['ball', 'book', 'bike'])
    expectWellFormed(three)

    expect(session(fixtureWords.slice(0, 1)).map((card) => card.key)).toEqual(['ball:1', 'ball:2'])
    expect(session([])).toEqual([])

    const sevenSeen = numberedWords(7)
    const cards = session(sevenSeen, progressFor(sevenSeen.map((word) => [word, { box: 4 }])))
    expect(cards).toHaveLength(SESSION_SIZE)
    expectWellFormed(cards)
  })

  it('keeps every rule over many random learners', () => {
    const words = numberedWords(40)
    const random = seededRandom(42)
    for (let learner = 0; learner < 200; learner += 1) {
      const entries = words
        .filter(() => random() < 0.5)
        .map((word) => {
          const box = Math.floor(random() * 6)
          const rating = random() < 0.2 ? 'hard' : 'easy'
          return [word, { rating, box: rating === 'hard' ? 0 : box, dueAt: daysFromNow(random() * 10 - 5), reviewedAt: daysFromNow(-random() * 20), introducedAt: daysFromNow(-random() * 3) }]
        })
      const cards = session(words, progressFor(entries), seededRandom(learner))
      expect(cards).toHaveLength(SESSION_SIZE)
      expectWellFormed(cards)
      expectRecallsSpacedOut(cards)
      expect(idsOfKind(cards, 'tricky').length).toBeLessThanOrEqual(4)
      const hasKnownCard = cards.some((card) => card.kind === 'due' || card.kind === 'warmup')
      if (hasKnownCard) expect(['due', 'warmup']).toContain(cards[0].kind)
      cards.forEach((card, position) => {
        if (card.kind === 'new') expect(position).toBeLessThan(Math.ceil(SESSION_SIZE * 0.6))
      })
    }
  })
})

describe('examPool', () => {
  it('lists seen words tricky first, then lowest box', () => {
    const words = numberedWords(10)
    const progress = progressFor([
      [words[0], { box: 4 }],
      [words[1], { box: 1 }],
      [words[2], { rating: 'hard', box: 0 }],
      [words[3], { box: 0, rating: 'medium' }],
      [words[4], { box: 2 }],
      [words[5], { box: 1 }],
      [words[6], { box: 3 }],
    ])
    expect(examPool({ words, progressByWordId: progress }).map((word) => word.id)).toEqual(['w03', 'w04', 'w02', 'w06', 'w05', 'w07', 'w01'])
  })

  it('tops up to 6 with the next unseen words by rank', () => {
    const words = numberedWords(10)
    const progress = progressFor([[words[4], { box: 2 }]])
    expect(examPool({ words, progressByWordId: progress }).map((word) => word.id)).toEqual(['w05', 'w01', 'w02', 'w03', 'w04', 'w06'])
    expect(examPool({ words, progressByWordId: new Map() })).toHaveLength(EXAM_POOL_MINIMUM)
    expect(examPool({ words: words.slice(0, 2), progressByWordId: new Map() })).toHaveLength(2)
  })
})

describe('wordOfTheDayPool', () => {
  it('uses seen words plus the next 3 unseen words by rank', () => {
    const words = numberedWords(10)
    expect(wordOfTheDayPool({ words, progressByWordId: new Map() }).map((word) => word.id)).toEqual(['w01', 'w02', 'w03'])
    const progress = progressFor([[words[1], {}], [words[7], {}]])
    expect(wordOfTheDayPool({ words, progressByWordId: progress }).map((word) => word.id)).toEqual(['w02', 'w08', 'w01', 'w03', 'w04'])
  })
})
