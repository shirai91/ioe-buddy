import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getExam, getProfile, postExamResult } from '../api/client.js'
import FillIn from './FillIn.jsx'

vi.mock('../api/client.js', () => ({
  getExam: vi.fn(),
  getProfile: vi.fn(),
  postExamResult: vi.fn(),
}))

const QUESTIONS = [
  { wordId: 'cat', word: 'cat', letter: 'Cc', image: null, blanks: [1], tiles: ['m', 'a', 'r', 's', 'o', 'p'] },
  { wordId: 'ball', word: 'ball', letter: 'Bb', image: null, blanks: [0, 3], tiles: ['l', 'k', 'b', 'e', 'w', 'u'] },
]

function renderScreen() {
  return render(
    <MemoryRouter>
      <FillIn />
    </MemoryRouter>,
  )
}

function slotsText(container) {
  return [...container.querySelector('.fill-in__slots').children].map((slot) => slot.textContent || '_').join('')
}

describe('FillIn screen', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset().mockResolvedValue({ name: 'Buddy', stars: 2 })
    vi.mocked(getExam).mockReset().mockResolvedValue({ type: 'fill-in', questions: QUESTIONS })
    vi.mocked(postExamResult).mockReset().mockResolvedValue({ stars: 7, change: 5 })
  })

  it('shows the word with empty boxes and six letter tiles', async () => {
    const { container } = renderScreen()
    expect(await screen.findByText('Find the missing letter')).toBeTruthy()
    expect(getExam).toHaveBeenCalledWith('fill-in')
    expect(slotsText(container)).toBe('c_t')
    expect(screen.getByRole('button', { name: 'Empty box' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Letters' }).querySelectorAll('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true)
  })

  it('shakes on a wrong letter, lets the box be cleared, then solves', async () => {
    const { container } = renderScreen()
    await screen.findByText('Find the missing letter')
    fireEvent.click(screen.getByRole('button', { name: 'Letter m' }))
    expect(screen.getByRole('status').textContent).toBe('Oops! Tap a box to change it.')
    expect(container.querySelector('.fill-in__slots').className).toContain('fill-in__slots--shake')
    expect(screen.getByRole('button', { name: 'Letter m' }).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Letter m, tap to remove' }))
    expect(screen.getByRole('button', { name: 'Empty box' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Letter m' }).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Letter a' }))
    expect(screen.getByRole('status').textContent).toBe('Great job! It says cat.')
    expect(slotsText(container)).toBe('cat')
    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(false)
    expect(screen.getByRole('img', { name: '2 stars' })).toBeTruthy()
  })

  it('fills two blanks in order, posts the result and shows the result card', async () => {
    let resolveResult
    vi.mocked(postExamResult).mockReturnValueOnce(
      new Promise((done) => {
        resolveResult = done
      }),
    )
    const { container } = renderScreen()
    await screen.findByText('Find the missing letter')
    fireEvent.click(screen.getByRole('button', { name: 'Letter a' }))
    expect(screen.getByRole('img', { name: '2 stars' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Find the 2 missing letters')).toBeTruthy()
    expect(slotsText(container)).toBe('_al_')
    fireEvent.click(screen.getByRole('button', { name: 'Letter b' }))
    expect(slotsText(container)).toBe('bal_')
    fireEvent.click(screen.getByRole('button', { name: 'Letter l' }))
    expect(screen.getByRole('status').textContent).toBe('Great job! It says ball.')
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))

    expect(postExamResult).toHaveBeenCalledWith('fill-in', { correct: 2, total: 2 })
    expect(screen.getByText('You got 2 of 2 right')).toBeTruthy()
    expect(screen.getByRole('img', { name: '2 stars' })).toBeTruthy()
    expect(screen.queryByText('+5 stars')).toBeNull()

    await act(async () => resolveResult({ stars: 7, change: 5 }))
    expect(screen.getByRole('img', { name: '7 stars' })).toBeTruthy()
    expect(screen.getByText('+5 stars')).toBeTruthy()
  })

  it('shows a friendly message when there are no words', async () => {
    vi.mocked(getExam).mockResolvedValue({ type: 'fill-in', questions: [] })
    renderScreen()
    expect(await screen.findByText('No words to play with yet.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'More games' }).getAttribute('href')).toBe('/practice')
  })
})
