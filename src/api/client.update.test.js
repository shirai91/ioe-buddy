import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SKIP_WAITING_MESSAGE } from '../lib/workerMessages.js'

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

function serveFiles(files, { failList = false } = {}) {
  const fetchMock = vi.fn(async (url) => {
    if (url === 'api/offline-files') return failList ? new Response('{}', { status: 404 }) : Response.json({ files })
    return new Response('file')
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('installUpdate', () => {
  it('switches to the waiting version, downloads its files with progress, then reloads', async () => {
    const waiting = new FakeWorker('installed')
    await startWith({ active: new FakeWorker('activated'), waiting })
    const fetchMock = serveFiles(['content/images/ball.png', 'content/audio/ball.mp3'])
    const progress = vi.fn()

    const installing = client.installUpdate(progress)
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: SKIP_WAITING_MESSAGE })
    expect(fetchMock).not.toHaveBeenCalled()

    container.switchTo(waiting)
    await installing

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['api/offline-files', 'content/images/ball.png', 'content/audio/ball.mp3'])
    expect(progress.mock.calls).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ])
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('goes on when the new version is active, even with no controller change event', async () => {
    const waiting = new FakeWorker('installed')
    await startWith({ active: new FakeWorker('activated'), waiting })
    serveFiles(['content/audio/ball.mp3'])
    const progress = vi.fn()

    const installing = client.installUpdate(progress)
    waiting.becomes('activated')
    await installing

    expect(progress).toHaveBeenLastCalledWith(1, 1)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('starts the newest waiting version when a newer one replaced the first', async () => {
    const first = new FakeWorker('installed')
    await startWith({ active: new FakeWorker('activated'), waiting: first })
    serveFiles([])
    const newest = new FakeWorker('installed')
    registration.waiting = newest
    first.becomes('redundant')

    const installing = client.installUpdate()
    expect(newest.postMessage).toHaveBeenCalledWith({ type: SKIP_WAITING_MESSAGE })
    expect(first.postMessage).not.toHaveBeenCalledWith({ type: SKIP_WAITING_MESSAGE })
    container.switchTo(newest)
    await installing

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('counts a file that fails to download as done, so the progress always ends', async () => {
    const waiting = new FakeWorker('installed')
    await startWith({ active: new FakeWorker('activated'), waiting })
    const fetchMock = serveFiles(['content/audio/ball.mp3', 'content/audio/book.mp3'])
    fetchMock.mockImplementation(async (url) => {
      if (url === 'api/offline-files') return Response.json({ files: ['content/audio/ball.mp3', 'content/audio/book.mp3'] })
      throw new Error('offline')
    })
    const progress = vi.fn()

    const installing = client.installUpdate(progress)
    container.switchTo(waiting)
    await installing

    expect(progress).toHaveBeenLastCalledWith(2, 2)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads when the new version cannot list its files', async () => {
    const waiting = new FakeWorker('installed')
    await startWith({ active: new FakeWorker('activated'), waiting })
    serveFiles([], { failList: true })

    const installing = client.installUpdate()
    container.switchTo(waiting)
    await installing

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
