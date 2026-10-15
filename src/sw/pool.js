import { MILLISECONDS_PER_DAY, TOP_BOX } from './srs.js'

export const SESSION_SIZE = 10
export const MAX_NEW_PER_SESSION = 4
export const MAX_TRICKY_PER_SESSION = 4
export const MAX_WEAK_WORDS = 8
export const MIN_RECALL_GAP = 3
export const NEW_CARD_SHARE_OF_SESSION = 0.6
export const EXAM_POOL_MINIMUM = 6
export const WORD_OF_THE_DAY_UNSEEN_PREVIEW = 3
const SLOTS_PER_NEW_WORD = 2
const MIN_REPEAT_GAP = 1
const WARMUP_AGE_SCALE_DAYS = 7
const KNOWN_KINDS = new Set(['due', 'warmup'])

function byRank(first, second) {
  return first.rank - second.rank
}

function sortedByRank(words) {
  return [...words].sort(byRank)
}

function boxOf(progress) {
  return progress?.box ?? 0
}

export function isTricky(progress) {
  return progress?.rating === 'hard'
}

export function cardState(progress, now = Date.now()) {
  if (!progress) return 'new'
  if (isTricky(progress)) return 'tricky'
  if (progress.dueAt <= now) return 'due'
  if (boxOf(progress) <= 1) return 'learning'
  return 'resting'
}

export function isWeak(progress, now = Date.now()) {
  if (!progress) return false
  return isTricky(progress) || (boxOf(progress) <= 1 && progress.dueAt <= now)
}

function weakWordCount(words, progressByWordId, now) {
  return words.filter((word) => isWeak(progressByWordId.get(word.id), now)).length
}

function newWordLimit({ words, progressByWordId, now }) {
  return Math.max(0, MAX_WEAK_WORDS - weakWordCount(words, progressByWordId, now))
}

function groupWordsByState(words, progressByWordId, now) {
  const groups = { new: [], tricky: [], due: [], learning: [], resting: [] }
  for (const word of sortedByRank(words)) groups[cardState(progressByWordId.get(word.id), now)].push(word)
  return groups
}

function oldestReviewFirst(progressOf) {
  return (first, second) => (progressOf(first).reviewedAt ?? 0) - (progressOf(second).reviewedAt ?? 0)
}

function duePriority(progressOf) {
  return (first, second) =>
    boxOf(progressOf(first)) - boxOf(progressOf(second)) ||
    progressOf(first).dueAt - progressOf(second).dueAt ||
    byRank(first, second)
}

export function warmupWeight(progress, now = Date.now()) {
  const daysSinceReviewed = Math.max(0, (now - (progress?.reviewedAt ?? now)) / MILLISECONDS_PER_DAY)
  return (TOP_BOX + 1 - boxOf(progress)) * (1 + daysSinceReviewed / WARMUP_AGE_SCALE_DAYS)
}

function weightedPicks(candidates, count, weightOf, random) {
  const left = candidates.map((item) => ({ item, weight: weightOf(item) }))
  const picks = []
  while (picks.length < count && left.length > 0) {
    const totalWeight = left.reduce((sum, entry) => sum + entry.weight, 0)
    let target = random() * totalWeight
    let pickedIndex = left.findIndex((entry) => {
      target -= entry.weight
      return target < 0
    })
    if (pickedIndex === -1) pickedIndex = left.length - 1
    picks.push(left.splice(pickedIndex, 1)[0].item)
  }
  return picks
}

function createSessionPlan() {
  const cards = []
  const cardCountByWordId = new Map()

  function add(word, kind, follows = null, minGap = 0) {
    const occurrence = (cardCountByWordId.get(word.id) ?? 0) + 1
    cardCountByWordId.set(word.id, occurrence)
    const card = { word, kind, key: `${word.id}:${occurrence}`, follows, minGap, planIndex: cards.length }
    cards.push(card)
    return card
  }

  return {
    cards,
    add,
    freeSlots: () => SESSION_SIZE - cards.length,
    includes: (word) => cardCountByWordId.has(word.id),
    cardCount: (word) => cardCountByWordId.get(word.id) ?? 0,
  }
}

