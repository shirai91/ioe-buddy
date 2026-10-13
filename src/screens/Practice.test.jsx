import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Practice from './Practice.jsx'

vi.mock('../api/client.js', () => ({
  getProfile: vi.fn(async () => ({ name: 'Mai', stars: 7 })),
}))

describe('Practice', () => {
  it('links to the five games and shows the stars', async () => {
    render(
      <MemoryRouter>
        <Practice />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Practice' })).toBeTruthy()
    expect(screen.getByText('Pick a game to play!')).toBeTruthy()
    const gameLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href').startsWith('/practice/'))
    expect(gameLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/practice/picture-pick',
      '/practice/letter-pop',
      '/practice/match-up',
      '/practice/fill-in',
      '/practice/sentence-pick',
    ])
    expect(screen.getByRole('link', { name: /Match Up/ }).textContent).toContain('10 rounds')
    expect(await screen.findByRole('img', { name: '7 stars' })).toBeTruthy()
  })
})
