import { precacheAndRoute } from 'workbox-precaching'
import { apiPathFrom, handleApiRequest } from './sw/router.js'

const CLAIM_CLIENTS_MESSAGE = 'claim-clients'

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
})

self.addEventListener('fetch', (event) => {
  const apiPath = apiPathFrom(event.request.url, self.registration.scope)
  if (apiPath === null) return
  event.respondWith(handleApiRequest(event.request, apiPath))
})

precacheAndRoute(self.__WB_MANIFEST)
