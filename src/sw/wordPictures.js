import { loadWords } from './content.js'
import { isUnderFolder, keepFilesForOffline, respondWithKeptFile } from './keptFiles.js'

export const WORD_PICTURE_CACHE = 'word-pictures-v1'
const WORD_PICTURE_FOLDER = 'content/images/'

export function isWordPicture(requestUrl, scopeUrl) {
  return isUnderFolder(requestUrl, scopeUrl, WORD_PICTURE_FOLDER)
}

export function respondWithWordPicture(request) {
  return respondWithKeptFile(WORD_PICTURE_CACHE, request)
}

export async function saveWordPicturesForOffline(scopeUrl = globalThis.registration?.scope) {
  const words = await loadWords()
  await keepFilesForOffline(WORD_PICTURE_CACHE, words.map((word) => word.image).filter(Boolean), scopeUrl)
}
