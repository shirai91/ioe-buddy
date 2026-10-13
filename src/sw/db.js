export const DATABASE_NAME = 'ioe-buddy'
const DATABASE_VERSION = 1
const KEYED_STORES = ['profile', 'cards']
const AUTO_NUMBERED_STORES = ['results']

let connection = null

function promiseFromRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function createMissingStores(database) {
  for (const name of KEYED_STORES) {
    if (!database.objectStoreNames.contains(name)) database.createObjectStore(name)
  }
  for (const name of AUTO_NUMBERED_STORES) {
    if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: 'id', autoIncrement: true })
  }
}

function forgetConnection() {
  connection = null
}

function openDatabase() {
  const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.onupgradeneeded = () => createMissingStores(request.result)
  return promiseFromRequest(request).then((database) => {
    database.onversionchange = () => {
      database.close()
      forgetConnection()
    }
    database.onclose = forgetConnection
    return database
  })
}

function database() {
  if (!connection) {
    connection = openDatabase().catch((error) => {
      forgetConnection()
      throw error
    })
  }
  return connection
}

export async function closeDatabase() {
  const pending = connection
  forgetConnection()
  const opened = await pending?.catch(() => null)
  opened?.close()
}

async function read(storeName, readFrom) {
  const transaction = (await database()).transaction(storeName, 'readonly')
  return promiseFromRequest(readFrom(transaction.objectStore(storeName)))
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('Database write was aborted'))
  })
}

async function write(storeName, writeTo) {
  const transaction = (await database()).transaction(storeName, 'readwrite')
  const done = transactionDone(transaction)
  const result = promiseFromRequest(writeTo(transaction.objectStore(storeName)))
  await done
  return result
}

export function get(store, key) {
  return read(store, (objectStore) => objectStore.get(key))
}

export function getAll(store) {
  return read(store, (objectStore) => objectStore.getAll())
}

export async function put(store, key, value) {
  await write(store, (objectStore) => objectStore.put(value, key))
  return value
}

export async function add(store, value) {
  const id = await write(store, (objectStore) => objectStore.add(value))
  return { ...value, id }
}

export async function clear(store) {
  await write(store, (objectStore) => objectStore.clear())
}
