import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFlashcards, rateCard } from '../api/client.js'
import { CHEERS } from '../lib/cheers.js'
import { speak } from '../lib/speak.js'
import FlashCards from './FlashCards.jsx'

vi.mock('../api/client.js', () => ({
  getFlashcards: vi.fn(),
  rateCard: vi.fn(),
}))

vi.mock('../lib/speak.js', () => ({ speak: vi.fn() }))

function sessionCard(word, letter, kind, copy = 1) {
  return {
    id: word,
    word,
    letter,
    ipa: `/${word}/`,
    vi: word,
    sentence: `I see a ${word}.`,
    image: `content/images/${word}.png`,
    key: `${word}:${copy}`,
    kind,
    box: kind === 'new' ? 0 : 2,
  }
}

const SESSION = [
  sessionCard('dog', 'Dd', 'due'),
  sessionCard('ball', 'Bb', 'new'),
  sessionCard('cat', 'Cc', 'warmup'),
  sessionCard('fish', 'Ff', 'tricky'),
  sessionCard('egg', 'Ee', 'due'),
  sessionCard('ball', 'Bb', 'recall', 2),
  sessionCard('hat', 'Hh', 'warmup'),
  sessionCard('pen', 'Pp', 'due'),
  sessionCard('cup', 'Cc', 'warmup'),
  sessionCard('sun', 'Ss', 'repeat'),
]

const NEXT_SESSION = [sessionCard('kite', 'Kk', 'new'), ...SESSION.slice(0, 9).map((card) => ({ ...card, key: `${card.key}:next` }))]

const SESSION_RATINGS = ['easy', 'hard', 'medium', 'hard', 'easy', 'easy', 'easy', 'easy', 'easy', 'easy']

function renderScreen() {
  return render(
    <MemoryRouter>
      <FlashCards />
    </MemoryRouter>,
  )
}

function backFace(container) {
  return container.querySelector('.flash-card__face--back')
}

function frontFace(container) {
  return container.querySelector('.flash-card__face--front')
}

function sticker(container) {
  return container.querySelector('.flash-card__sticker')
}

function rateCurrentCard(level) {
  fireEvent.click(screen.getByRole('button', { name: 'Flip' }))
  fireEvent.click(screen.getByRole('button', { name: new RegExp(level, 'i') }))
}

async function finishSession() {
  await screen.findByText('1 / 10')
  for (const level of SESSION_RATINGS) rateCurrentCard(level)
}

