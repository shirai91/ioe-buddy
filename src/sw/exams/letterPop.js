import { pictureChance } from '../stars.js'
import { hidePictures, playableWords, wordSequence } from './wordTools.js'

export const SNEAKY_LETTERS = 'bcdfghklmnoprstuwz'.split('')
export const MAX_WORD_LENGTH = 6

function pickOne(items, random) {
  return items[Math.floor(random() * items.length)]
}

function wordPool(words, allWords) {
  const fitsTiles = (entry) => entry.word.length <= MAX_WORD_LENGTH
  const unitWords = playableWords(words)
  const everyWord = playableWords(allWords)
  const candidates = [unitWords.filter(fitsTiles), unitWords, everyWord.filter(fitsTiles), everyWord]
  return candidates.find((pool) => pool.length >= 2) ?? candidates.find((pool) => pool.length > 0) ?? []
}

function sneakLetterIn(word, random) {
  const extraIndex = Math.floor(random() * (word.length + 1))
  const allowed = SNEAKY_LETTERS.filter((letter) => letter !== word[extraIndex - 1] && letter !== word[extraIndex])
  const extra = pickOne(allowed, random)
  return { extraIndex, letters: [...word.slice(0, extraIndex), extra, ...word.slice(extraIndex)] }
}

function toQuestion(entry, random) {
  return {
    wordId: entry.id,
    word: entry.word,
    letter: entry.letter ?? null,
    image: entry.image ?? null,
    ...sneakLetterIn(entry.word, random),
  }
}

export function generate({ words, allWords, count = 10, stars = 0, random = Math.random }) {
  const questions = wordSequence(wordPool(words, allWords), count, random).map((entry) => toQuestion(entry, random))
  return hidePictures(questions, pictureChance(stars), random)
}
