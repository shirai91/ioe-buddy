import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAll, put } from '../db.js'
import { loadSentenceChoices } from '../content.js'
import { examGenerators } from '../exams/index.js'
import { handleApiRequest } from '../router.js'
import { MILLISECONDS_PER_DAY } from '../srs.js'
import { apiRequest, contentIndex, jsonInit, useFreshBackend, words } from '../testSupport.js'
import { pickWordOfTheDay, stableHash } from './wordOfTheDay.js'

beforeEach(useFreshBackend)
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function call(path, init) {
  const pathWithoutQuery = path.split('?')[0]
  const response = await handleApiRequest(apiRequest(path, init), pathWithoutQuery)
  return { status: response.status, body: await response.json() }
}

function rate(wordId, rating) {
  return call(`flashcards/${wordId}/rate`, jsonInit('POST', { rating }))
}

function useClock(date) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(date)
  return Date.now()
}

function wordsById(...ids) {
  return ids.map((id) => words.find((word) => word.id === id))
}

describe('removed unit routes and credits', () => {
  it('answers 404 for the old unit routes', async () => {
    expect(await call('units')).toEqual({ status: 404, body: { error: expect.any(String) } })
    expect((await call('units/unit-01')).status).toBe(404)
  })

  it('returns the credits from the index', async () => {
    expect((await call('credits')).body).toEqual(contentIndex.credits)
  })
})

describe('profile', () => {
  it('starts with the defaults', async () => {
    expect(await call('profile')).toEqual({ status: 200, body: { name: 'Buddy', stars: 0 } })
  })

  it('updates the name and keeps it', async () => {
    expect((await call('profile', jsonInit('PUT', { name: '  Mai  ' }))).body).toEqual({ name: 'Mai', stars: 0 })
    expect((await call('profile')).body).toEqual({ name: 'Mai', stars: 0 })
  })

  it('drops a unitId saved by an older version', async () => {
    await put('profile', 'me', { name: 'Mai', stars: 4, unitId: 'unit-02' })
    expect((await call('profile')).body).toEqual({ name: 'Mai', stars: 4 })
  })

  it('rejects a bad name, a unitId and a body that is not an object', async () => {
    expect((await call('profile', jsonInit('PUT', { name: '' }))).status).toBe(400)
    expect((await call('profile', jsonInit('PUT', { name: 'x'.repeat(41) }))).status).toBe(400)
    expect(await call('profile', jsonInit('PUT', { unitId: 'unit-02' }))).toEqual({ status: 400, body: { error: expect.any(String) } })
    expect((await call('profile', jsonInit('PUT', ['Mai']))).status).toBe(400)
    expect((await call('profile')).body).toEqual({ name: 'Buddy', stars: 0 })
  })
})

