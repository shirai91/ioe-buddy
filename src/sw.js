import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { CLAIM_CLIENTS_MESSAGE, OFFLINE_PROGRESS_MESSAGE, SAVE_FOR_OFFLINE_MESSAGE, SKIP_WAITING_MESSAGE } from './lib/workerMessages.js'
import { saveFilesForOffline } from './sw/offlineFiles.js'
import { apiPathFrom, handleApiRequest } from './sw/router.js'
import { isWordAudio, respondWithWordAudio } from './sw/wordAudio.js'
import { isWordPicture, respondWithWordPicture } from './sw/wordPictures.js'

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function reportOfflineProgress(client) {
  return (done, total) => client?.postMessage({ type: OFFLINE_PROGRESS_MESSAGE, done, total })
}

self.addEventListener('message', (event) => {
  const type = event.data?.type
  if (type === CLAIM_CLIENTS_MESSAGE) event.waitUntil(self.clients.claim())
  if (type === SKIP_WAITING_MESSAGE) event.waitUntil(self.skipWaiting())
  if (type === SAVE_FOR_OFFLINE_MESSAGE) event.waitUntil(saveFilesForOffline(self.registration.scope, reportOfflineProgress(event.source)))
})

self.addEventListener('fetch', (event) => {
  if (isWordPicture(event.request.url, self.registration.scope)) {
    event.respondWith(respondWithWordPicture(event.request))
    return
  }
  if (isWordAudio(event.request.url, self.registration.scope)) {
    event.respondWith(respondWithWordAudio(event.request))
    return
  }
  const apiPath = apiPathFrom(event.request.url, self.registration.scope)
  if (apiPath === null) return
  event.respondWith(handleApiRequest(event.request, apiPath))
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
