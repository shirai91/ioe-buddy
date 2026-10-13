import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OFFLINE_PROGRESS_MESSAGE, SAVE_FOR_OFFLINE_MESSAGE, SKIP_WAITING_MESSAGE } from '../lib/workerMessages.js'

class FakeWorker extends EventTarget {
  constructor(state) {
    super()
    this.state = state
    this.postMessage = vi.fn()
  }

  becomes(state) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

class FakeRegistration extends EventTarget {
  constructor({ active, waiting = null, installing = null }) {
    super()
    this.active = active
    this.waiting = waiting
    this.installing = installing
    this.update = vi.fn(async () => {})
  }
}

class FakeContainer extends EventTarget {
  constructor(registration) {
    super()
    this.registration = registration
    this.controller = registration.active
    this.ready = Promise.resolve(registration)
    this.register = vi.fn(async () => registration)
  }

  switchTo(worker) {
    this.controller = worker
    this.dispatchEvent(new Event('controllerchange'))
  }

  sendFromWorker(data) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

let client
let container
let registration
const reload = vi.fn()

async function startWith(registrationParts) {
  registration = new FakeRegistration(registrationParts)
  container = new FakeContainer(registration)
  vi.stubGlobal('navigator', { serviceWorker: container })
  client = await import('./client.js')
  await client.waitForBackend()
}

beforeEach(() => {
  vi.resetModules()
  reload.mockReset()
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('update detection', () => {
  it('reports an update when a new version already waits at start', async () => {
    await startWith({ active: new FakeWorker('activated'), waiting: new FakeWorker('installed') })
    const listener = vi.fn()

    client.onUpdateReady(listener)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reports an update when a new version finishes its install while the app is open', async () => {
    await startWith({ active: new FakeWorker('activated') })
    const listener = vi.fn()
    client.onUpdateReady(listener)
    expect(listener).not.toHaveBeenCalled()

    const newWorker = new FakeWorker('installing')
    registration.installing = newWorker
    registration.dispatchEvent(new Event('updatefound'))
    registration.waiting = newWorker
    newWorker.becomes('installed')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reports an update when a new version was already downloading at start', async () => {
    const newWorker = new FakeWorker('installing')
    await startWith({ active: new FakeWorker('activated'), installing: newWorker })
    const listener = vi.fn()
    client.onUpdateReady(listener)

    registration.waiting = newWorker
    newWorker.becomes('installed')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('looks for a new version when the app comes back to the screen', async () => {
    await startWith({ active: new FakeWorker('activated') })

    document.dispatchEvent(new Event('visibilitychange'))

    expect(registration.update).toHaveBeenCalled()
  })
})

describe('installUpdate', () => {
  it('switches to the waiting version, downloads its files with progress, then reloads', async () => {
    const waiting = new FakeWorker('installed')
    await startWith({ active: new FakeWorker('activated'), waiting })
    const progress = vi.fn()

    const installing = client.installUpdate(progress)
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: SKIP_WAITING_MESSAGE })

    container.switchTo(waiting)
    await vi.waitFor(() => expect(waiting.postMessage).toHaveBeenCalledWith({ type: SAVE_FOR_OFFLINE_MESSAGE }))
    container.sendFromWorker({ type: OFFLINE_PROGRESS_MESSAGE, done: 1, total: 2 })
    expect(reload).not.toHaveBeenCalled()
    container.sendFromWorker({ type: OFFLINE_PROGRESS_MESSAGE, done: 2, total: 2 })
    await installing

    expect(progress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ])
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads anyway when the new version never answers', async () => {
    vi.useFakeTimers()
    await startWith({ active: new FakeWorker('activated'), waiting: new FakeWorker('installed') })

    const installing = client.installUpdate()
    await vi.advanceTimersByTimeAsync(client.UPDATE_GIVE_UP_MS)
    await installing

    expect(reload).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
