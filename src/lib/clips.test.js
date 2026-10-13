import { describe, expect, it } from 'vitest'
import { CHEERS } from './cheers.js'
import { askBlank, clipName, clipPath, countPhrase, countSentence, findThe, spokenPhrases } from './clips.js'

describe('clipName', () => {
  it('makes one file name for each spoken text, without case or marks', () => {
    expect(clipName('Great job!')).toBe('great-job')
    expect(clipName("That's OK!")).toBe('that-s-ok')
    expect(clipPath('I see a ball.')).toBe('content/audio/i-see-a-ball.mp3')
  })
})

describe('askBlank', () => {
  it('puts "what?" in the blank and drops the end mark after it', () => {
    expect(askBlank({ before: 'I like ', after: '.' })).toBe('I like ... what?')
    expect(askBlank({ before: 'This is ', after: ' dog.' })).toBe('This is ... what? dog.')
    expect(askBlank({ before: '', after: ' is my hat.' })).toBe('... what? is my hat.')
  })
})

describe('countPhrase', () => {
  it('uses a or an for one and the number word with the plural for more', () => {
    expect(countPhrase({ word: 'book', plural: 'books' }, 1)).toBe('a book')
    expect(countPhrase({ word: 'apple', plural: 'apples' }, 1)).toBe('an apple')
    expect(countPhrase({ word: 'bus', plural: 'buses' }, 3)).toBe('three buses')
    expect(countSentence({ word: 'book', plural: 'books' }, 4)).toBe('I can see four books.')
  })
})

describe('spokenPhrases', () => {
  const words = [
    { word: 'ball', sentence: 'I see a ball.' },
    { word: 'I', sentence: 'I have a car.' },
  ]

  it('lists the fixed phrases, cheers, letters and the word, sentence and "find the" of each word', () => {
    const phrases = spokenPhrases(words)

    expect(phrases).toEqual(expect.arrayContaining(['Try again', 'Great job!', ...CHEERS.easy, 'a', 'z', 'ball', 'I see a ball.', findThe('ball')]))
  })

  it('lists the full sentence and the question of each sentence choice', () => {
    const phrases = spokenPhrases(words, [{ before: 'How many ', after: '?', sentence: 'How many pots?' }])

    expect(phrases).toEqual(expect.arrayContaining(['How many pots?', 'How many ... what?']))
  })

  it('lists the four count sentences and the count question of each count word', () => {
    const phrases = spokenPhrases(words, [], [{ word: 'book', plural: 'books' }])

    expect(phrases).toEqual(
      expect.arrayContaining(['I can see a book.', 'I can see two books.', 'I can see three books.', 'I can see four books.', 'I can see ... what?']),
    )
  })

  it('lists each clip only one time', () => {
    const names = spokenPhrases(words).map(clipName)

    expect(new Set(names).size).toBe(names.length)
    expect(names.filter((name) => name === 'i')).toHaveLength(1)
  })
})
