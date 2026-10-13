const SINGLE_WORD = /^[a-z]+$/

export function shuffle(items, random = Math.random) {
  const shuffled = items.slice()
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const held = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = held
  }
  return shuffled
}

export function wordKey(word) {
  return word.word.trim().toLowerCase()
}

export function distinctWords(words) {
  const seenKeys = new Set()
  return words.filter((word) => {
    const key = wordKey(word)
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })
}

export function hasGamePicture(word) {
  return Boolean(word.image) && !word.sight
}

export function preferWithImages(words, minimum) {
  const withImages = words.filter(hasGamePicture)
  return withImages.length >= minimum ? withImages : words
}

export function toChoice(word) {
  return { id: word.id, word: word.word, letter: word.letter ?? null, image: word.image ?? null }
}

export function fillerCandidates({ words, allWords, excludedKeys, random = Math.random }) {
  const isFree = (word) => !excludedKeys.has(wordKey(word))
  const unitWords = distinctWords(words).filter(isFree)
  const otherWords = distinctWords(allWords).filter(isFree)
  const ranked = [
    ...shuffle(unitWords.filter(hasGamePicture), random),
    ...shuffle(otherWords.filter(hasGamePicture), random),
    ...shuffle(unitWords.filter((word) => !hasGamePicture(word)), random),
    ...shuffle(otherWords.filter((word) => !hasGamePicture(word)), random),
  ]
  return distinctWords(ranked)
}

export function wordSequence(pool, count, random = Math.random) {
  const sequence = []
  while (sequence.length < count && pool.length > 0) {
    const pass = shuffle(pool, random)
    const repeatsPrevious = sequence.length > 0 && wordKey(pass[0]) === wordKey(sequence.at(-1))
    if (repeatsPrevious && pass.length > 1) pass.push(pass.shift())
    sequence.push(...pass)
  }
  return sequence.slice(0, count)
}

export function playableWords(words = []) {
  const byText = new Map()
  for (const entry of words) {
    const text = entry?.word?.trim().toLowerCase()
    if (text && SINGLE_WORD.test(text) && !byText.has(text)) byText.set(text, { ...entry, word: text })
  }
  return [...byText.values()]
}
