import { CHEERS } from './cheers.js'

export const CLIP_FOLDER = 'content/audio/'
export const TRY_AGAIN = 'Try again'
export const GREAT_JOB = 'Great job!'
const LETTERS = [...'abcdefghijklmnopqrstuvwxyz']
const FIXED_PHRASES = [TRY_AGAIN, GREAT_JOB, ...Object.values(CHEERS).flat(), ...LETTERS]

export function findThe(word) {
  return `Find the ${word}`
}

const COUNT_NUMBERS = ['one', 'two', 'three', 'four']
export const COUNT_RANGE = [1, 2, 3, 4]
export const COUNT_BEFORE = 'I can see '
export const COUNT_AFTER = '.'

export function countPhrase({ word, plural }, number) {
  if (number > 1) return `${COUNT_NUMBERS[number - 1]} ${plural}`
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`
}

export function countSentence(countWord, number) {
  return `${COUNT_BEFORE}${countPhrase(countWord, number)}${COUNT_AFTER}`
}

export function askBlank({ before, after }) {
  const endsAtBlank = /^[.!?]*$/.test(after.trim())
  return `${before}... what?${endsAtBlank ? '' : after}`
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

export function spokenPhrases(words, sentenceChoices = [], countWords = []) {
  const choiceSentences = sentenceChoices.flatMap((choice) => [choice.sentence, askBlank(choice)])
  const countSentences = countWords.flatMap((countWord) => [
    ...COUNT_RANGE.map((number) => countSentence(countWord, number)),
    askBlank({ before: COUNT_BEFORE, after: COUNT_AFTER }),
  ])
  return firstPhraseOfEachClip([...FIXED_PHRASES, ...words.flatMap(phrasesForWord), ...choiceSentences, ...countSentences].filter(Boolean))
}
