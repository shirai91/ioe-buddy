import { createPartialResponse } from 'workbox-range-requests'
import { CLIP_FOLDER, clipPath, spokenPhrases } from '../lib/clips.js'
import { loadWords } from './content.js'
import { isUnderFolder, keepFilesForOffline, respondWithKeptFile } from './keptFiles.js'

export const WORD_AUDIO_CACHE = 'word-audio-v1'

export function isWordAudio(requestUrl, scopeUrl) {
  return isUnderFolder(requestUrl, scopeUrl, CLIP_FOLDER)
}

export async function respondWithWordAudio(request) {
  const response = await respondWithKeptFile(WORD_AUDIO_CACHE, request)
  const asksForPart = request.headers.has('range') && response.status === 200
  return asksForPart ? createPartialResponse(request, response) : response
}

export async function saveWordAudioForOffline(scopeUrl = globalThis.registration?.scope) {
  const words = await loadWords()
  await keepFilesForOffline(WORD_AUDIO_CACHE, spokenPhrases(words).map(clipPath), scopeUrl)
}
