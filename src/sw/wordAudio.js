import { createPartialResponse } from 'workbox-range-requests'
import { CLIP_FOLDER, clipPath, spokenPhrases } from '../lib/clips.js'
import { loadIndex, loadWords } from './content.js'
import { deleteOldVersions, isUnderFolder, respondWithKeptFile } from './keptFiles.js'

const WORD_AUDIO_CACHE_PREFIX = 'word-audio-'

export async function wordAudioCacheName() {
  const index = await loadIndex()
  return `${WORD_AUDIO_CACHE_PREFIX}${index.fileVersions?.audio}`
}

export function isWordAudio(requestUrl, scopeUrl) {
  return isUnderFolder(requestUrl, scopeUrl, CLIP_FOLDER)
}

export async function respondWithWordAudio(request) {
  const response = await respondWithKeptFile(await wordAudioCacheName(), request)
  const asksForPart = request.headers.has('range') && response.status === 200
  return asksForPart ? createPartialResponse(request, response) : response
}

export async function wordAudioToKeep() {
  const [cacheName, words] = await Promise.all([wordAudioCacheName(), loadWords()])
  await deleteOldVersions(WORD_AUDIO_CACHE_PREFIX, cacheName)
  return { cacheName, paths: spokenPhrases(words).map(clipPath) }
}
