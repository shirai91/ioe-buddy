import { askBlank, COUNT_AFTER, COUNT_BEFORE, COUNT_RANGE, countPhrase, countSentence } from '../../lib/clips.js'
import { hasGamePicture, shuffle, toChoice, wordKey } from './wordTools.js'

const MINIMUM_OPEN_CHOICES = 2
export const COUNT_SHARE = 0.2
export const COUNT_NUMBER_WORD_IDS = ['two', 'three', 'four']

function openChoices(choices, words) {
  const seenWordIds = new Set(words.map((word) => word.id))
  const open = choices.filter((choice) => seenWordIds.has(choice.wordId))
  return open.length >= MINIMUM_OPEN_CHOICES ? open : choices
}

function choiceSequence(pool, count, random) {
  const sequence = []
  while (sequence.length < count && pool.length > 0) {
    const pass = shuffle(pool, random)
    const repeatsPrevious = sequence.length > 0 && pass[0].id === sequence.at(-1).id
    if (repeatsPrevious && pass.length > 1) pass.push(pass.shift())
    sequence.push(...pass)
  }
  return sequence.slice(0, count)
}

function picturesByText(allWords) {
  const byText = new Map()
  for (const word of allWords.filter(hasGamePicture)) {
    if (!byText.has(wordKey(word))) byText.set(wordKey(word), toChoice(word))
  }
  return byText
}

function toOption(text, pictureByText) {
  return { text, picture: pictureByText.get(text.toLowerCase()) ?? null }
}

function openCountWords(countWords, words) {
  const seenWordIds = new Set(words.map((word) => word.id))
  const knowsNumbers = COUNT_NUMBER_WORD_IDS.every((id) => seenWordIds.has(id))
  return knowsNumbers ? countWords.filter((countWord) => seenWordIds.has(countWord.wordId)) : []
}

function countChoice(countWord, pictureByText, random) {
  const number = COUNT_RANGE[Math.floor(random() * COUNT_RANGE.length)]
  return {
    before: COUNT_BEFORE,
    after: COUNT_AFTER,
    answer: countPhrase(countWord, number),
    options: COUNT_RANGE.map((option) => ({ text: countPhrase(countWord, option), picture: null })),
    sentence: countSentence(countWord, number),
    prompt: askBlank({ before: COUNT_BEFORE, after: COUNT_AFTER }),
    count: { number, picture: pictureByText.get(countWord.word.toLowerCase()) ?? null },
  }
}

function plainChoice(choice, pictureByText, random) {
  return {
    before: choice.before,
    after: choice.after,
    answer: choice.answer,
    options: shuffle([choice.answer, ...choice.wrong], random).map((text) => toOption(text, pictureByText)),
    sentence: choice.sentence,
    prompt: askBlank(choice),
    count: null,
  }
}

function countQuestions(countWords, words, slots, pictureByText, random) {
  const open = shuffle(openCountWords(countWords, words), random).slice(0, slots)
  return open.map((countWord) => countChoice(countWord, pictureByText, random))
}

function insertAtRandomPlaces(sequence, extras, random) {
  const mixed = sequence.slice()
  for (const extra of extras) mixed.splice(Math.floor(random() * (mixed.length + 1)), 0, extra)
  return mixed
}

export async function generate({
  words = [],
  allWords = [],
  count = 10,
  random = Math.random,
  loadSentenceChoices,
  loadCountWords = async () => [],
}) {
  const [choices, countWords] = await Promise.all([loadSentenceChoices(), loadCountWords()])
  const pictureByText = picturesByText(allWords)
  const counted = countQuestions(countWords, words, Math.round(count * COUNT_SHARE), pictureByText, random)
  const plain = choiceSequence(openChoices(choices, words), count - counted.length, random).map((choice) =>
    plainChoice(choice, pictureByText, random),
  )
  const mixed = plain.length > 0 ? insertAtRandomPlaces(plain, counted, random) : []
  return mixed.map((question, index) => ({ id: `sentence-pick-${index + 1}`, ...question }))
}
