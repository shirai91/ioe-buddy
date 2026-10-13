import { loadWords } from './content.js'

export const WORD_PICTURE_CACHE = 'word-pictures-v1'
const WORD_PICTURE_FOLDER = 'content/images/'
const PARALLEL_DOWNLOADS = 4

export function isWordPicture(requestUrl, scopeUrl) {
  const url = new URL(requestUrl)
  const pictureRoot = new URL(WORD_PICTURE_FOLDER, scopeUrl)
  return url.origin === pictureRoot.origin && url.pathname.startsWith(pictureRoot.pathname)
}

function pictureKey(url) {
  const key = new URL(url)
  key.search = ''
  key.hash = ''
  return key.href
}

async function fetchAndKeep(cache, url) {
  const response = await fetch(url)
  if (response.ok) await cache.put(pictureKey(url), response.clone())
  return response
}

export async function respondWithWordPicture(request) {
  const cache = await caches.open(WORD_PICTURE_CACHE)
  const kept = await cache.match(pictureKey(request.url))
  if (kept) return kept
  return fetchAndKeep(cache, request.url)
}

function pictureUrls(words, scopeUrl) {
  const paths = words.map((word) => word.image).filter(Boolean)
  return [...new Set(paths)].map((path) => new URL(path, scopeUrl).href)
}

async function keepMissingPicture(cache, url) {
  if (await cache.match(url)) return
  try {
    await fetchAndKeep(cache, url)
  } catch {
    return
  }
}

async function downloadInLanes(urls, download) {
  const queue = [...urls]
  const lane = async () => {
    while (queue.length > 0) await download(queue.shift())
  }
  await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, lane))
}

export async function saveWordPicturesForOffline(scopeUrl = globalThis.registration?.scope) {
  const [cache, words] = await Promise.all([caches.open(WORD_PICTURE_CACHE), loadWords()])
  await downloadInLanes(pictureUrls(words, scopeUrl), (url) => keepMissingPicture(cache, url))
}
