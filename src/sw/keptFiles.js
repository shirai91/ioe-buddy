const PARALLEL_DOWNLOADS = 4

export function isUnderFolder(requestUrl, scopeUrl, folder) {
  const url = new URL(requestUrl)
  const folderRoot = new URL(folder, scopeUrl)
  return url.origin === folderRoot.origin && url.pathname.startsWith(folderRoot.pathname)
}

function fileKey(url) {
  const key = new URL(url)
  key.search = ''
  key.hash = ''
  return key.href
}

async function fetchAndKeep(cache, url) {
  const response = await fetch(url)
  if (response.ok) await cache.put(fileKey(url), response.clone())
  return response
}

export async function respondWithKeptFile(cacheName, request) {
  const cache = await caches.open(cacheName)
  const kept = await cache.match(fileKey(request.url))
  if (kept) return kept
  return fetchAndKeep(cache, request.url)
}

async function keepMissingFile(cache, url) {
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

export async function keepFilesForOffline(cacheName, paths, scopeUrl) {
  const cache = await caches.open(cacheName)
  const urls = [...new Set(paths)].map((path) => new URL(path, scopeUrl).href)
  await downloadInLanes(urls, (url) => keepMissingFile(cache, url))
}
