import { loadIndex, loadWords } from './content.js'
import { deleteOldVersions, isUnderFolder, respondWithKeptFile } from './keptFiles.js'

const WORD_PICTURE_CACHE_PREFIX = 'word-pictures-'
const WORD_PICTURE_FOLDER = 'content/images/'

export async function wordPictureCacheName() {
  const index = await loadIndex()
  return `${WORD_PICTURE_CACHE_PREFIX}${index.fileVersions?.pictures}`
}

export function isWordPicture(requestUrl, scopeUrl) {
  return isUnderFolder(requestUrl, scopeUrl, WORD_PICTURE_FOLDER)
}

export async function respondWithWordPicture(request) {
  return respondWithKeptFile(await wordPictureCacheName(), request)
}

export async function wordPicturesToKeep() {
  const [cacheName, words] = await Promise.all([wordPictureCacheName(), loadWords()])
  await deleteOldVersions(WORD_PICTURE_CACHE_PREFIX, cacheName)
  return { cacheName, paths: words.map((word) => word.image).filter(Boolean) }
}
