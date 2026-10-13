import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let speak
let spokenByVoice
let played
let missingClips

class FakeAudio {
  constructor() {
    this.src = ''
  }

  pause() {}

  play() {
    played.push(this.src)
    const clip = this.src
    setTimeout(() => (missingClips.includes(clip) ? this.onerror?.(new Event('error')) : this.onended?.()))
    return Promise.resolve()
  }
}

async function settle() {
  await vi.runAllTimersAsync()
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  spokenByVoice = []
  played = []
  missingClips = []
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('speechSynthesis', { speaking: false, pending: false, cancel: vi.fn(), speak: (utterance) => spokenByVoice.push(utterance.text) })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(text) {
        this.text = text
      }
    },
  )
  ;({ speak } = await import('./speak.js'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('speak', () => {
  it('plays the recorded clip of the text', async () => {
    speak('Great job!')
    await settle()

    expect(played).toEqual(['/content/audio/great-job.mp3'])
    expect(spokenByVoice).toEqual([])
  })

  it('plays the clips of each part one after the other', async () => {
    speak('Great job!', 'ball')
    await settle()

    expect(played).toEqual(['/content/audio/great-job.mp3', '/content/audio/ball.mp3'])
  })

  it('uses the browser voice in lowercase for the parts that have no clip', async () => {
    missingClips = ['/content/audio/kite.mp3']

    speak('Great job!', 'kite', 'I')
    await settle()

    expect(spokenByVoice).toEqual(['kite i'])
  })

  it('stops the old clips when new speech starts', async () => {
    speak('Great job!', 'ball')
    speak('Try again')
    await settle()

    expect(played).toEqual(['/content/audio/great-job.mp3', '/content/audio/try-again.mp3'])
  })
})