describe('flashcards', () => {
  it('gives a fresh learner 10 cards: the first 5 words by rank, each with a recall', async () => {
    const { status, body } = await call('flashcards')

    expect(status).toBe(200)
    expect(Object.keys(body)).toEqual(['cards'])
    expect(body.cards).toHaveLength(10)
    expect(body.cards.filter((card) => card.kind === 'new').map((card) => card.id)).toEqual(['ball', 'book', 'bike', 'bag', 'car'])
    expect(body.cards.filter((card) => card.kind === 'recall')).toHaveLength(5)
    expect(body.cards[0]).toEqual({ ...words[0], key: 'ball:1', kind: 'new', box: 0 })
  })

  it('ignores a unit query', async () => {
    const plain = await call('flashcards')
    const withUnit = await call('flashcards?unit=unit-02')
    expect(withUnit.body.cards.map((card) => card.key)).toEqual(plain.body.cards.map((card) => card.key))
  })

  it('stores the full progress row for a rating', async () => {
    const now = useClock(new Date(2026, 9, 13, 9))

    expect(await rate('ball', 'easy')).toEqual({ status: 200, body: { ok: true } })
    await rate('bike', 'hard')

    expect(await getAll('cards')).toEqual([
      { wordId: 'ball', rating: 'easy', box: 1, dueAt: now + MILLISECONDS_PER_DAY, reviewedAt: now, introducedAt: now, promotedOn: '2026-10-13', seen: 1, lapses: 0 },
      { wordId: 'bike', rating: 'hard', box: 0, dueAt: now, reviewedAt: now, introducedAt: now, promotedOn: null, seen: 1, lapses: 0 },
    ])
  })

  it('promotes a word only once a day', async () => {
    useClock(new Date(2026, 9, 13, 9))
    await rate('ball', 'easy')
    vi.setSystemTime(new Date(2026, 9, 13, 18))
    await rate('ball', 'easy')
    expect((await getAll('cards'))[0]).toMatchObject({ box: 1, seen: 2 })
  })

  it('brings tricky words into the next session and moves on to the next new words', async () => {
    useClock(new Date(2026, 9, 13, 9))
    await rate('ball', 'hard')
    for (const id of ['book', 'bike']) await rate(id, 'easy')

    const { body } = await call('flashcards')

    expect(body.cards).toHaveLength(10)
    expect(body.cards.filter((card) => card.kind === 'tricky').map((card) => card.id)).toEqual(['ball'])
    expect(body.cards.filter((card) => card.kind === 'new').map((card) => card.id)[0]).toBe('bag')
    expect(body.cards.find((card) => card.kind === 'warmup')).toMatchObject({ box: 1 })
  })

  it('rejects a bad rating and an unknown word', async () => {
    expect(await rate('ball', 'great')).toEqual({ status: 400, body: { error: expect.any(String) } })
    expect((await call('flashcards/ball/rate', { method: 'POST' })).status).toBe(400)
    expect((await rate('dragon', 'easy')).status).toBe(404)
    expect(await getAll('cards')).toEqual([])
  })
})

describe('word of the day', () => {
  it('keeps the same word all day and picks it from the next 3 words for a fresh learner', async () => {
    useClock(new Date(2026, 9, 13, 0, 5))
    const morning = (await call('word-of-the-day')).body
    vi.setSystemTime(new Date(2026, 9, 13, 23, 55))
    const night = (await call('word-of-the-day')).body

    expect(morning).toEqual(night)
    expect(morning).toEqual(pickWordOfTheDay(wordsById('ball', 'book', 'bike'), new Date(2026, 9, 13)))
  })

  it('adds seen words to the pool', async () => {
    const day = new Date(2026, 9, 13, 12)
    useClock(day)
    await rate('desk', 'easy')

    const { body } = await call('word-of-the-day')

    expect(body).toEqual(pickWordOfTheDay(wordsById('desk', 'ball', 'book', 'bike'), day))
  })

  it('changes over the days', () => {
    const picks = new Set()
    for (let day = 1; day <= 30; day += 1) picks.add(pickWordOfTheDay(words, new Date(2026, 9, day)).id)
    expect(picks.size).toBeGreaterThan(1)
    expect(stableHash('2026-10-13')).toBe(stableHash('2026-10-13'))
  })
})

