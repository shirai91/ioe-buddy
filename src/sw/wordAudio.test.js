import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCountWords, loadIndex, loadSentenceChoices, loadWords } from './content.js'
import { fakeCacheStorage } from './testSupport.js'
import { isWordAudio, respondWithWordAudio, wordAudioToKeep } from './wordAudio.js'

vi.hoisted(() => {
  globalThis.self ??= globalThis
})
vi.mock('./content.js', () => ({ loadCountWords: vi.fn(), loadIndex: vi.fn(), loadSentenceChoices: vi.fn(), loadWords: vi.fn() }))

const SCOPE = 'https://example.test/ioe-buddy/'

let cacheStorage

beforeEach(() => {
  cacheStorage = fakeCacheStorage()
  vi.stubGlobal('caches', cacheStorage.storage)
  vi.stubGlobal('fetch', vi.fn(async () => new Response('0123456789', { headers: { 'content-type': 'audio/mpeg' } })))
  vi.mocked(loadIndex).mockResolvedValue({ fileVersions: { pictures: 'abc123', audio: 'def456' } })
})

afterEach(() => vi.unstubAllGlobals())

describe('isWordAudio', () => {
  it('matches only clips under <scope>content/audio/', () => {
    expect(isWordAudio(`${SCOPE}content/audio/ball.mp3`, SCOPE)).toBe(true)
    expect(isWordAudio(`${SCOPE}content/images/ball.png`, SCOPE)).toBe(false)
  })
})

describe('respondWithWordAudio', () => {
  it('downloads a clip once and then answers from the cache of this audio version', async () => {
    const request = new Request(`${SCOPE}content/audio/ball.mp3`)

    await respondWithWordAudio(request)
    const second = await respondWithWordAudio(request)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await second.text()).toBe('0123456789')
    expect(cacheStorage.has('word-audio-def456', `${SCOPE}content/audio/ball.mp3`)).toBe(true)
  })

  it('answers a range request with only that part, so phones can play the cached clip', async () => {
    const request = new Request(`${SCOPE}content/audio/ball.mp3`, { headers: { range: 'bytes=2-5' } })

    const response = await respondWithWordAudio(request)

    expect(response.status).toBe(206)
    expect(await response.text()).toBe('2345')
  })
})

describe('wordAudioToKeep', () => {
  it('lists the clip of every phrase the app can say and deletes old audio versions', async () => {
    vi.mocked(loadWords).mockResolvedValue([{ word: 'ball', sentence: 'I see a ball.' }])
    vi.mocked(loadCountWords).mockResolvedValue([{ word: 'book', plural: 'books' }])
    vi.mocked(loadSentenceChoices).mockResolvedValue([{ before: 'How many ', after: '?', sentence: 'How many pots?' }])
    await caches.open('word-audio-v1')

    const { cacheName, paths } = await wordAudioToKeep()

    expect(cacheName).toBe('word-audio-def456')
    for (const name of ['ball', 'i-see-a-ball', 'how-many-pots', 'how-many-what', 'i-can-see-three-books', 'find-the-ball', 'great-job', 'try-again', 'super', 'a']) {
      expect(paths).toContain(`content/audio/${name}.mp3`)
    }
    expect(cacheStorage.caches.has('word-audio-v1')).toBe(false)
  })
})
