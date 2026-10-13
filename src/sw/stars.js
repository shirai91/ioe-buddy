export const MAX_STAR_CHANGE = 5
export const STARTING_WORDS = 5
export const STARS_PER_NEW_WORD = 2

export function starChange(correct, total) {
  if (total === 0) return 0
  return Math.round((2 * MAX_STAR_CHANGE * correct) / total) - MAX_STAR_CHANGE
}

export function starsAfterExam(stars, correct, total) {
  return Math.max(0, stars + starChange(correct, total))
}

export function unlockedWordCount(stars) {
  return STARTING_WORDS + Math.floor(stars / STARS_PER_NEW_WORD)
}
