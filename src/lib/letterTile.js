export const LETTER_TILE_COLORS = ['#FF9C8F', '#FFC48A', '#9FD8FF', '#B7A6FF', '#7ED957', '#FFCE3A']

export function letterTileColor(text = '') {
  const sum = [...text].reduce((total, character) => total + character.codePointAt(0), 0)
  return LETTER_TILE_COLORS[sum % LETTER_TILE_COLORS.length]
}

export function letterFor(word) {
  if (word?.letter) return word.letter
  const first = word?.word?.trim()?.[0] ?? '?'
  return first.toUpperCase() + first.toLowerCase()
}
