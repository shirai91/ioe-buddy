import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getExam, getProfile, postExamResult } from '../api/client.js'
import { GREAT_JOB, TRY_AGAIN } from '../lib/clips.js'
import { speak } from '../lib/speak.js'
import SentencePick from './SentencePick.jsx'

vi.mock('../api/client.js', () => ({
  getExam: vi.fn(),
  getProfile: vi.fn(),
  postExamResult: vi.fn(),
}))

vi.mock('../lib/speak.js', () => ({ speak: vi.fn() }))

const MILK = { id: 'milk', word: 'milk', letter: 'Mm', image: 'content/images/milk.png' }

const CAT = { id: 'cat', word: 'cat', letter: 'Cc', image: 'content/images/cat.png' }

const COUNT_QUESTION = {
  id: 'sentence-pick-count',
  before: 'I can see ',
  after: '.',
  answer: 'three cats',
  count: { number: 3, picture: CAT },
  options: [
    { text: 'a cat', picture: null },
    { text: 'two cats', picture: null },
    { text: 'three cats', picture: null },
    { text: 'four cats', picture: null },
  ],
  sentence: 'I can see three cats.',
  prompt: 'I can see ... what?',
}

const QUESTIONS = [
  {
    id: 'sentence-pick-1',
    before: 'I like ',
    after: '.',
    answer: 'milk',
    options: [
      { text: 'fish', picture: null },
      { text: 'milk', picture: MILK },
      { text: 'chips', picture: null },
      { text: 'chicken', picture: null },
    ],
    sentence: 'I like milk.',
    prompt: 'I like ... what?',
  },
  {
    id: 'sentence-pick-2',
    before: 'This is my ',
    after: '.',
    answer: 'bike',
    options: [
      { text: 'bike', picture: null },
      { text: 'ball', picture: null },
      { text: 'book', picture: null },
      { text: 'cat', picture: null },
    ],
    sentence: 'This is my bike.',
    prompt: 'This is my ... what?',
  },
]

function renderScreen() {
  return render(
    <MemoryRouter>
      <SentencePick />
    </MemoryRouter>,
  )
}

function pendingResult() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  vi.mocked(postExamResult).mockReturnValueOnce(promise)
  return resolve
}

function nextButton(name = 'Next') {
  return screen.getByRole('button', { name })
}

function blankText(container) {
  return container.querySelector('.sentence-pick__blank').textContent.trim()
}

