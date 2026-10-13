import { CHEERS } from './cheers.js'

export const CLIP_FOLDER = 'content/audio/'
export const TRY_AGAIN = 'Try again'
export const GREAT_JOB = 'Great job!'
const LETTERS = [...'abcdefghijklmnopqrstuvwxyz']
const FIXED_PHRASES = [TRY_AGAIN, GREAT_JOB, ...Object.values(CHEERS).flat(), ...LETTERS]

export function findThe(word) {
  return `Find the ${word}`
}

export function clipName(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function clipPath(text) {
  return `${CLIP_FOLDER}${clipName(text)}.mp3`
}

function phrasesForWord(entry) {
  return [entry.word, entry.sentence, findThe(entry.word)]
}

function firstPhraseOfEachClip(phrases) {
  const byClip = new Map()
  for (const text of phrases) {
    const name = clipName(text)
    if (name && !byClip.has(name)) byClip.set(name, text)
  }
  return [...byClip.values()]
}

export function spokenPhrases(words) {
  return firstPhraseOfEachClip([...FIXED_PHRASES, ...words.flatMap(phrasesForWord)].filter(Boolean))
}
