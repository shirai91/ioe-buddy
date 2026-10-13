import { IDBFactory } from 'fake-indexeddb'
import { vi } from 'vitest'
import { clearContentCache } from './content.js'
import { closeDatabase } from './db.js'

export const SCOPE = 'https://example.test/ioe-buddy/'

export function makeWord({ id, letter = `${id[0].toUpperCase()}${id[0]}`, unit = 1, lesson = 1, position = 1 }) {
  return {
    id,
    word: id,
    letter,
    ipa: `/${id}/`,
    vi: `vi-${id}`,
    sentence: `This is a ${id}.`,
    image: `content/images/${id}.png`,
    unit,
    lesson,
    rank: unit * 1000 + lesson * 100 + position,
  }
}

export const words = [
  makeWord({ id: 'ball', unit: 1, lesson: 1, position: 1 }),
  makeWord({ id: 'book', unit: 1, lesson: 1, position: 2 }),
  makeWord({ id: 'bike', unit: 1, lesson: 2, position: 1 }),
  makeWord({ id: 'bag', unit: 1, lesson: 3, position: 1 }),
  makeWord({ id: 'car', unit: 2, lesson: 1, position: 1 }),
  makeWord({ id: 'cat', unit: 2, lesson: 1, position: 2 }),
  makeWord({ id: 'cup', unit: 2, lesson: 2, position: 1 }),
  makeWord({ id: 'cake', unit: 2, lesson: 3, position: 1 }),
  makeWord({ id: 'dog', unit: 3, lesson: 1, position: 1 }),
  makeWord({ id: 'duck', unit: 3, lesson: 1, position: 2 }),
  makeWord({ id: 'doll', unit: 3, lesson: 2, position: 1 }),
  makeWord({ id: 'desk', unit: 3, lesson: 3, position: 1 }),
]

export const grammar = [
  { id: 'hi-i-am', pattern: "Hi, I'm Bill.", unit: 1, lesson: 1, rank: 1101 },
  { id: 'i-have-a', pattern: 'I have a car.', unit: 2, lesson: 1, rank: 2101 },
]

export const contentIndex = {
  version: 2,
  wordCount: words.length,
  grammarCount: grammar.length,
  words: 'content/words.json',
  grammar: 'content/grammar.json',
  credits: [{ word: 'ball', image: 'content/images/ball.png', source: 'test', author: 'me', license: 'CC0' }],
}

export const contentFiles = {
  [`${SCOPE}content/index.json`]: contentIndex,
  [`${SCOPE}content/words.json`]: [...words].reverse(),
  [`${SCOPE}content/grammar.json`]: [...grammar].reverse(),
}

export function contentFetch() {
  return vi.fn(async (url) => {
    const body = contentFiles[String(url)]
    if (!body) return new Response('missing', { status: 404 })
    return Response.json(body)
  })
}

export async function useFreshBackend() {
  await closeDatabase()
  clearContentCache()
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('registration', { scope: SCOPE })
  const fetchMock = contentFetch()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function apiRequest(path, init) {
  return new Request(`${SCOPE}api/${path}`, init)
}

export function jsonInit(method, body) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
