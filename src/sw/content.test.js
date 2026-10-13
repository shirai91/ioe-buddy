import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadGrammar, loadIndex, loadSentenceChoices, loadWords } from './content.js'
import { SCOPE, contentIndex, grammar, sentenceChoices, useFreshBackend, words } from './testSupport.js'

let fetchMock

beforeEach(async () => {
  fetchMock = await useFreshBackend()
})
afterEach(() => vi.unstubAllGlobals())

describe('content', () => {
  it('fetches the index relative to the service worker scope and keeps it in memory', async () => {
    expect(await loadIndex()).toEqual(contentIndex)
    await loadIndex()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`${SCOPE}content/index.json`)
  })

  it('loads all words once, sorted by rank', async () => {
    expect(await loadWords()).toEqual(words)
    await loadWords()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledWith(`${SCOPE}content/words.json`)
  })

  it('loads grammar patterns sorted by rank', async () => {
    expect(await loadGrammar()).toEqual(grammar)
    expect(fetchMock).toHaveBeenCalledWith(`${SCOPE}content/grammar.json`)
  })

  it('loads the sentence choices', async () => {
    expect(await loadSentenceChoices()).toEqual(sentenceChoices)
    expect(fetchMock).toHaveBeenCalledWith(`${SCOPE}content/sentence-choices.json`)
  })

  it('gives no sentence choices when the index has no sentence choice file', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ...contentIndex, sentenceChoices: undefined }))

    expect(await loadSentenceChoices()).toEqual([])
  })

  it('rejects an index from the old unit format', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ units: [], credits: [] }))

    await expect(loadIndex()).rejects.toThrow(/version/)
    expect(await loadIndex()).toEqual(contentIndex)
  })

  it('retries after a failed fetch', async () => {
    fetchMock.mockResolvedValueOnce(new Response('down', { status: 503 }))

    await expect(loadIndex()).rejects.toThrow(/503/)
    expect(await loadIndex()).toEqual(contentIndex)
  })

  it('reads precached files before the network', async () => {
    const cachedIndex = { ...contentIndex, credits: [] }
    const match = vi.fn(async (url) => (url === `${SCOPE}content/index.json` ? Response.json(cachedIndex) : undefined))
    vi.stubGlobal('caches', { match })

    expect(await loadIndex()).toEqual(cachedIndex)
    expect(match).toHaveBeenCalledWith(`${SCOPE}content/index.json`, { ignoreSearch: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
