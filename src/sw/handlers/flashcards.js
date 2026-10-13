import { loadWords } from '../content.js'
import { get, getAll, put } from '../db.js'
import { badRequest, notFound } from '../httpError.js'
import { buildSession } from '../pool.js'
import { isRating, nextReview } from '../srs.js'

export const CARDS_STORE = 'cards'

export async function readProgressByWordId() {
  const entries = await getAll(CARDS_STORE)
  return new Map(entries.map((entry) => [entry.wordId, entry]))
}

export async function listFlashcards() {
  const [words, progressByWordId] = await Promise.all([loadWords(), readProgressByWordId()])
  return { cards: buildSession({ words, progressByWordId, now: Date.now() }) }
}

async function assertWordExists(wordId) {
  const words = await loadWords()
  if (!words.some((word) => word.id === wordId)) throw notFound(`Word ${wordId} not found`)
}

export async function rateFlashcard({ params, body = {} }) {
  if (!isRating(body?.rating)) throw badRequest('rating must be easy, medium or hard')
  await assertWordExists(params.wordId)
  const previous = await get(CARDS_STORE, params.wordId)
  await put(CARDS_STORE, params.wordId, { wordId: params.wordId, ...nextReview(previous, body.rating, Date.now()) })
  return { ok: true }
}
