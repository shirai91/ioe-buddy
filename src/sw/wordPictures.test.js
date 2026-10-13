import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadIndex, loadWords } from './content.js'
import { fakeCacheStorage } from './testSupport.js'
import { isWordPicture, respondWithWordPicture, wordPicturesToKeep } from './wordPictures.js'

vi.mock('./content.js', () => ({ loadIndex: vi.fn(), loadWords: vi.fn() }))

const SCOPE = 'https://example.test/ioe-buddy/'

let cacheStorage

beforeEach(() => {
  cacheStorage = fakeCacheStorage()
  vi.stubGlobal('caches', cacheStorage.storage)
  vi.stubGlobal('fetch', vi.fn(async (url) => new Response(`picture of ${url}`)))
  vi.mocked(loadIndex).mockResolvedValue({ fileVersions: { pictures: 'abc123', audio: 'def456' } })
})

afterEach(() => vi.unstubAllGlobals())

describe('isWordPicture', () => {
  it('matches only pictures under <scope>content/images/', () => {
    expect(isWordPicture(`${SCOPE}content/images/ball.png`, SCOPE)).toBe(true)
    expect(isWordPicture(`${SCOPE}content/words.json`, SCOPE)).toBe(false)
    expect(isWordPicture('https://other.test/ioe-buddy/content/images/ball.png', SCOPE)).toBe(false)
  })
})

describe('respondWithWordPicture', () => {
  it('downloads a picture once and then answers from the cache of this picture version', async () => {
    const request = new Request(`${SCOPE}content/images/ball.png`)

    await respondWithWordPicture(request)
    const second = await respondWithWordPicture(request)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await second.text()).toBe(`picture of ${SCOPE}content/images/ball.png`)
    expect(cacheStorage.has('word-pictures-abc123', `${SCOPE}content/images/ball.png`)).toBe(true)
  })

  it('downloads the picture again when the picture version changes', async () => {
    const request = new Request(`${SCOPE}content/images/ball.png`)
    await respondWithWordPicture(request)

    vi.mocked(loadIndex).mockResolvedValue({ fileVersions: { pictures: 'new999' } })
    await respondWithWordPicture(request)

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('wordPicturesToKeep', () => {
  it('lists the picture of each word for the cache of this picture version', async () => {
    vi.mocked(loadWords).mockResolvedValue([
      { id: 'ball', image: 'content/images/ball.png' },
      { id: 'hi', image: null },
    ])

    expect(await wordPicturesToKeep()).toEqual({ cacheName: 'word-pictures-abc123', paths: ['content/images/ball.png'] })
  })

  it('deletes the caches of old picture versions and keeps other caches', async () => {
    vi.mocked(loadWords).mockResolvedValue([])
    for (const name of ['word-pictures-v1', 'word-pictures-old111', 'word-audio-def456']) await caches.open(name)

    await wordPicturesToKeep()

    expect([...cacheStorage.caches.keys()].sort()).toEqual(['word-audio-def456'])
  })
})
