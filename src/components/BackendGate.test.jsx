import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onBackendStage, waitForBackend } from '../api/client.js'
import BackendGate, { GIVE_UP_MS, SLOW_START_MS } from './BackendGate.jsx'

vi.mock('../api/client.js', () => ({
  onBackendStage: vi.fn(),
  waitForBackend: vi.fn(),
}))

let reportStage

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(onBackendStage).mockImplementation((listener) => {
    reportStage = listener
    listener('opening')
    return () => {}
  })
  vi.mocked(waitForBackend).mockReturnValue(new Promise(() => {}))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderGate() {
  return render(
    <BackendGate>
      <p>The app</p>
    </BackendGate>,
  )
}

describe('BackendGate', () => {
  it('shows each start step as the backend moves forward', () => {
    renderGate()
    expect(screen.getByRole('status').textContent).toBe('Step 1 of 3: Opening the app…')

    act(() => reportStage('downloading'))
    expect(screen.getByRole('status').textContent).toBe('Step 2 of 3: Downloading the app…')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2')

    act(() => reportStage('starting'))
    expect(screen.getByRole('status').textContent).toBe('Step 3 of 3: Almost ready…')
  })

  it('tells the learner to wait and offers a reload when the start is slow', () => {
    renderGate()
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull()

    act(() => vi.advanceTimersByTime(SLOW_START_MS))
    expect(screen.getByText('This takes a little longer the first time. Please wait.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
  })

  it('stops waiting after the give-up time', () => {
    renderGate()
    act(() => vi.advanceTimersByTime(GIVE_UP_MS))
    expect(screen.getByRole('heading', { name: 'Still not ready' })).toBeTruthy()
  })

  it('shows the app when the backend is ready', async () => {
    vi.mocked(waitForBackend).mockResolvedValue()
    renderGate()
    await act(async () => {})
    expect(screen.getByText('The app')).toBeTruthy()
  })
})