describe('exams', () => {
  it('gives the generator the first 6 words for a fresh learner, all words and count 10', async () => {
    const questions = [{ id: 'q1' }]
    const generate = vi.spyOn(examGenerators, 'match-up').mockReturnValue(questions)

    const { body } = await call('exams/match-up')

    expect(body).toEqual({ type: 'match-up', questions })
    expect(generate).toHaveBeenCalledWith({ words: words.slice(0, 6), allWords: words, count: 10, loadSentenceChoices })
  })

  it('puts tricky words first and tops up with unseen words by rank', async () => {
    const generate = vi.spyOn(examGenerators, 'fill-in').mockResolvedValue([])
    await rate('desk', 'easy')
    await rate('doll', 'hard')

    await call('exams/fill-in?unit=unit-02')

    expect(generate.mock.calls[0][0].words.map((word) => word.id)).toEqual(['doll', 'desk', 'ball', 'book', 'bike', 'bag'])
  })

  it('runs the real generators with the pool', async () => {
    for (const type of Object.keys(examGenerators)) {
      const { status, body } = await call(`exams/${type}`)
      expect(status).toBe(200)
      expect(body.questions.length).toBeGreaterThan(0)
    }
  })

  it('returns 404 for an unknown type', async () => {
    expect(await call('exams/spelling-bee')).toEqual({ status: 404, body: { error: expect.any(String) } })
    expect((await call('exams/toString')).status).toBe(404)
  })

  it('moves the stars by the score and stores a result row without a unit', async () => {
    useClock(new Date(2026, 9, 13, 10))

    expect(await call('exams/letter-pop/results', jsonInit('POST', { correct: 10, total: 10 }))).toEqual({ status: 200, body: { stars: 5, change: 5 } })
    expect((await call('exams/picture-pick/results', jsonInit('POST', { correct: 3, total: 10, unitId: 'unit-02' }))).body).toEqual({ stars: 3, change: -2 })
    expect((await call('profile')).body.stars).toBe(3)

    expect(await getAll('results')).toEqual([
      { id: expect.any(Number), type: 'letter-pop', correct: 10, total: 10, time: Date.now() },
      { id: expect.any(Number), type: 'picture-pick', correct: 3, total: 10, time: Date.now() },
    ])
  })

  it('never takes the stars below 0 and reports the real change', async () => {
    expect((await call('exams/fill-in/results', jsonInit('POST', { correct: 8, total: 10 }))).body).toEqual({ stars: 3, change: 3 })
    expect((await call('exams/fill-in/results', jsonInit('POST', { correct: 0, total: 10 }))).body).toEqual({ stars: 0, change: -3 })
    expect((await call('exams/fill-in/results', jsonInit('POST', { correct: 0, total: 0 }))).body).toEqual({ stars: 0, change: 0 })
  })

  it('opens new flash card words as the stars go up', async () => {
    useClock(new Date(2026, 9, 13, 9))
    for (const word of words.slice(0, 5)) await rate(word.id, 'easy')
    const newCardIds = async () => (await call('flashcards')).body.cards.filter((card) => card.kind === 'new').map((card) => card.id)

    expect(await newCardIds()).toEqual([])
    await call('exams/match-up/results', jsonInit('POST', { correct: 10, total: 10 }))
    expect(await newCardIds()).toEqual(words.slice(5, 7).map((word) => word.id))
  })

  it('rejects bad scores and unknown exam types', async () => {
    expect((await call('exams/letter-pop/results', jsonInit('POST', { correct: 11, total: 10 }))).status).toBe(400)
    expect((await call('exams/letter-pop/results', jsonInit('POST', { correct: -1, total: 10 }))).status).toBe(400)
    expect((await call('exams/letter-pop/results', jsonInit('POST', { correct: '5', total: 10 }))).status).toBe(400)
    expect((await call('exams/letter-pop/results', { method: 'POST' })).status).toBe(400)
    expect((await call('exams/nope/results', jsonInit('POST', { correct: 1, total: 1 }))).status).toBe(404)
    expect((await call('profile')).body.stars).toBe(0)
  })
})

describe('reset', () => {
  it('clears cards, results and stars, keeps the name, and starts the pool again at the first word', async () => {
    await call('profile', jsonInit('PUT', { name: 'Mai' }))
    for (const word of words.slice(0, 6)) await rate(word.id, 'easy')
    await call('exams/match-up/results', jsonInit('POST', { correct: 4, total: 5 }))

    expect(await call('reset', { method: 'POST' })).toEqual({ status: 200, body: { ok: true } })

    expect((await call('profile')).body).toEqual({ name: 'Mai', stars: 0 })
    expect(await getAll('cards')).toEqual([])
    expect(await getAll('results')).toEqual([])
    const { body } = await call('flashcards')
    expect(body.cards.filter((card) => card.kind === 'new').map((card) => card.id)).toEqual(['ball', 'book', 'bike', 'bag', 'car'])
  })
})
