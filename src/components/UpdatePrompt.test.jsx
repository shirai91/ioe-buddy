import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installUpdate, onUpdateReady } from '../api/client.js'
import UpdatePrompt from './UpdatePrompt.jsx'

vi.mock('../api/client.js', () => ({
  installUpdate: vi.fn(),
  onUpdateReady: vi.fn(),
}))

let reportUpdateReady
let reportProgress

beforeEach(() => {
  vi.mocked(onUpdateReady).mockImplementation((listener) => {
    reportUpdateReady = listener
    return () => {}
  })
  vi.mocked(installUpdate).mockImplementation((onProgress) => {
    reportProgress = onProgress
    return new Promise(() => {})
  })
})

describe('UpdatePrompt', () => {
  it('shows nothing while there is no new version', () => {
    render(<UpdatePrompt />)

    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('asks the learner to update when a new version is ready', () => {
    render(<UpdatePrompt />)
    act(() => reportUpdateReady())

    expect(screen.getByRole('alertdialog', { name: 'Time to update!' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Update now' }))
  })

  it('installs the update and shows the download progress', () => {
    render(<UpdatePrompt />)
    act(() => reportUpdateReady())

    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(installUpdate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Update now' })).toBeNull()
    expect(screen.getByText('Updating… 0%')).toBeTruthy()

    act(() => reportProgress(150, 300))
    expect(screen.getByText('Updating… 50%')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50')

    act(() => reportProgress(300, 300))
    expect(screen.getByText('Starting the new version…')).toBeTruthy()
  })
})
