import { pictureChance } from '../stars.js'
import { hidePictures, playableWords, shuffle, wordSequence } from './wordTools.js'

export const EXTRA_LETTERS = 'abcdefghiklmnoprstuwy'.split('')
export const TILE_COUNT = 6

function wordPool(words, allWords) {
  const candidates = [playableWords(words), playableWords(allWords)]
  return candidates.find((pool) => pool.length >= 2) ?? candidates.find((pool) => pool.length > 0) ?? []
}

export function blankCountFor(word) {
  return word.length <= 3 ? 1 : 2
}

function hideLetters(word, random) {
  const positions = [...word].map((_, index) => index)
  const blanks = shuffle(positions, random)
    .slice(0, blankCountFor(word))
    .sort((a, b) => a - b)
  const missing = blanks.map((index) => word[index])
  const extras = shuffle(
    EXTRA_LETTERS.filter((letter) => !missing.includes(letter)),
    random,
  ).slice(0, TILE_COUNT - missing.length)
  return { blanks, tiles: shuffle([...missing, ...extras], random) }
}

function toQuestion(entry, random) {
  return {
    wordId: entry.id,
    word: entry.word,
    letter: entry.letter ?? null,
    image: entry.image ?? null,
    ...hideLetters(entry.word, random),
  }
}

export function generate({ words, allWords, count = 10, stars = 0, random = Math.random }) {
  const questions = wordSequence(wordPool(words, allWords), count, random).map((entry) => toQuestion(entry, random))
  return hidePictures(questions, pictureChance(stars), random)
}
