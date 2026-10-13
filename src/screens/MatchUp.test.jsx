import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getExam, getProfile, postExamResult } from '../api/client.js'
import MatchUp from './MatchUp.jsx'

vi.mock('../api/client.js', () => ({
  getExam: vi.fn(),
  getProfile: vi.fn(),
  postExamResult: vi.fn(),
}))

function choice(word, image = `content/images/${word}.png`) {
  return { id: word, word, letter: word[0].toUpperCase() + word[0], image }
}

const PAIRS = [choice('ball'), choice('bike'), choice('book'), choice('apple', null)]

const ROUNDS = [
  { id: 'match-up-1', words: PAIRS, pictures: [PAIRS[2], PAIRS[0], PAIRS[3], PAIRS[1]] },
  { id: 'match-up-2', words: [PAIRS[1], PAIRS[0], PAIRS[3], PAIRS[2]], pictures: PAIRS },
]

function renderScreen() {
  return render(
    <MemoryRouter>
      <MatchUp />
    </MemoryRouter>,
  )
}

function wordCell(word) {
  return screen.getByRole('button', { name: `Word ${word}` })
}

function pictureCell(word) {
  const article = /^[aeiou]/.test(word) ? 'an' : 'a'
  return screen.getByRole('button', { name: `Picture of ${article} ${word}` })
}

function matchAll(words) {
  for (const word of words) {
    fireEvent.click(wordCell(word))
    fireEvent.click(pictureCell(word))
  }
}

function status() {
  return screen.getByRole('status').textContent
}

describe('MatchUp screen', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset().mockResolvedValue({ name: 'Buddy', stars: 3 })
    vi.mocked(getExam).mockReset().mockResolvedValue({ type: 'match-up', questions: ROUNDS })
    vi.mocked(postExamResult).mockReset().mockResolvedValue({ stars: 0, change: -3 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows four words and four pictures for the round', async () => {
    renderScreen()
    expect(await screen.findByRole('button', { name: 'Word ball' })).toBeTruthy()
    expect(getExam).toHaveBeenCalledWith('match-up')
    expect(screen.getAllByRole('button', { name: /^Word / })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: /^Picture of / })).toHaveLength(4)
    expect(pictureCell('apple').textContent).toBe('Aa')
    expect(status()).toBe('Tap a word, then its picture')
    expect(screen.getByRole('progressbar', { name: 'Round 1 of 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next round' }).disabled).toBe(true)
  })

  it('guides the pick and locks a matched pair', async () => {
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Word ball' }))
    expect(wordCell('ball').getAttribute('aria-pressed')).toBe('true')
    expect(status()).toBe('Now tap the picture of “ball”')

    fireEvent.click(pictureCell('ball'))
    expect(wordCell('ball').disabled).toBe(true)
    expect(pictureCell('ball').disabled).toBe(true)
    expect(status()).toBe('1 of 4 pairs found')

    fireEvent.click(pictureCell('bike'))
    expect(status()).toBe('Now tap the word for it')
    fireEvent.click(pictureCell('bike'))
    expect(status()).toBe('1 of 4 pairs found')
  })

  it('shows a wrong pair for a moment and gives no star for that round', async () => {
    renderScreen()
    await screen.findByRole('button', { name: 'Word ball' })
    vi.useFakeTimers()
    fireEvent.click(wordCell('ball'))
    fireEvent.click(pictureCell('bike'))
    expect(status()).toBe('Oops! Not a pair. Try again.')
    expect(wordCell('ball').className).toContain('match-up__cell--wrong')
    expect(pictureCell('bike').className).toContain('match-up__cell--shake')

    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(status()).toBe('Tap a word, then its picture')
    expect(wordCell('ball').className).not.toContain('match-up__cell--wrong')

    matchAll(['ball', 'bike', 'book', 'apple'])
    expect(status()).toBe('All matched! Super!')
    expect(screen.getByRole('img', { name: '3 stars' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next round' }).disabled).toBe(false)
  })

  it('posts the result, shows the star loss and fetches a new exam on Play again', async () => {
    renderScreen()
    await screen.findByRole('button', { name: 'Word ball' })
    fireEvent.click(wordCell('ball'))
    fireEvent.click(pictureCell('bike'))
    matchAll(['ball', 'bike', 'book', 'apple'])
    expect(screen.getByRole('img', { name: '3 stars' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next round' }))

    expect(screen.getByRole('progressbar', { name: 'Round 2 of 2' })).toBeTruthy()
    fireEvent.click(pictureCell('book'))
    fireEvent.click(wordCell('ball'))
    matchAll(['ball', 'bike', 'book', 'apple'])
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))

    expect(screen.getByText('You got 0 of 2 right')).toBeTruthy()
    expect(postExamResult).toHaveBeenCalledWith('match-up', { correct: 0, total: 2 })
    expect(await screen.findByText('-3 stars')).toBeTruthy()
    expect(screen.getByRole('img', { name: '0 stars' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(await screen.findByRole('progressbar', { name: 'Round 1 of 2' })).toBeTruthy()
    expect(getExam).toHaveBeenCalledTimes(2)
  })
})
