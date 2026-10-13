import { localDateKey } from '../calendar.js'
import { loadWords } from '../content.js'
import { notFound } from '../httpError.js'
import { wordOfTheDayPool } from '../pool.js'
import { readProgressByWordId } from './flashcards.js'

export function stableHash(text) {
  let hash = 0x811c9dc5
  for (const character of text) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function pickWordOfTheDay(words, date = new Date()) {
  return words[stableHash(localDateKey(date)) % words.length]
}

export async function getWordOfTheDay() {
  const [words, progressByWordId] = await Promise.all([loadWords(), readProgressByWordId()])
  const pool = wordOfTheDayPool({ words, progressByWordId })
  if (pool.length === 0) throw notFound('There are no words yet')
  return pickWordOfTheDay(pool)
}
