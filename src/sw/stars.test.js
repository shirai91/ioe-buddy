import { describe, expect, it } from 'vitest'
import { pictureChance, STARTING_WORDS, starChange, starsAfterExam, unlockedWordCount } from './stars.js'

describe('starChange', () => {
  it('gives +5 for all right, 0 for half right and -5 for none right', () => {
    expect(starChange(10, 10)).toBe(5)
    expect(starChange(5, 10)).toBe(0)
    expect(starChange(0, 10)).toBe(-5)
  })

  it('scales with the number of right answers', () => {
    expect([...Array(11).keys()].map((correct) => starChange(correct, 10))).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5])
    expect(starChange(6, 6)).toBe(5)
    expect(starChange(4, 6)).toBe(2)
  })

  it('gives no change for an empty game', () => {
    expect(starChange(0, 0)).toBe(0)
  })
})

describe('starsAfterExam', () => {
  it('adds the change and never goes below 0', () => {
    expect(starsAfterExam(10, 9, 10)).toBe(14)
    expect(starsAfterExam(10, 2, 10)).toBe(7)
    expect(starsAfterExam(2, 0, 10)).toBe(0)
  })
})

describe('unlockedWordCount', () => {
  it('starts with the first words and opens one more word for each 2 stars', () => {
    expect(unlockedWordCount(0)).toBe(STARTING_WORDS)
    expect(unlockedWordCount(1)).toBe(STARTING_WORDS)
    expect(unlockedWordCount(2)).toBe(STARTING_WORDS + 1)
    expect(unlockedWordCount(68)).toBe(STARTING_WORDS + 34)
  })
})

describe('pictureChance', () => {
  it('shows every picture at 0 stars, 30% at 100 stars and none from 200 stars', () => {
    expect(pictureChance(0)).toBe(1)
    expect(pictureChance(100)).toBeCloseTo(0.3)
    expect(pictureChance(200)).toBe(0)
    expect(pictureChance(350)).toBe(0)
  })

  it('goes down in a straight line between those points', () => {
    expect(pictureChance(50)).toBeCloseTo(0.65)
    expect(pictureChance(150)).toBeCloseTo(0.15)
  })
})
