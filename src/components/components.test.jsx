import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.jsx'
import FeedbackBar from './FeedbackBar.jsx'
import ProgressSegments from './ProgressSegments.jsx'
import ResultCard from './ResultCard.jsx'
import WordPicture from './WordPicture.jsx'

function inRouter(element) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('shared components', () => {
  it('AppHeader shows a back link, the title and the stars', () => {
    inRouter(<AppHeader title="Practice" stars={12} />)
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Practice' })).toBeTruthy()
    expect(screen.getByRole('img', { name: '12 stars' })).toBeTruthy()
  })

  it('ProgressSegments marks done, current and todo segments', () => {
    const { container } = render(<ProgressSegments total={10} current={3} />)
    const states = [...container.querySelectorAll('[data-state]')].map((segment) => segment.dataset.state)
    expect(states).toEqual(['done', 'done', 'done', 'current', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo'])
    expect(screen.getByRole('progressbar', { name: 'Question 4 of 10' })).toBeTruthy()
  })

  it('WordPicture falls back to a letter tile when there is no image', () => {
    render(<WordPicture word={{ word: 'ball', letter: 'Bb', image: null }} alt="Picture of a ball" />)
    expect(screen.getByRole('img', { name: 'Picture of a ball' }).textContent).toBe('Bb')
  })

  it('FeedbackBar is a status region', () => {
    render(<FeedbackBar tone="success">Great job!</FeedbackBar>)
    expect(screen.getByRole('status').textContent).toBe('Great job!')
  })

  it('ResultCard shows the score and both actions', () => {
    inRouter(<ResultCard stars={7} total={10} onPlayAgain={() => {}} />)
    expect(screen.getByRole('heading', { name: 'You did it!' })).toBeTruthy()
    expect(screen.getByText('You got 7 of 10 stars')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'More games' }).getAttribute('href')).toBe('/practice')
  })
})
