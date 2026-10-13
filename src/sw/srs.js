import { localDateKey } from './calendar.js'

export const RATINGS = ['easy', 'medium', 'hard']
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
export const INTERVAL_DAYS_BY_BOX = [0, 1, 3, 7, 14, 30]
export const TOP_BOX = INTERVAL_DAYS_BY_BOX.length - 1
const BOX_FOR_FIRST_MEDIUM = 1
const LOWEST_BOX_THAT_CAN_LAPSE = 2
const MEDIUM_INTERVAL_DAYS = 1

export function isRating(value) {
  return RATINGS.includes(value)
}

function daysFrom(now, days) {
  return now + days * MILLISECONDS_PER_DAY
}

function sharedReviewFields(previous, rating, now) {
  return {
    rating,
    reviewedAt: now,
    introducedAt: previous?.introducedAt ?? previous?.reviewedAt ?? now,
    seen: (previous?.seen ?? 0) + 1,
    lapses: previous?.lapses ?? 0,
    promotedOn: previous?.promotedOn ?? null,
  }
}

function reviewHard(reviewed, box, now) {
  const lapses = box >= LOWEST_BOX_THAT_CAN_LAPSE ? reviewed.lapses + 1 : reviewed.lapses
  return { ...reviewed, box: 0, dueAt: now, lapses }
}

function reviewMedium(reviewed, previous, now) {
  const box = previous ? (previous.box ?? 0) : BOX_FOR_FIRST_MEDIUM
  return { ...reviewed, box, dueAt: daysFrom(now, MEDIUM_INTERVAL_DAYS) }
}

function reviewEasy(reviewed, previous, now) {
  const today = localDateKey(now)
  const box = previous?.box ?? 0
  if (reviewed.promotedOn === today) return { ...reviewed, box, dueAt: previous.dueAt }
  const promotedBox = Math.min(box + 1, TOP_BOX)
  return { ...reviewed, box: promotedBox, dueAt: daysFrom(now, INTERVAL_DAYS_BY_BOX[promotedBox]), promotedOn: today }
}

export function nextReview(previous, rating, now = Date.now()) {
  const reviewed = sharedReviewFields(previous, rating, now)
  if (rating === 'hard') return reviewHard(reviewed, previous?.box ?? 0, now)
  if (rating === 'medium') return reviewMedium(reviewed, previous, now)
  return reviewEasy(reviewed, previous, now)
}