function addNewWords(plan, unseenWords, count) {
  const introduced = unseenWords.splice(0, count)
  for (const word of introduced) {
    const newCard = plan.add(word, 'new')
    plan.add(word, 'recall', newCard.key, MIN_RECALL_GAP)
  }
  return introduced.length
}

function topUpNewWords(plan, unseenWords, allowedCount) {
  let added = 0
  while (plan.freeSlots() > 0 && unseenWords.length > 0 && added < allowedCount) {
    const word = unseenWords.shift()
    const newCard = plan.add(word, 'new')
    if (plan.freeSlots() > 0) plan.add(word, 'recall', newCard.key, MIN_RECALL_GAP)
    added += 1
  }
}

function addRepeats(plan) {
  const singleCards = plan.cards.filter((card) => plan.cardCount(card.word) === 1)
  const trickyFirst = [...singleCards.filter((card) => card.kind === 'tricky'), ...singleCards.filter((card) => card.kind !== 'tricky')]
  for (const card of trickyFirst.slice(0, plan.freeSlots())) plan.add(card.word, 'repeat', card.key, MIN_REPEAT_GAP)
}

function selectSessionCards({ words, progressByWordId, now, random }) {
  const progressOf = (word) => progressByWordId.get(word.id)
  const groups = groupWordsByState(words, progressByWordId, now)
  const unseenWords = [...groups.new]
  const totalNewLimit = newWordLimit({ words, progressByWordId, now })
  const sessionNewLimit = Math.min(MAX_NEW_PER_SESSION, totalNewLimit)
  const plan = createSessionPlan()

  const trickyWords = [...groups.tricky].sort(oldestReviewFirst(progressOf)).slice(0, MAX_TRICKY_PER_SESSION)
  for (const word of trickyWords) plan.add(word, 'tricky')

  const reservedSlots = sessionNewLimit > 0 && unseenWords.length > 0 ? SLOTS_PER_NEW_WORD : 0
  const dueWords = [...groups.due].sort(duePriority(progressOf)).slice(0, Math.max(0, plan.freeSlots() - reservedSlots))
  for (const word of dueWords) plan.add(word, 'due')

  const newWordCount = Math.min(sessionNewLimit, Math.floor(plan.freeSlots() / SLOTS_PER_NEW_WORD), unseenWords.length)
  const introducedCount = addNewWords(plan, unseenWords, newWordCount)

  const warmupCandidates = [...groups.due, ...groups.learning, ...groups.resting].filter((word) => !plan.includes(word))
  const warmupWords = weightedPicks(warmupCandidates, plan.freeSlots(), (word) => warmupWeight(progressOf(word), now), random)
  for (const word of warmupWords) plan.add(word, 'warmup')

  topUpNewWords(plan, unseenWords, totalNewLimit - introducedCount)
  addRepeats(plan)
  return plan.cards
}

function isKnownCard(card) {
  return KNOWN_KINDS.has(card.kind)
}

function spreadEvenly(cards, start, end, offset = 0) {
  cards.forEach((card, index) => {
    card.desiredSlot = start + ((index + offset) * (end - start)) / cards.length
  })
}

function assignDesiredSlots(cards, newCardWindowEnd) {
  const total = cards.length
  const knownCards = cards.filter(isKnownCard)
  const newCards = cards.filter((card) => card.kind === 'new')
  const firstNewSlot = knownCards.length > 0 ? 1 : 0
  spreadEvenly(knownCards, 0, total)
  spreadEvenly(newCards, firstNewSlot, newCardWindowEnd)
  spreadEvenly(cards.filter((card) => card.kind === 'tricky'), total / 4, (total * 3) / 4, 0.5)
  const cardByKey = new Map(cards.map((card) => [card.key, card]))
  for (const card of cards.filter((card) => card.kind === 'recall')) card.desiredSlot = cardByKey.get(card.follows).desiredSlot + MIN_RECALL_GAP + 1
  cards.filter((card) => card.kind === 'repeat').forEach((card, index) => {
    card.desiredSlot = total + index
  })
}

function earliestDesired(cards) {
  return cards.reduce((best, card) =>
    card.desiredSlot < best.desiredSlot || (card.desiredSlot === best.desiredSlot && card.planIndex < best.planIndex) ? card : best,
  )
}

