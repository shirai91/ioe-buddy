import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { keepFilesForOffline } from './keptFiles.js'
import { fakeCacheStorage } from './testSupport.js'

const SCOPE = 'https://example.test/ioe-buddy/'

let cacheStorage

beforeEach(() => {
  cacheStorage = fakeCacheStorage()
  vi.stubGlobal('caches', cacheStorage.storage)
  vi.stubGlobal('fetch', vi.fn(async (url) => new Response(`file ${url}`)))
})

afterEach(() => vi.unstubAllGlobals())

describe('keepFilesForOffline', () => {
  const fileSets = [
    { cacheName: 'pictures', paths: ['content/images/ball.png', 'content/images/ball.png', 'content/images/book.png'] },
    { cacheName: 'audio', paths: ['content/audio/ball.mp3'] },
  ]

  it('downloads each missing file once into its own cache', async () => {
    await (await caches.open('pictures')).put(`${SCOPE}content/images/book.png`, new Response('kept'))

    await keepFilesForOffline(fileSets, SCOPE)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(cacheStorage.has('pictures', `${SCOPE}content/images/ball.png`)).toBe(true)
    expect(cacheStorage.has('audio', `${SCOPE}content/audio/ball.mp3`)).toBe(true)
  })

  it('reports progress over all files, from none done to all done', async () => {
    const progress = []

    await keepFilesForOffline(fileSets, SCOPE, (done, total) => progress.push([done, total]))

    expect(progress).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('counts a file that fails to download as done, so the progress always ends', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    const progress = []

    await keepFilesForOffline(fileSets, SCOPE, (done, total) => progress.push([done, total]))

    expect(progress.at(-1)).toEqual([3, 3])
  })
})
