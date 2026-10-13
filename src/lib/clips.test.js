import { describe, expect, it } from 'vitest'
import { CHEERS } from './cheers.js'
import { clipName, clipPath, findThe, spokenPhrases } from './clips.js'

describe('clipName', () => {
  it('makes one file name for each spoken text, without case or marks', () => {
    expect(clipName('Great job!')).toBe('great-job')
    expect(clipName("That's OK!")).toBe('that-s-ok')
    expect(clipPath('I see a ball.')).toBe('content/audio/i-see-a-ball.mp3')
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

  it('lists each clip only one time', () => {
    const names = spokenPhrases(words).map(clipName)

    expect(new Set(names).size).toBe(names.length)
    expect(names.filter((name) => name === 'i')).toHaveLength(1)
  })
})
