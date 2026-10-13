import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speak } from './speak.js'

describe('speak', () => {
  let spoken

  beforeEach(() => {
    spoken = []
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (utterance) => spoken.push(utterance.text) })
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        constructor(text) {
          this.text = text
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends lowercase text so a lone "I" is not read as "capital I"', () => {
    speak('I')
    speak('Great job! I')

    expect(spoken).toEqual(['i', 'great job! i'])
  })
})
