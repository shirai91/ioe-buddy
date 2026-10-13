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

export const FEW_PICTURES_STARS = 100
export const FEW_PICTURES_CHANCE = 0.3
export const NO_PICTURE_STARS = 200

function between(start, end, progress) {
  return start + (end - start) * progress
}

export function pictureChance(stars) {
  if (stars >= NO_PICTURE_STARS) return 0
  if (stars >= FEW_PICTURES_STARS) {
    return between(FEW_PICTURES_CHANCE, 0, (stars - FEW_PICTURES_STARS) / (NO_PICTURE_STARS - FEW_PICTURES_STARS))
  }
  return between(1, FEW_PICTURES_CHANCE, Math.max(stars, 0) / FEW_PICTURES_STARS)
}

export function unlockedWordCount(stars) {
  return STARTING_WORDS + Math.floor(stars / STARS_PER_NEW_WORD)
}
