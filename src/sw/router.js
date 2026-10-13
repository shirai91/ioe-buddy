import { getCredits } from './handlers/credits.js'
import { getExam, postExamResult } from './handlers/exams.js'
import { listFlashcards, rateFlashcard } from './handlers/flashcards.js'
import { getProfile, updateProfile } from './handlers/profile.js'
import { resetProgress } from './handlers/reset.js'
import { getWordOfTheDay } from './handlers/wordOfTheDay.js'
import { HttpError, badRequest } from './httpError.js'

const API_PREFIX = 'api/'
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD'])

export const apiRoutes = [
  ['GET', 'profile', getProfile],
  ['PUT', 'profile', updateProfile],
  ['GET', 'word-of-the-day', getWordOfTheDay],
  ['GET', 'flashcards', listFlashcards],
  ['POST', 'flashcards/:wordId/rate', rateFlashcard],
  ['GET', 'exams/:type', getExam],
  ['POST', 'exams/:type/results', postExamResult],
  ['GET', 'credits', getCredits],
  ['POST', 'reset', resetProgress],
]

export function apiPathFrom(requestUrl, scopeUrl) {
  const url = new URL(requestUrl)
  const scope = new URL(scopeUrl)
  if (url.origin !== scope.origin) return null
  const apiRoot = scope.pathname + API_PREFIX
  if (!url.pathname.startsWith(apiRoot)) return null
  return url.pathname.slice(apiRoot.length)
}

function splitPath(path) {
  return path.split('/').filter(Boolean)
}

function compileRoute([method, pattern, handler]) {
  return { method, segments: splitPath(pattern), handler }
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

function matchSegments(routeSegments, pathSegments) {
  if (routeSegments.length !== pathSegments.length) return null
  const params = {}
  for (const [index, routeSegment] of routeSegments.entries()) {
    const pathSegment = decodeSegment(pathSegments[index])
    if (pathSegment === null) return null
    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = pathSegment
    } else if (routeSegment !== pathSegment) {
      return null
    }
  }
  return params
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function readJsonBody(request) {
  if (METHODS_WITHOUT_BODY.has(request.method)) return undefined
  const text = await request.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw badRequest('Request body is not valid JSON')
  }
}

function errorResponse(error) {
  if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status)
  return jsonResponse({ error: error?.message || 'Something went wrong' }, 500)
}

function isPageNavigation(request) {
  return request.mode === 'navigate'
}

export function createRouter(routeTable) {
  const routes = routeTable.map(compileRoute)

  function findRoute(method, path) {
    const pathSegments = splitPath(path)
    for (const route of routes) {
      if (route.method !== method) continue
      const params = matchSegments(route.segments, pathSegments)
      if (params) return { handler: route.handler, params }
    }
    return null
  }

  async function handle(request, path) {
    if (isPageNavigation(request)) return jsonResponse({ error: 'The API does not accept page navigations' }, 403)
    const match = findRoute(request.method, path)
    if (!match) return jsonResponse({ error: `No route for ${request.method} ${API_PREFIX}${path}` }, 404)
    try {
      const query = Object.fromEntries(new URL(request.url).searchParams)
      const body = await readJsonBody(request)
      const data = await match.handler({ params: match.params, query, body, request })
      return jsonResponse(data ?? null)
    } catch (error) {
      return errorResponse(error)
    }
  }

  return { findRoute, handle }
}

const apiRouter = createRouter(apiRoutes)

export function handleApiRequest(request, path) {
  return apiRouter.handle(request, path)
}
