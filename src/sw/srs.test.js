import { describe, expect, it } from 'vitest'
import { MILLISECONDS_PER_DAY, isRating, nextReview } from './srs.js'

const NOW = new Date(2026, 9, 13, 9).getTime()

function daysLater(days, from = NOW) {
  return from + days * MILLISECONDS_PER_DAY
}

function easyOnEachDay(days) {
  let card
  for (let day = 0; day < days; day += 1) card = nextReview(card, 'easy', daysLater(day * 40))
  return card
}

describe('nextReview', () => {
  it('fills the progress fields on the first rating', () => {
    expect(nextReview(undefined, 'easy', NOW)).toEqual({
      rating: 'easy',
      box: 1,
      dueAt: daysLater(1),
      reviewedAt: NOW,
      introducedAt: NOW,
      promotedOn: '2026-10-13',
      seen: 1,
      lapses: 0,
    })
  })

  it('keeps introducedAt and counts every rating as seen', () => {
    const first = nextReview(undefined, 'medium', NOW)
    const second = nextReview(first, 'hard', daysLater(2))
    expect(second).toMatchObject({ introducedAt: NOW, reviewedAt: daysLater(2), seen: 2 })
  })

  it('sends a hard card to box 0, due now, and counts a lapse only from box 2 or more', () => {
    expect(nextReview({ box: 3, lapses: 1 }, 'hard', NOW)).toMatchObject({ rating: 'hard', box: 0, dueAt: NOW, lapses: 2 })
    expect(nextReview({ box: 2 }, 'hard', NOW)).toMatchObject({ lapses: 1 })
    expect(nextReview({ box: 1, lapses: 0 }, 'hard', NOW)).toMatchObject({ box: 0, lapses: 0 })
    expect(nextReview(undefined, 'hard', NOW)).toMatchObject({ box: 0, lapses: 0 })
  })

  it('keeps the box on medium, puts a new word in box 1, and makes it due in one day', () => {
    expect(nextReview({ box: 3 }, 'medium', NOW)).toMatchObject({ box: 3, dueAt: daysLater(1) })
    expect(nextReview({ box: 0, rating: 'hard' }, 'medium', NOW)).toMatchObject({ box: 0, dueAt: daysLater(1) })
    expect(nextReview(undefined, 'medium', NOW)).toMatchObject({ box: 1, dueAt: daysLater(1) })
  })

  it('moves an easy card up one box with 1, 3, 7, 14 and 30 day intervals, up to box 5', () => {
    const gaps = []
    let card
    for (let day = 0; day < 6; day += 1) {
      const reviewedAt = daysLater(day * 40)
      card = nextReview(card, 'easy', reviewedAt)
      gaps.push((card.dueAt - reviewedAt) / MILLISECONDS_PER_DAY)
    }
    expect(gaps).toEqual([1, 3, 7, 14, 30, 30])
    expect(card.box).toBe(5)
    expect(easyOnEachDay(3).box).toBe(3)
  })

  it('promotes only once per calendar day', () => {
    const morning = nextReview({ box: 2, dueAt: NOW - 1, promotedOn: '2026-10-12' }, 'easy', NOW)
    expect(morning).toMatchObject({ box: 3, dueAt: daysLater(7), promotedOn: '2026-10-13' })

    const evening = nextReview(morning, 'easy', new Date(2026, 9, 13, 21).getTime())
    expect(evening).toMatchObject({ box: 3, dueAt: daysLater(7), seen: morning.seen + 1 })

    const nextMorning = nextReview(evening, 'easy', new Date(2026, 9, 14, 7).getTime())
    expect(nextMorning).toMatchObject({ box: 4, promotedOn: '2026-10-14' })
  })

  it('accepts only the three ratings', () => {
    expect(['easy', 'medium', 'hard'].every(isRating)).toBe(true)
    expect(isRating('great')).toBe(false)
    expect(isRating(undefined)).toBe(false)
  })
})
