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

export async function deleteOldVersions(cachePrefix, currentName) {
  const names = await caches.keys()
  const oldNames = names.filter((name) => name.startsWith(cachePrefix) && name !== currentName)
  await Promise.all(oldNames.map((name) => caches.delete(name)))
}

async function keepMissingFile(cache, url) {
  if (await cache.match(url)) return
  try {
    await fetchAndKeep(cache, url)
  } catch {
    return
  }
}

async function downloadInLanes(items, download) {
  const queue = [...items]
  const lane = async () => {
    while (queue.length > 0) await download(queue.shift())
  }
  await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, lane))
}

async function filesOf({ cacheName, paths }, scopeUrl) {
  const cache = await caches.open(cacheName)
  return [...new Set(paths)].map((path) => ({ cache, url: new URL(path, scopeUrl).href }))
}

export async function keepFilesForOffline(fileSets, scopeUrl, onProgress = () => {}) {
  const files = (await Promise.all(fileSets.map((fileSet) => filesOf(fileSet, scopeUrl)))).flat()
  let done = 0
  onProgress(done, files.length)
  await downloadInLanes(files, async ({ cache, url }) => {
    await keepMissingFile(cache, url)
    done += 1
    onProgress(done, files.length)
  })
}
