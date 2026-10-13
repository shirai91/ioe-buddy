import { distinctWords, fillerCandidates, preferWithImages, shuffle, toChoice, wordKey, wordSequence } from './wordTools.js'

export const OPTIONS_PER_QUESTION = 4

function buildQuestion({ answer, number, words, allWords, random }) {
  const distractors = fillerCandidates({ words, allWords, excludedKeys: new Set([wordKey(answer)]), random })
  const options = shuffle([answer, ...distractors.slice(0, OPTIONS_PER_QUESTION - 1)], random)
  return {
    id: `picture-pick-${number}`,
    answerId: answer.id,
    word: answer.word,
    options: options.map(toChoice),
  }
}

export function generate({ words = [], allWords = [], count = 10, random = Math.random }) {
  const answerPool = preferWithImages(distinctWords(words), 2)
  const answers = wordSequence(answerPool, count, random)
  return answers.map((answer, index) => buildQuestion({ answer, number: index + 1, words, allWords, random }))
}
