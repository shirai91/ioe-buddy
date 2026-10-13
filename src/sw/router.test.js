import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from './httpError.js'
import { apiPathFrom, apiRoutes, createRouter, handleApiRequest } from './router.js'
import { SCOPE, apiRequest, useFreshBackend } from './testSupport.js'

beforeEach(useFreshBackend)
afterEach(() => vi.unstubAllGlobals())

describe('apiPathFrom', () => {
  it('returns the path after <scope>api/', () => {
    expect(apiPathFrom(`${SCOPE}api/flashcards/ball/rate?x=1`, SCOPE)).toBe('flashcards/ball/rate')
  })

  it('ignores non-api and cross-origin requests', () => {
    expect(apiPathFrom(`${SCOPE}content/index.json`, SCOPE)).toBeNull()
    expect(apiPathFrom('https://elsewhere.test/ioe-buddy/api/units', SCOPE)).toBeNull()
    expect(apiPathFrom('https://example.test/api/units', SCOPE)).toBeNull()
  })
})

describe('createRouter', () => {
  it('matches method and path pattern and passes params and query', async () => {
    const handler = vi.fn(({ params, query }) => ({ params, query }))
    const router = createRouter([['GET', 'things/:id/parts/:partId', handler]])

    const response = await router.handle(apiRequest('things/a%20b/parts/7?unit=unit-02'), 'things/a%20b/parts/7')

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(await response.json()).toEqual({ params: { id: 'a b', partId: '7' }, query: { unit: 'unit-02' } })
  })

  it('refuses page navigations so another site cannot post a form to the API', async () => {
    const handler = vi.fn(() => ({ ok: true }))
    const router = createRouter([['POST', 'reset', handler]])
    const formPost = { method: 'POST', mode: 'navigate', url: `${SCOPE}api/reset`, text: async () => '' }

    const response = await router.handle(formPost, 'reset')

    expect(response.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 404 with an error for an unknown path or method', async () => {
    const router = createRouter([['GET', 'things', () => []]])

    const unknownPath = await router.handle(apiRequest('nope'), 'nope')
    const wrongMethod = await router.handle(apiRequest('things', { method: 'DELETE' }), 'things')

    expect(unknownPath.status).toBe(404)
    expect(await unknownPath.json()).toEqual({ error: expect.any(String) })
    expect(wrongMethod.status).toBe(404)
  })

  it('parses a JSON body', async () => {
    const router = createRouter([['POST', 'echo', ({ body }) => body]])
    const request = apiRequest('echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'easy', count: 3 }),
    })

    const response = await router.handle(request, 'echo')

    expect(await response.json()).toEqual({ rating: 'easy', count: 3 })
  })

  it('returns 400 for a body that is not JSON', async () => {
    const router = createRouter([['POST', 'echo', ({ body }) => body]])

    const response = await router.handle(apiRequest('echo', { method: 'POST', body: '{oops' }), 'echo')

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.any(String) })
  })

  it('returns 500 when a handler throws, and the HttpError status when it throws one', async () => {
    const router = createRouter([
      ['GET', 'boom', () => Promise.reject(new Error('kaboom'))],
      ['GET', 'missing', () => Promise.reject(new HttpError(404, 'gone'))],
    ])

    const boom = await router.handle(apiRequest('boom'), 'boom')
    const missing = await router.handle(apiRequest('missing'), 'missing')

    expect(boom.status).toBe(500)
    expect(await boom.json()).toEqual({ error: 'kaboom' })
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'gone' })
  })
})

describe('api routes', () => {
  it('registers every contract route', () => {
    const registered = apiRoutes.map(([method, pattern]) => `${method} ${pattern}`)
    expect(registered).toEqual([
      'GET profile',
      'PUT profile',
      'GET word-of-the-day',
      'GET flashcards',
      'POST flashcards/:wordId/rate',
      'GET exams/:type',
      'POST exams/:type/results',
      'GET credits',
      'POST reset',
    ])
  })

  it('serves contract-shaped data end to end', async () => {
    const profile = await (await handleApiRequest(apiRequest('profile'), 'profile')).json()
    expect(profile).toEqual({ name: 'Buddy', stars: 0 })

    const flashcards = await (await handleApiRequest(apiRequest('flashcards'), 'flashcards')).json()
    expect(flashcards.cards[0]).toEqual(expect.objectContaining({ id: expect.any(String), key: expect.any(String), kind: expect.any(String), box: expect.any(Number) }))

    const exam = await handleApiRequest(apiRequest('exams/picture-pick'), 'exams/picture-pick')
    expect(await exam.json()).toEqual({ type: 'picture-pick', questions: expect.any(Array) })

    const unknownExam = await handleApiRequest(apiRequest('exams/nope'), 'exams/nope')
    expect(unknownExam.status).toBe(404)

    const units = await handleApiRequest(apiRequest('units'), 'units')
    expect(units.status).toBe(404)
  })
})
