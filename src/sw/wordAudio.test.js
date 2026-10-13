import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadWords } from './content.js'
import { isWordAudio, respondWithWordAudio, saveWordAudioForOffline } from './wordAudio.js'

vi.hoisted(() => {
  globalThis.self ??= globalThis
})
vi.mock('./content.js', () => ({ loadWords: vi.fn() }))

const SCOPE = 'https://example.test/ioe-buddy/'

let entries

beforeEach(() => {
  entries = new Map()
  const cache = {
    match: vi.fn(async (key) => entries.get(typeof key === 'string' ? key : key.url)?.clone()),
    put: vi.fn(async (key, response) => entries.set(key, response)),
  }
  vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
  vi.stubGlobal('fetch', vi.fn(async () => new Response('0123456789', { headers: { 'content-type': 'audio/mpeg' } })))
})

afterEach(() => vi.unstubAllGlobals())

describe('isWordAudio', () => {
  it('matches only clips under <scope>content/audio/', () => {
    expect(isWordAudio(`${SCOPE}content/audio/ball.mp3`, SCOPE)).toBe(true)
    expect(isWordAudio(`${SCOPE}content/images/ball.png`, SCOPE)).toBe(false)
  })
})

describe('respondWithWordAudio', () => {
  it('downloads a clip once and then answers from the cache', async () => {
    const request = new Request(`${SCOPE}content/audio/ball.mp3`)

    await respondWithWordAudio(request)
    const second = await respondWithWordAudio(request)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await second.text()).toBe('0123456789')
  })

  it('answers a range request with only that part, so phones can play the cached clip', async () => {
    const request = new Request(`${SCOPE}content/audio/ball.mp3`, { headers: { range: 'bytes=2-5' } })

    const response = await respondWithWordAudio(request)

    expect(response.status).toBe(206)
    expect(await response.text()).toBe('2345')
  })
})

describe('saveWordAudioForOffline', () => {
  it('keeps the clip of every phrase the app can say', async () => {
    vi.mocked(loadWords).mockResolvedValue([{ word: 'ball', sentence: 'I see a ball.' }])

    await saveWordAudioForOffline(SCOPE)

    for (const name of ['ball', 'i-see-a-ball', 'find-the-ball', 'great-job', 'try-again', 'super', 'a']) {
      expect(entries.has(`${SCOPE}content/audio/${name}.mp3`)).toBe(true)
    }
  })
})