describe('SentencePick screen', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset().mockResolvedValue({ name: 'Buddy', stars: 5 })
    vi.mocked(getExam).mockReset().mockResolvedValue({ type: 'sentence-pick', questions: QUESTIONS })
    vi.mocked(postExamResult).mockReset().mockResolvedValue({ stars: 10, change: 5 })
    vi.mocked(speak).mockReset()
  })

  it('shows the sentence with a blank and A to D options', async () => {
    const { container } = renderScreen()
    expect(await screen.findByRole('button', { name: 'A: fish' })).toBeTruthy()
    expect(getExam).toHaveBeenCalledWith('sentence-pick')
    expect(screen.getByRole('heading', { level: 1, name: 'Sentence Quiz' })).toBeTruthy()
    expect(screen.getByText('Finish the sentence')).toBeTruthy()
    expect(container.querySelector('.sentence-pick__sentence').textContent).toBe('I like ?.')
    expect(blankText(container)).toBe('?')
    const answers = screen.getByRole('group', { name: 'Answers' })
    expect(answers.querySelectorAll('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'B: milk' }).textContent).toBe('Bmilk')
    expect(screen.getByRole('button', { name: 'B: milk' }).querySelector('.word-picture__image').getAttribute('src')).toBe(
      'content/images/milk.png',
    )
    expect(screen.getByRole('button', { name: 'A: fish' }).querySelector('.word-picture')).toBeNull()
    expect(screen.getByRole('button', { name: 'C: chips' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'D: chicken' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Which word fits?')
    expect(screen.getByRole('progressbar', { name: 'Question 1 of 2' })).toBeTruthy()
    expect(nextButton().disabled).toBe(true)
  })

  it('shows no count pictures for a normal question', async () => {
    const { container } = renderScreen()
    await screen.findByRole('button', { name: 'A: fish' })
    expect(container.querySelector('.sentence-pick__count')).toBeNull()
  })

  it('shows the count picture once per counted thing and no option pictures', async () => {
    vi.mocked(getExam).mockResolvedValue({ type: 'sentence-pick', questions: [COUNT_QUESTION] })
    const { container } = renderScreen()
    await screen.findByRole('button', { name: 'A: a cat' })
    const row = screen.getByRole('img', { name: '3 cat' })
    expect(row.className).toBe('sentence-pick__count')
    const images = row.querySelectorAll('.word-picture__image')
    expect(images).toHaveLength(3)
    images.forEach((image) => expect(image.getAttribute('src')).toBe('content/images/cat.png'))
    expect(container.querySelector('.sentence-pick__sentence').textContent).toBe('I can see ?.')
    const answers = screen.getByRole('group', { name: 'Answers' })
    expect(answers.querySelector('.word-picture')).toBeNull()
  })

  it('shows the picked word in the blank and says oops on a wrong pick', async () => {
    const { container } = renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'A: fish' }))
    expect(screen.getByRole('status').textContent).toBe('Oops! Try again.')
    expect(screen.getByRole('button', { name: 'A: fish' }).className).toContain('sentence-pick__option--wrong')
    expect(blankText(container)).toBe('fish')
    expect(container.querySelector('.sentence-pick__blank').className).toContain('shake')
    expect(speak).toHaveBeenCalledWith(TRY_AGAIN)
    expect(nextButton().disabled).toBe(true)
  })

  it('fills the blank and enables Next on the right pick', async () => {
    const { container } = renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'B: milk' }))
    expect(screen.getByRole('status').textContent).toBe('Great job!')
    expect(screen.getByRole('button', { name: 'B: milk' }).className).toContain('sentence-pick__option--right')
    expect(blankText(container)).toBe('milk')
    expect(container.querySelector('.sentence-pick__blank').className).toContain('sentence-pick__blank--solved')
    expect(speak).toHaveBeenCalledWith(GREAT_JOB, 'I like milk.')
    expect(nextButton().disabled).toBe(false)

    fireEvent.click(nextButton())
    expect(screen.getByRole('progressbar', { name: 'Question 2 of 2' })).toBeTruthy()
    expect(blankText(container)).toBe('?')
  })

  it('says the prompt before the answer and the sentence after', async () => {
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'Listen to the sentence' }))
    expect(speak).toHaveBeenLastCalledWith('I like ... what?')
    fireEvent.click(screen.getByRole('button', { name: 'B: milk' }))
    fireEvent.click(screen.getByRole('button', { name: 'Listen to the sentence' }))
    expect(speak).toHaveBeenLastCalledWith('I like milk.')
  })

  it('posts the first-try score when the game finishes', async () => {
    const resolveResult = pendingResult()
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: 'A: fish' }))
    fireEvent.click(screen.getByRole('button', { name: 'B: milk' }))
    fireEvent.click(nextButton())
    fireEvent.click(screen.getByRole('button', { name: 'A: bike' }))
    fireEvent.click(nextButton('Finish'))

    expect(screen.getByRole('heading', { name: 'You did it!' })).toBeTruthy()
    expect(screen.getByText('You got 1 of 2 right')).toBeTruthy()
    expect(postExamResult).toHaveBeenCalledWith('sentence-pick', { correct: 1, total: 2 })

    await act(async () => resolveResult({ stars: 8, change: 3 }))
    expect(screen.getByRole('img', { name: '8 stars' })).toBeTruthy()
    expect(screen.getByText('+3 stars')).toBeTruthy()
  })

  it('offers a retry when the exam cannot load', async () => {
    vi.mocked(getExam).mockRejectedValueOnce(new Error('offline'))
    renderScreen()
    expect(await screen.findByText('Oh no! The game could not load.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'A: fish' })).toBeTruthy()
  })
})
