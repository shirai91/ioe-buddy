import { describe, expect, it } from 'vitest'
import { COUNT_NUMBER_WORD_IDS, generate } from './sentencePick.js'

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
      count: null,
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

describe('sentence pick count questions', () => {
  const numberWords = COUNT_NUMBER_WORD_IDS.map((id) => word(id))
  const countWords = [
    { wordId: 'car', word: 'car', plural: 'cars', unit: 2 },
    { wordId: 'cat', word: 'cat', plural: 'cats', unit: 2 },
    { wordId: 'dog', word: 'dog', plural: 'dogs', unit: 3 },
  ]
  const loadCountWords = async () => countWords
  const seen = [...allWords, ...numberWords]
  const isCount = (question) => question.count !== null

  it('makes 2 of 10 questions count questions when the learner knows the numbers and the words', async () => {
    const questions = await generate({ words: seen, allWords: seen, count: 10, loadSentenceChoices, loadCountWords })

    expect(questions).toHaveLength(10)
    expect(questions.filter(isCount)).toHaveLength(2)
    expect(questions.map((question) => question.id)).toEqual(questions.map((_, index) => `sentence-pick-${index + 1}`))
  })

  it('gives a picture, a number from 1 to 4 and the four counts in order', async () => {
    const questions = await generate({ words: seen, allWords: seen, count: 10, loadSentenceChoices, loadCountWords })

    for (const question of questions.filter(isCount)) {
      const { number, picture } = question.count
      const noun = picture.word
      expect([1, 2, 3, 4]).toContain(number)
      expect(question.options).toEqual([
        { text: `a ${noun}`, picture: null },
        { text: `two ${noun}s`, picture: null },
        { text: `three ${noun}s`, picture: null },
        { text: `four ${noun}s`, picture: null },
      ])
      expect(question.answer).toBe(question.options[number - 1].text)
      expect(question.sentence).toBe(`I can see ${question.answer}.`)
      expect(question.prompt).toBe('I can see ... what?')
    }
  })

  it('never uses the same count word two times in one game', async () => {
    const questions = await generate({ words: seen, allWords: seen, count: 10, loadSentenceChoices, loadCountWords })
    const nouns = questions.filter(isCount).map((question) => question.count.picture.word)

    expect(new Set(nouns).size).toBe(nouns.length)
  })

  it('asks no count questions before the learner sees two, three and four', async () => {
    const questions = await generate({ words: allWords, allWords: seen, count: 10, loadSentenceChoices, loadCountWords })

    expect(questions.filter(isCount)).toHaveLength(0)
    expect(questions).toHaveLength(10)
  })

  it('asks only count words the learner has seen', async () => {
    const words = [word('car'), word('cat'), ...numberWords]

    const questions = await generate({ words, allWords: seen, count: 10, loadSentenceChoices, loadCountWords })

    expect(questions.filter(isCount).map((question) => question.count.picture.word).sort()).toEqual(['car', 'cat'])
  })
})
