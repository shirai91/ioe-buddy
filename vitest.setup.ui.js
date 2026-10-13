import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

globalThis.HTMLMediaElement.prototype.play = () => Promise.resolve()
globalThis.HTMLMediaElement.prototype.pause = () => {}

afterEach(() => {
  cleanup()
})
