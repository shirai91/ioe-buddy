import { describe, expect, it } from 'vitest'
import { CHEERS, pickCheer } from './cheers.js'

describe('pickCheer', () => {
  it('has 5 to 10 cheers for each rating', () => {
    for (const level of ['easy', 'medium', 'hard']) {
      expect(CHEERS[level].length).toBeGreaterThanOrEqual(5)
      expect(CHEERS[level].length).toBeLessThanOrEqual(10)
    }
  })

  it('picks a cheer for the rating', () => {
    expect(pickCheer('easy', undefined, () => 0)).toBe('Super!')
    expect(CHEERS.medium).toContain(pickCheer('medium', undefined, () => 0.99))
  })

  it('never says the same cheer twice in a row', () => {
    for (const previous of CHEERS.hard) {
      for (const roll of [0, 0.3, 0.6, 0.99]) {
        expect(pickCheer('hard', previous, () => roll)).not.toBe(previous)
      }
    }
  })
})
