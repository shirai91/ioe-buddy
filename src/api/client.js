import { CLAIM_CLIENTS_MESSAGE, OFFLINE_PROGRESS_MESSAGE, SAVE_FOR_OFFLINE_MESSAGE, SKIP_WAITING_MESSAGE } from '../lib/workerMessages.js'

const API_ROOT = 'api/'
export const UPDATE_GIVE_UP_MS = 120000

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function serviceWorkerRegistrationArgs() {
  const base = import.meta.env.BASE_URL
  if (import.meta.env.DEV) return [`${base}dev-sw.js?dev-sw`, { scope: base, type: 'module' }]
  return [`${base}sw.js`, { scope: base }]
}

function waitForController(container) {
  if (container.controller) return Promise.resolve()
  return new Promise((resolve) => {
    container.addEventListener('controllerchange', () => resolve(), { once: true })
  })
}

export const BACKEND_STAGES = ['opening', 'downloading', 'starting', 'ready']

let backendStage = BACKEND_STAGES[0]
const backendStageListeners = new Set()

function reportBackendStage(stage) {
  if (BACKEND_STAGES.indexOf(stage) <= BACKEND_STAGES.indexOf(backendStage)) return
  backendStage = stage
  for (const listener of backendStageListeners) listener(stage)
}

export function onBackendStage(listener) {
  backendStageListeners.add(listener)
  listener(backendStage)
  return () => backendStageListeners.delete(listener)
}

function stageOfWorker(worker) {
  return worker.state === 'installing' || worker.state === 'parsed' ? 'downloading' : 'starting'
}

function followWorker(worker) {
  if (!worker) return
  reportBackendStage(stageOfWorker(worker))
  worker.addEventListener('statechange', () => reportBackendStage(stageOfWorker(worker)))
}

function followRegistration(registration) {
  followWorker(registration.installing ?? registration.waiting ?? registration.active)
  registration.addEventListener('updatefound', () => followWorker(registration.installing))
}

async function startBackend() {
  const container = globalThis.navigator?.serviceWorker
  if (!container) throw new Error('This browser cannot run IOE Buddy. Please try Chrome, Safari or Edge.')
  const controlled = waitForController(container)
  followRegistration(await container.register(...serviceWorkerRegistrationArgs()))
  const registration = await container.ready
  if (!container.controller) registration.active?.postMessage({ type: CLAIM_CLIENTS_MESSAGE })
  await controlled
  reportBackendStage('ready')
  container.controller?.postMessage({ type: SAVE_FOR_OFFLINE_MESSAGE })
  watchForUpdates(container, registration)
}

let waitingWorker = null
const updateListeners = new Set()

function reportUpdateWhenWaiting(container, registration) {
  if (!registration.waiting || !container.controller) return
  waitingWorker = registration.waiting
  for (const listener of updateListeners) listener()
}

function followNewWorker(container, registration, worker) {
  worker?.addEventListener('statechange', () => {
    if (worker.state === 'installed') reportUpdateWhenWaiting(container, registration)
  })
}

function watchForUpdates(container, registration) {
  reportUpdateWhenWaiting(container, registration)
  followNewWorker(container, registration, registration.installing)
  registration.addEventListener('updatefound', () => followNewWorker(container, registration, registration.installing))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registration.update().catch(() => {})
  })
}

export function onUpdateReady(listener) {
  updateListeners.add(listener)
  if (waitingWorker) listener()
  return () => updateListeners.delete(listener)
}

function nextControllerChange(container) {
  return new Promise((resolve) => container.addEventListener('controllerchange', () => resolve(), { once: true }))
}

function saveFilesForOffline(container, onProgress) {
  return new Promise((resolve) => {
    function listen(event) {
      if (event.data?.type !== OFFLINE_PROGRESS_MESSAGE) return
      const { done, total } = event.data
      onProgress(done, total)
      if (done < total) return
      container.removeEventListener('message', listen)
      resolve()
    }
    container.addEventListener('message', listen)
    container.controller.postMessage({ type: SAVE_FOR_OFFLINE_MESSAGE })
  })
}

async function switchToNewVersion(onProgress) {
  const container = globalThis.navigator.serviceWorker
  const switched = nextControllerChange(container)
  waitingWorker?.postMessage({ type: SKIP_WAITING_MESSAGE })
  await switched
  await saveFilesForOffline(container, onProgress)
}

function giveUpAfter(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

export async function installUpdate(onProgress = () => {}) {
  await Promise.race([switchToNewVersion(onProgress), giveUpAfter(UPDATE_GIVE_UP_MS)])
  window.location.reload()
}

let backendReady = null

export function waitForBackend() {
  if (!backendReady) {
    backendReady = startBackend().catch((error) => {
      backendReady = null
      throw error
    })
  }
  return backendReady
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(path, { method = 'GET', body } = {}) {
  await waitForBackend()
  const hasBody = body !== undefined
  const response = await fetch(API_ROOT + path, {
    method,
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  })
  const data = await readJson(response)
  if (!response.ok) throw new ApiError(data?.error ?? `Request failed with status ${response.status}`, response.status)
  return data
}

const segment = encodeURIComponent

export function getProfile() {
  return request('profile')
}

export function updateProfile(changes) {
  return request('profile', { method: 'PUT', body: changes })
}

export function getWordOfTheDay() {
  return request('word-of-the-day')
}

export function getFlashcards() {
  return request('flashcards')
}

export function rateCard(wordId, rating) {
  return request(`flashcards/${segment(wordId)}/rate`, { method: 'POST', body: { rating } })
}

export function getExam(type) {
  return request(`exams/${segment(type)}`)
}

export function postExamResult(type, { correct, total }) {
  return request(`exams/${segment(type)}/results`, { method: 'POST', body: { correct, total } })
}

export function getCredits() {
  return request('credits')
}

export function resetProgress() {
  return request('reset', { method: 'POST' })
}
