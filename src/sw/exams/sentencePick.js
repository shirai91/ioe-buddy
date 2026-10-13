import { askBlank } from '../../lib/clips.js'
import { hasGamePicture, shuffle, toChoice, wordKey } from './wordTools.js'

const MINIMUM_OPEN_CHOICES = 2

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

function toQuestion(choice, number, pictureByText, random) {
  return {
    id: `sentence-pick-${number}`,
    before: choice.before,
    after: choice.after,
    answer: choice.answer,
    options: shuffle([choice.answer, ...choice.wrong], random).map((text) => toOption(text, pictureByText)),
    sentence: choice.sentence,
    prompt: askBlank(choice),
  }
}

export async function generate({ words = [], allWords = [], count = 10, random = Math.random, loadSentenceChoices }) {
  const choices = await loadSentenceChoices()
  const pictureByText = picturesByText(allWords)
  const sequence = choiceSequence(openChoices(choices, words), count, random)
  return sequence.map((choice, index) => toQuestion(choice, index + 1, pictureByText, random))
}
