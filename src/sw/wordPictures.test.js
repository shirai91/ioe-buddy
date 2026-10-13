import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadWords } from './content.js'
import { isWordPicture, respondWithWordPicture, saveWordPicturesForOffline } from './wordPictures.js'

vi.mock('./content.js', () => ({ loadWords: vi.fn() }))

const SCOPE = 'https://example.test/ioe-buddy/'

function fakeCacheStorage() {
  const entries = new Map()
  const cache = {
    match: vi.fn(async (key) => entries.get(typeof key === 'string' ? key : key.url)),
    put: vi.fn(async (key, response) => entries.set(key, response)),
  }
  return { entries, storage: { open: vi.fn(async () => cache) } }
}

let cacheStorage

beforeEach(() => {
  cacheStorage = fakeCacheStorage()
  vi.stubGlobal('caches', cacheStorage.storage)
  vi.stubGlobal('fetch', vi.fn(async (url) => new Response(`picture of ${url}`)))
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
  it('downloads a picture once and then answers from the cache', async () => {
    const request = new Request(`${SCOPE}content/images/ball.png`)

    await respondWithWordPicture(request)
    const second = await respondWithWordPicture(request)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await second.text()).toBe(`picture of ${SCOPE}content/images/ball.png`)
  })
})

describe('saveWordPicturesForOffline', () => {
  it('keeps every word picture that is not cached yet, once each', async () => {
    vi.mocked(loadWords).mockResolvedValue([
      { id: 'ball', image: 'content/images/ball.png' },
      { id: 'book', image: 'content/images/book.png' },
      { id: 'hi', image: null },
    ])
    cacheStorage.entries.set(`${SCOPE}content/images/book.png`, new Response('kept'))

    await saveWordPicturesForOffline(SCOPE)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(`${SCOPE}content/images/ball.png`)
    expect(cacheStorage.entries.has(`${SCOPE}content/images/ball.png`)).toBe(true)
  })

  it('skips a picture that fails to download', async () => {
    vi.mocked(loadWords).mockResolvedValue([{ id: 'ball', image: 'content/images/ball.png' }])
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))

    await expect(saveWordPicturesForOffline(SCOPE)).resolves.toBeUndefined()
  })
})
