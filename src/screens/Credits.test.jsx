import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Credits from './Credits.jsx'

const TWEMOJI = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg'

vi.mock('../api/client.js', () => ({
  getProfile: vi.fn(async () => ({ name: 'Mai', stars: 3 })),
  getCredits: vi.fn(async () => [
    {
      word: 'fish and chips',
      image: 'content/images/web/fish-and-chips.png',
      source: `${TWEMOJI}/1f35f.svg + ${TWEMOJI}/1f41f.svg`,
      author: 'Twemoji contributors',
      license: 'CC-BY 4.0',
    },
    {
      word: 'five',
      image: 'content/images/web/five.png',
      source: `${TWEMOJI}/35-20e3.svg`,
      author: 'Twemoji contributors',
      license: 'CC-BY 4.0',
    },
  ]),
}))

describe('Credits', () => {
  it('lists each picture credit and the book note', async () => {
    render(
      <MemoryRouter>
        <Credits />
      </MemoryRouter>,
    )

    expect(screen.getByText('Pictures from the Tieng Anh 1 Global Success book')).toBeTruthy()
    const list = await screen.findByRole('list', { name: 'Picture credits' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)

    const fishAndChips = within(items[0])
    expect(fishAndChips.getByText('fish and chips')).toBeTruthy()
    expect(fishAndChips.getByText('By Twemoji contributors')).toBeTruthy()
    expect(fishAndChips.getByText('CC-BY 4.0')).toBeTruthy()
    expect(fishAndChips.getByRole('img', { name: 'Picture of fish and chips' }).getAttribute('src')).toBe('content/images/web/fish-and-chips.png')
    expect(fishAndChips.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([`${TWEMOJI}/1f35f.svg`, `${TWEMOJI}/1f41f.svg`])

    const five = within(items[1])
    expect(five.getByRole('link', { name: 'Source for five (opens a new tab)' }).getAttribute('target')).toBe('_blank')
  })
})
