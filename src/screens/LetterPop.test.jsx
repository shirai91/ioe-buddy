import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getExam, getProfile, postExamResult } from '../api/client.js'
import LetterPop from './LetterPop.jsx'

vi.mock('../api/client.js', () => ({
  getExam: vi.fn(),
  getProfile: vi.fn(),
  postExamResult: vi.fn(),
}))

const QUESTIONS = [
  { wordId: 'cat', word: 'cat', letter: 'Cc', image: null, letters: ['c', 'a', 'd', 't'], extraIndex: 2 },
  { wordId: 'ball', word: 'ball', letter: 'Bb', image: 'content/images/ball.png', letters: ['m', 'b', 'a', 'l', 'l'], extraIndex: 0 },
]

function renderScreen() {
  return render(
    <MemoryRouter>
      <LetterPop />
    </MemoryRouter>,
  )
}

function letterButtons() {
  return screen.getByRole('group', { name: 'Letters' }).querySelectorAll('button')
}

describe('LetterPop screen', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset().mockResolvedValue({ name: 'Buddy', stars: 5 })
    vi.mocked(getExam).mockReset().mockResolvedValue({ type: 'letter-pop', questions: QUESTIONS })
    vi.mocked(postExamResult).mockReset().mockResolvedValue({ stars: 5, change: 0 })
  })

  it('loads a letter-pop exam and shows the letters of the first word', async () => {
    renderScreen()
    expect(await screen.findByText('One letter sneaked in. Pop it!')).toBeTruthy()
    expect(getExam).toHaveBeenCalledWith('letter-pop')
    expect([...letterButtons()].map((button) => button.textContent)).toEqual(['c', 'a', 'd', 't'])
    expect(screen.getByRole('status').textContent).toBe('Tap the letter that does not belong')
    expect(screen.getByRole('progressbar', { name: 'Question 1 of 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Listen to the word' })).toBeTruthy()
  })

  it('marks a wrong pick, then pops the extra letter and unlocks Next', async () => {
    renderScreen()
    await screen.findByText('One letter sneaked in. Pop it!')
    fireEvent.click(letterButtons()[0])
    expect(screen.getByRole('status').textContent).toBe('Oops! Try another letter.')
    expect(letterButtons()[0].className).toContain('letter-pop__tile--wrong')

    fireEvent.click(screen.getByRole('button', { name: 'Letter d' }))
    expect(screen.getByRole('status').textContent).toBe('Pop! The word is cat.')
    expect(screen.getByRole('group', { name: 'Letters' }).textContent).toBe('cat')
    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(false)
    expect(screen.getByRole('img', { name: '5 stars' })).toBeTruthy()
  })

  it('posts the result after the last word and shows the result card with the star change', async () => {
    renderScreen()
    await screen.findByText('One letter sneaked in. Pop it!')
    fireEvent.click(screen.getByRole('button', { name: 'Letter a' }))
    fireEvent.click(screen.getByRole('button', { name: 'Letter d' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    fireEvent.click(screen.getByRole('button', { name: 'Letter m' }))
    expect(screen.getByRole('img', { name: '5 stars' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))

    expect(postExamResult).toHaveBeenCalledWith('letter-pop', { correct: 1, total: 2 })
    expect(screen.getByText('You got 1 of 2 right')).toBeTruthy()
    expect(await screen.findByText('No star change')).toBeTruthy()
    expect(screen.getByRole('img', { name: '5 stars' })).toBeTruthy()
  })

  it('loads a new exam when playing again', async () => {
    renderScreen()
    await screen.findByText('One letter sneaked in. Pop it!')
    fireEvent.click(screen.getByRole('button', { name: 'Letter d' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Letter m' }))
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))

    expect(await screen.findByText('One letter sneaked in. Pop it!')).toBeTruthy()
    expect(getExam).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('progressbar', { name: 'Question 1 of 2' })).toBeTruthy()
  })

  it('offers a retry when the exam cannot load', async () => {
    vi.mocked(getExam).mockRejectedValueOnce(new Error('offline'))
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('One letter sneaked in. Pop it!')).toBeTruthy()
  })
})
