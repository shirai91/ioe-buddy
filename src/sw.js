import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { apiPathFrom, handleApiRequest } from './sw/router.js'
import { isWordPicture, respondWithWordPicture, saveWordPicturesForOffline } from './sw/wordPictures.js'

const CLAIM_CLIENTS_MESSAGE = 'claim-clients'
const SAVE_PICTURES_MESSAGE = 'save-pictures'

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
  if (event.data?.type === SAVE_PICTURES_MESSAGE) {
    event.waitUntil(saveWordPicturesForOffline())
  }
})

self.addEventListener('fetch', (event) => {
  if (isWordPicture(event.request.url, self.registration.scope)) {
    event.respondWith(respondWithWordPicture(event.request))
    return
  }
  const apiPath = apiPathFrom(event.request.url, self.registration.scope)
  if (apiPath === null) return
  event.respondWith(handleApiRequest(event.request, apiPath))
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
