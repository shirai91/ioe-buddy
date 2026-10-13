import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getExam, getProfile, postExamResult } from '../api/client.js'
import PicturePick from './PicturePick.jsx'

vi.mock('../api/client.js', () => ({
  getExam: vi.fn(),
  getProfile: vi.fn(),
  postExamResult: vi.fn(),
}))

function choice(word, image = `content/images/${word}.png`) {
  return { id: word, word, letter: word[0].toUpperCase() + word[0], image }
}

const QUESTIONS = [
  { id: 'picture-pick-1', answerId: 'ball', word: 'ball', options: [choice('bike'), choice('ball'), choice('book'), choice('apple', null)] },
  { id: 'picture-pick-2', answerId: 'book', word: 'book', options: [choice('book'), choice('ball'), choice('bike'), choice('cat')] },
]

function renderScreen() {
  return render(
    <MemoryRouter>
      <PicturePick />
    </MemoryRouter>,
  )
}

function nextButton(name = 'Next') {
  return screen.getByRole('button', { name })
}

describe('PicturePick screen', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset().mockResolvedValue({ name: 'Buddy', stars: 5 })
    vi.mocked(getExam).mockReset().mockResolvedValue({ type: 'picture-pick', questions: QUESTIONS })
    vi.mocked(postExamResult).mockReset().mockResolvedValue({ stars: 6 })
  })

  it('asks for a word and shows four picture choices', async () => {
    renderScreen()
    expect(await screen.findByText('ball')).toBeTruthy()
    expect(getExam).toHaveBeenCalledWith('picture-pick')
    expect(screen.getByText('Find the…')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Listen to the word' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Picture of a ball' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Picture of an apple' }).textContent).toBe('Aa')
    expect(screen.getByRole('status').textContent).toBe('Tap the right picture!')
    expect(screen.getByRole('progressbar', { name: 'Question 1 of 2' })).toBeTruthy()
    expect(nextButton().disabled).toBe(true)
  })

  it('says oops on a wrong pick and gives no star after a miss', async () => {
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Picture of a bike' }))
    expect(screen.getByRole('status').textContent).toBe('Oops! Try again.')
    expect(screen.getByRole('button', { name: 'Picture of a bike' }).className).toContain('picture-pick__choice--wrong')
    expect(nextButton().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Picture of a ball' }))
    expect(screen.getByRole('status').textContent).toBe('Great job! That is the ball.')
    expect(screen.getByRole('button', { name: 'Picture of a ball' }).className).toContain('picture-pick__choice--right')
    expect(screen.getByRole('img', { name: '5 stars' })).toBeTruthy()
    expect(nextButton().disabled).toBe(false)
  })

  it('gives a star for a first-try pick, then posts the result and shows the result card', async () => {
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Picture of a ball' }))
    expect(screen.getByRole('img', { name: '6 stars' })).toBeTruthy()
    fireEvent.click(nextButton())

    expect(screen.getByRole('progressbar', { name: 'Question 2 of 2' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Picture of a cat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Picture of a book' }))
    fireEvent.click(nextButton('Finish'))

    expect(await screen.findByRole('heading', { name: 'You did it!' })).toBeTruthy()
    expect(screen.getByText('You got 1 of 2 stars')).toBeTruthy()
    expect(postExamResult).toHaveBeenCalledWith('picture-pick', { correct: 1, total: 2 })
    expect(await screen.findByRole('img', { name: '6 stars' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'More games' }).getAttribute('href')).toBe('/practice')
  })

  it('fetches a new exam on Play again', async () => {
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Picture of a ball' }))
    fireEvent.click(nextButton())
    fireEvent.click(screen.getByRole('button', { name: 'Picture of a book' }))
    fireEvent.click(nextButton('Finish'))
    fireEvent.click(await screen.findByRole('button', { name: 'Play again' }))

    expect(await screen.findByRole('progressbar', { name: 'Question 1 of 2' })).toBeTruthy()
    expect(getExam).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status').textContent).toBe('Tap the right picture!')
  })

  it('offers a retry when the exam cannot load', async () => {
    vi.mocked(getExam).mockRejectedValueOnce(new Error('offline'))
    renderScreen()
    expect(await screen.findByText('Oh no! The game could not load.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Picture of a ball' })).toBeTruthy()
  })
})