describe('FlashCards screen', () => {
  beforeEach(() => {
    vi.mocked(getFlashcards).mockReset().mockResolvedValue({ cards: SESSION })
    vi.mocked(rateCard).mockReset().mockResolvedValue({ ok: true })
    vi.mocked(speak).mockReset()
  })

  it('says a different cheer for the rating each time a card gets the same rating', async () => {
    renderScreen()
    await screen.findByText('1 / 10')

    rateCurrentCard('easy')
    rateCurrentCard('easy')

    const cheers = vi.mocked(speak).mock.calls.map(([text]) => text).filter((text) => CHEERS.easy.includes(text))
    expect(cheers).toHaveLength(2)
    expect(cheers[0]).not.toBe(cheers[1])
  })

  it('loads the session and shows the picture side of the first card', async () => {
    const { container } = renderScreen()
    expect(await screen.findByText('1 / 10')).toBeTruthy()
    expect(getFlashcards).toHaveBeenCalledWith()
    expect(screen.getByRole('button', { name: 'Picture card. Tap to see the word' })).toBeTruthy()
    expect(frontFace(container).getAttribute('aria-hidden')).toBe('false')
    expect(frontFace(container).querySelector('img').getAttribute('src')).toBe('content/images/dog.png')
    expect(sticker(container)).toBeNull()
    expect(screen.getByRole('button', { name: 'Previous card' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next card' })).toBeTruthy()
  })

  it('shows a New word sticker on a new card and says so in its label', async () => {
    const { container } = renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Next card' }))
    expect(screen.getByText('2 / 10')).toBeTruthy()
    expect(sticker(container).textContent).toBe('New word!')
    expect(frontFace(container).contains(sticker(container))).toBe(true)
    expect(screen.getByRole('button', { name: 'New word! Picture card. Tap to see the word' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Flip' }))
    expect(screen.getByRole('button', { name: 'New word! Word: ball. I see a ball. Tap to see the picture' })).toBeTruthy()
  })

  it('flips the card to show the word, letter and sentence with rate buttons', async () => {
    const { container } = renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Flip' }))
    expect(backFace(container).getAttribute('aria-hidden')).toBe('false')
    expect(frontFace(container).getAttribute('aria-hidden')).toBe('true')
    expect(backFace(container).textContent).toContain('Dd')
    expect(backFace(container).textContent).toContain('I see a dog.')
    expect(screen.getByRole('button', { name: 'Word: dog. I see a dog. Tap to see the picture' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Rate this card' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Listen to the word and sentence' })).toBeTruthy()
  })

  it('rating a card saves it and deals the next card on its picture side', async () => {
    const { container } = renderScreen()
    await screen.findByText('1 / 10')
    rateCurrentCard('easy')
    expect(rateCard).toHaveBeenCalledWith('dog', 'easy')
    expect(screen.getByText('2 / 10')).toBeTruthy()
    expect(frontFace(container).getAttribute('aria-hidden')).toBe('false')
    expect(sticker(container)).not.toBeNull()
    expect(screen.queryByRole('group', { name: 'Rate this card' })).toBeNull()
  })

  it('shows the same word again as a recall card without the sticker', async () => {
    const { container } = renderScreen()
    await screen.findByText('1 / 10')
    for (const level of SESSION_RATINGS.slice(0, 5)) rateCurrentCard(level)
    expect(screen.getByText('6 / 10')).toBeTruthy()
    expect(sticker(container)).toBeNull()
    expect(frontFace(container).querySelector('img').getAttribute('src')).toBe('content/images/ball.png')
    rateCurrentCard('easy')
    expect(rateCard.mock.calls.filter(([wordId]) => wordId === 'ball')).toEqual([
      ['ball', 'hard'],
      ['ball', 'easy'],
    ])
    expect(screen.getByText('7 / 10')).toBeTruthy()
  })

  it('shows the summary after the last card and replays only the words that are still tricky', async () => {
    renderScreen()
    await finishSession()
    expect(rateCard).toHaveBeenCalledTimes(10)
    expect(screen.getByRole('heading', { name: 'All cards done!' })).toBeTruthy()
    expect(screen.getByText('Done')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Practice tricky words (2)' }))
    expect(screen.getByText('1 / 2')).toBeTruthy()
    rateCurrentCard('easy')
    expect(rateCard).toHaveBeenLastCalledWith('cat', 'easy')
    rateCurrentCard('easy')
    expect(rateCard).toHaveBeenLastCalledWith('fish', 'easy')
    expect(screen.queryByRole('button', { name: /Practice tricky words/ })).toBeNull()
  })

  it('gets a new session from the backend for New cards', async () => {
    vi.mocked(getFlashcards).mockResolvedValueOnce({ cards: SESSION }).mockResolvedValueOnce({ cards: NEXT_SESSION })
    const { container } = renderScreen()
    await finishSession()
    fireEvent.click(screen.getByRole('button', { name: 'New cards' }))
    expect(await screen.findByText('1 / 10')).toBeTruthy()
    expect(getFlashcards).toHaveBeenCalledTimes(2)
    expect(frontFace(container).querySelector('img').getAttribute('src')).toBe('content/images/kite.png')
    expect(sticker(container).textContent).toBe('New word!')
  })

  it('moves between cards with previous and next', async () => {
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Previous card' }))
    expect(screen.getByText('10 / 10')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getByText('1 / 10')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(screen.getByText('2 / 10')).toBeTruthy()
  })

  it('offers a retry when the cards cannot load', async () => {
    vi.mocked(getFlashcards).mockRejectedValueOnce(new Error('offline'))
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('1 / 10')).toBeTruthy()
  })

  it('shows a friendly message without units when there are no cards', async () => {
    vi.mocked(getFlashcards).mockResolvedValue({ cards: [] })
    renderScreen()
    expect(await screen.findByRole('heading', { name: 'No cards yet' })).toBeTruthy()
    expect(screen.getByText('New words are on the way. Come back soon!')).toBeTruthy()
    expect(screen.queryByText(/unit/i)).toBeNull()
  })
})