function preferredCard({ candidates, position, previous, newCardsLeft, newCardWindowEnd }) {
  const newCandidates = candidates.filter((card) => card.kind === 'new')
  const knownCandidates = candidates.filter(isKnownCard)
  const calmCandidates = candidates.filter((card) => card.kind !== 'tricky')
  const isFirstCard = position === 0
  const newCardsMustCatchUp = newCardsLeft >= newCardWindowEnd - position
  if (isFirstCard && knownCandidates.length > 0) return earliestDesired(knownCandidates)
  if (newCardsMustCatchUp && newCandidates.length > 0) return earliestDesired(newCandidates)
  if (previous?.kind === 'tricky' && calmCandidates.length > 0) return earliestDesired(calmCandidates)
  return earliestDesired(candidates)
}

function chooseNextCard({ remaining, ordered, placedAtByKey, newCardWindowEnd }) {
  const position = ordered.length
  const previous = ordered.at(-1)
  const cardsBetween = (card) => position - placedAtByKey.get(card.follows) - 1
  const isUnlocked = (card) => card.follows === null || placedAtByKey.has(card.follows)
  const hasEnoughGap = (card) => card.follows === null || cardsBetween(card) >= card.minGap
  const differsFromPrevious = (card) => card.word.id !== previous?.word.id
  const unlocked = remaining.filter(isUnlocked)
  const comfortable = unlocked.filter((card) => hasEnoughGap(card) && differsFromPrevious(card))
  if (comfortable.length > 0) {
    const newCardsLeft = remaining.filter((card) => card.kind === 'new').length
    return preferredCard({ candidates: comfortable, position, previous, newCardsLeft, newCardWindowEnd })
  }
  const notBackToBack = unlocked.filter(differsFromPrevious)
  if (notBackToBack.length > 0) {
    const longestGap = Math.max(...notBackToBack.map(cardsBetween))
    return earliestDesired(notBackToBack.filter((card) => cardsBetween(card) === longestGap))
  }
  return earliestDesired(unlocked)
}

function arrangeCards(cards) {
  const newCardWindowEnd = Math.ceil(cards.length * NEW_CARD_SHARE_OF_SESSION)
  assignDesiredSlots(cards, newCardWindowEnd)
  const remaining = [...cards]
  const ordered = []
  const placedAtByKey = new Map()
  while (remaining.length > 0) {
    const next = chooseNextCard({ remaining, ordered, placedAtByKey, newCardWindowEnd })
    remaining.splice(remaining.indexOf(next), 1)
    placedAtByKey.set(next.key, ordered.length)
    ordered.push(next)
  }
  return ordered
}

export function buildSession({ words, progressByWordId = new Map(), now = Date.now(), random = Math.random }) {
  const cards = selectSessionCards({ words, progressByWordId, now, random })
  return arrangeCards(cards).map(({ word, key, kind }) => ({ ...word, key, kind, box: boxOf(progressByWordId.get(word.id)) }))
}

function strugglingFirst(progressOf) {
  return (first, second) =>
    Number(isTricky(progressOf(second))) - Number(isTricky(progressOf(first))) ||
    boxOf(progressOf(first)) - boxOf(progressOf(second)) ||
    byRank(first, second)
}

function splitBySeen(words, progressByWordId) {
  const ranked = sortedByRank(words)
  return {
    seenWords: ranked.filter((word) => progressByWordId.has(word.id)),
    unseenWords: ranked.filter((word) => !progressByWordId.has(word.id)),
  }
}

export function examPool({ words, progressByWordId = new Map() }) {
  const { seenWords, unseenWords } = splitBySeen(words, progressByWordId)
  const struggling = seenWords.sort(strugglingFirst((word) => progressByWordId.get(word.id)))
  const missing = Math.max(0, EXAM_POOL_MINIMUM - struggling.length)
  return [...struggling, ...unseenWords.slice(0, missing)]
}

export function wordOfTheDayPool({ words, progressByWordId = new Map() }) {
  const { seenWords, unseenWords } = splitBySeen(words, progressByWordId)
  return [...seenWords, ...unseenWords.slice(0, WORD_OF_THE_DAY_UNSEEN_PREVIEW)]
}
