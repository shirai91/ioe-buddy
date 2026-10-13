import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { add, clear, closeDatabase, get, getAll, put } from './db.js'
import { useFreshBackend } from './testSupport.js'

beforeEach(useFreshBackend)
afterEach(() => vi.unstubAllGlobals())

describe('db', () => {
  it('stores keyed values that survive a new connection', async () => {
    await put('profile', 'me', { name: 'Mai' })
    await put('cards', 'ball', { wordId: 'ball', rating: 'easy' })
    await closeDatabase()

    expect(await get('profile', 'me')).toEqual({ name: 'Mai' })
    expect(await get('profile', 'nobody')).toBeUndefined()
    expect(await getAll('cards')).toEqual([{ wordId: 'ball', rating: 'easy' }])
  })

  it('numbers result rows and clears a store', async () => {
    const first = await add('results', { correct: 3 })
    const second = await add('results', { correct: 5 })

    expect(second.id).toBeGreaterThan(first.id)
    expect(await getAll('results')).toEqual([first, second])

    await clear('results')
    expect(await getAll('results')).toEqual([])
  })
})
