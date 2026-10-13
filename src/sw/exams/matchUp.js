import { distinctWords, fillerCandidates, preferWithImages, shuffle, toChoice, wordKey } from './wordTools.js'

export const PAIRS_PER_ROUND = 4

function createWordQueue(pool, random) {
  const queue = []
  return function takeWord(excludedKeys) {
    const isFree = (word) => !excludedKeys.has(wordKey(word))
    if (!queue.some(isFree)) queue.push(...shuffle(pool, random))
    const index = queue.findIndex(isFree)
    return index < 0 ? null : queue.splice(index, 1)[0]
  }
}

function pickRoundWords({ takeUnitWord, words, allWords, random }) {
  const picked = []
  const pickedKeys = new Set()
  const add = (word) => {
    picked.push(word)
    pickedKeys.add(wordKey(word))
  }
  while (picked.length < PAIRS_PER_ROUND) {
    const word = takeUnitWord(pickedKeys)
    if (!word) break
    add(word)
  }
  const fillers = fillerCandidates({ words, allWords, excludedKeys: pickedKeys, random })
  fillers.slice(0, PAIRS_PER_ROUND - picked.length).forEach(add)
  return picked
}

function sameOrder(first, second) {
  return first.length === second.length && first.every((choice, index) => choice.id === second[index].id)
}

function shuffleAwayFrom(choices, previous, random) {
  const shuffled = shuffle(choices, random)
  if (!previous || choices.length < 2 || !sameOrder(shuffled, previous)) return shuffled
  return [...shuffled.slice(1), shuffled[0]]
}

export function generate({ words = [], allWords = [], count = 10, random = Math.random }) {
  const unitPool = preferWithImages(distinctWords(words), PAIRS_PER_ROUND)
  const takeUnitWord = createWordQueue(unitPool, random)
  const rounds = []
  for (let number = 1; number <= count; number++) {
    const choices = pickRoundWords({ takeUnitWord, words, allWords, random }).map(toChoice)
    if (choices.length === 0) break
    const previous = rounds.at(-1)
    rounds.push({
      id: `match-up-${number}`,
      words: shuffleAwayFrom(choices, previous?.words, random),
      pictures: shuffleAwayFrom(choices, previous?.pictures, random),
    })
  }
  return rounds
}
