import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { apiPathFrom, handleApiRequest } from './sw/router.js'
import { isWordAudio, respondWithWordAudio, saveWordAudioForOffline } from './sw/wordAudio.js'
import { isWordPicture, respondWithWordPicture, saveWordPicturesForOffline } from './sw/wordPictures.js'

const CLAIM_CLIENTS_MESSAGE = 'claim-clients'
const SAVE_FOR_OFFLINE_MESSAGE = 'save-for-offline'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === CLAIM_CLIENTS_MESSAGE) {
    event.waitUntil(self.clients.claim())
  }
  if (event.data?.type === SAVE_FOR_OFFLINE_MESSAGE) {
    event.waitUntil(Promise.all([saveWordPicturesForOffline(), saveWordAudioForOffline()]))
  }
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
