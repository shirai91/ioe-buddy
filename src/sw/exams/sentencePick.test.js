import { describe, expect, it } from 'vitest'
import { generate } from './sentencePick.js'

function word(id, { image = `content/images/${id}.png`, sight } = {}) {
  return { id, word: id, letter: id[0].toUpperCase() + id[0], image, ...(sight && { sight }) }
}

function choice(wordId, answer, wrong, before = 'I have a ', after = '.') {
  return { id: `${wordId}-${answer}`, before, after, answer, wrong, wordId, unit: 1, sentence: `${before}${answer}${after}` }
}

const allWords = [word('car'), word('cat'), word('dog'), word('like', { sight: true }), word('in', { image: null, sight: true })]
const choices = [
  choice('car', 'car', ['cat', 'cup', 'cake']),
  choice('cat', 'cat', ['car', 'cup', 'cake']),
  choice('dog', 'a', ['an', 'I', 'is'], 'This is ', ' dog.'),
  choice('like', 'like', ['is', 'are', 'a'], 'I ', ' milk.'),
  choice('in', 'an', ['a', 'two', 'is'], "There's ", ' apple in the bag.'),
]
const loadSentenceChoices = async () => choices

function sequence(values) {
  let position = 0
  return () => values[position++ % values.length]
}

describe('sentence pick generator', () => {
  it('returns the asked number of questions with plain data', async () => {
    const questions = await generate({ words: allWords, allWords, count: 10, loadSentenceChoices })

    expect(questions).toHaveLength(10)
    expect(JSON.parse(JSON.stringify(questions))).toEqual(questions)
    expect(questions[0]).toEqual({
      id: 'sentence-pick-1',
      before: expect.any(String),
      after: expect.any(String),
      answer: expect.any(String),
      options: expect.any(Array),
      sentence: expect.any(String),
      prompt: expect.stringContaining('... what?'),
    })
  })

  it('gives four different options with the answer once', async () => {
    const questions = await generate({ words: allWords, allWords, count: 10, loadSentenceChoices })

    for (const question of questions) {
      const texts = question.options.map((option) => option.text)
      expect(new Set(texts).size).toBe(4)
      expect(texts.filter((text) => text === question.answer)).toHaveLength(1)
      expect(`${question.before}${question.answer}${question.after}`).toBe(question.sentence)
    }
  })

  it('asks only sentences whose word the learner has seen', async () => {
    const words = [word('car'), word('cat')]

    const questions = await generate({ words, allWords, count: 10, loadSentenceChoices })

    expect(new Set(questions.map((question) => question.answer))).toEqual(new Set(['car', 'cat']))
  })

  it('uses all sentences when too few are open', async () => {
    const questions = await generate({ words: [word('car')], allWords, count: 10, random: sequence([0.1, 0.5, 0.9]), loadSentenceChoices })

    expect(new Set(questions.map((question) => question.answer)).size).toBeGreaterThan(1)
  })

  it('never asks the same sentence two times in a row', async () => {
    const questions = await generate({ words: [word('car'), word('cat')], allWords, count: 10, loadSentenceChoices })

    for (let index = 1; index < questions.length; index++) expect(questions[index].sentence).not.toBe(questions[index - 1].sentence)
  })

  it('gives each option the picture of its word when the game can use it', async () => {
    const questions = await generate({ words: allWords, allWords, count: 20, loadSentenceChoices })
    const question = questions.find((entry) => entry.sentence === 'I have a car.')
    const pictureOf = (text) => question.options.find((option) => option.text === text).picture

    expect(pictureOf('car')).toEqual({ id: 'car', word: 'car', letter: 'Cc', image: 'content/images/car.png' })
    expect(pictureOf('cat')).toEqual({ id: 'cat', word: 'cat', letter: 'Cc', image: 'content/images/cat.png' })
    expect(pictureOf('cup')).toBeNull()
  })

  it('asks the sentence with the blank as a spoken prompt', async () => {
    const questions = await generate({ words: allWords, allWords, count: 20, loadSentenceChoices })
    const promptOf = (sentence) => questions.find((question) => question.sentence === sentence).prompt

    expect(promptOf('I have a car.')).toBe('I have a ... what?')
    expect(promptOf('This is a dog.')).toBe('This is ... what? dog.')
  })

  it('gives no questions when there are no sentence choices', async () => {
    expect(await generate({ words: allWords, allWords, count: 10, loadSentenceChoices: async () => [] })).toEqual([])
  })
})
