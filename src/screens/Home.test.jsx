import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as client from '../api/client.js'
import Home from './Home.jsx'

vi.mock('../api/client.js', () => ({
  getProfile: vi.fn(),
  getWordOfTheDay: vi.fn(),
  updateProfile: vi.fn(),
  resetProgress: vi.fn(),
}))

const APPLE = { id: 'apple', word: 'apple', letter: 'Aa', image: null }

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

function openUserMenu() {
  fireEvent.click(screen.getByRole('button', { name: /Hi, Mai!/ }))
}

describe('Home', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 9, 30))
    client.getProfile.mockResolvedValue({ name: 'Mai', stars: 12 })
    client.getWordOfTheDay.mockResolvedValue(APPLE)
    client.updateProfile.mockImplementation(async (changes) => ({ name: 'Mai', stars: 12, ...changes }))
    client.resetProgress.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('greets the child and shows stars, the title, the cards and the word of the day', async () => {
    renderHome()

    expect(await screen.findByText('Hi, Mai!')).toBeTruthy()
    expect(screen.getByText('Good morning!')).toBeTruthy()
    expect(screen.getByRole('img', { name: '12 stars' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Let’s learn English!' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Flash Cards/ }).getAttribute('href')).toBe('/cards')
    expect(screen.getByRole('link', { name: /Practice/ }).getAttribute('href')).toBe('/practice')
    expect(await screen.findByText('apple')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Listen to the word apple' })).toBeTruthy()
  })

  it('says good evening late in the day', async () => {
    vi.setSystemTime(new Date(2026, 9, 13, 19, 0))
    renderHome()
    expect(await screen.findByText('Good evening!')).toBeTruthy()
  })

  it('shows no unit picker', async () => {
    renderHome()
    await screen.findByText('Hi, Mai!')

    expect(screen.queryByText(/unit/i)).toBeNull()
    expect(screen.queryByRole('list', { name: 'Units' })).toBeNull()
  })

  it('renames the child from the user menu', async () => {
    renderHome()
    await screen.findByText('Hi, Mai!')

    openUserMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Change name' }))
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '  Lan ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(client.updateProfile).toHaveBeenCalledWith({ name: 'Lan' })
    expect(await screen.findByText('Hi, Lan!')).toBeTruthy()
  })

  it('links to the credits from the user menu', async () => {
    renderHome()
    await screen.findByText('Hi, Mai!')

    openUserMenu()
    expect(screen.getByRole('link', { name: 'Credits' }).getAttribute('href')).toBe('/credits')
    expect(screen.queryByText(/Sign out/)).toBeNull()
  })

  it('asks before it resets progress', async () => {
    client.getProfile.mockResolvedValueOnce({ name: 'Mai', stars: 12 }).mockResolvedValueOnce({ name: 'Mai', stars: 0 })
    renderHome()
    await screen.findByRole('img', { name: '12 stars' })

    openUserMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    expect(screen.getByRole('heading', { name: 'Start over?' })).toBeTruthy()
    expect(client.resetProgress).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, start over' }))

    expect(await screen.findByRole('img', { name: '0 stars' })).toBeTruthy()
    expect(client.resetProgress).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('group', { name: 'Account' })).toBeNull()
  })

  it('keeps progress when the child says no', async () => {
    renderHome()
    await screen.findByText('Hi, Mai!')

    openUserMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'No, keep them' }))

    expect(client.resetProgress).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Reset progress' })).toBeTruthy()
  })

  it('closes the user menu on Escape and on an outside tap', async () => {
    renderHome()
    await screen.findByText('Hi, Mai!')

    openUserMenu()
    expect(screen.getByRole('group', { name: 'Account' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Account' })).toBeNull())

    openUserMenu()
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Account' })).toBeNull())
  })
})
