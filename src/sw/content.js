const INDEX_PATH = 'content/index.json'
const SUPPORTED_CONTENT_VERSION = 2

function contentBaseUrl() {
  return globalThis.registration?.scope ?? globalThis.location?.href
}

function contentUrl(path) {
  return new URL(path, contentBaseUrl()).href
}

async function precachedResponse(url) {
  if (!globalThis.caches) return null
  try {
    return (await globalThis.caches.match(url, { ignoreSearch: true })) ?? null
  } catch {
    return null
  }
}

async function fetchJson(path) {
  const url = contentUrl(path)
  const response = (await precachedResponse(url)) ?? (await fetch(url))
  if (!response.ok) throw new Error(`Could not load ${path} (status ${response.status})`)
  return response.json()
}

function rememberUntilFailure(load) {
  let promise = null
  function remembered() {
    if (!promise) {
      promise = load()
      promise.catch(() => {
        promise = null
      })
    }
    return promise
  }
  remembered.forget = () => {
    promise = null
  }
  return remembered
}

function supportedIndex(index) {
  if (index?.version !== SUPPORTED_CONTENT_VERSION) {
    throw new Error(`Content index version ${index?.version} is not supported (expected ${SUPPORTED_CONTENT_VERSION})`)
  }
  return index
}

function sortedByRank(entries) {
  return [...entries].sort((first, second) => first.rank - second.rank)
}

const rememberedIndex = rememberUntilFailure(async () => supportedIndex(await fetchJson(INDEX_PATH)))
const rememberedWords = rememberUntilFailure(async () => sortedByRank(await fetchJson((await loadIndex()).words)))
const rememberedGrammar = rememberUntilFailure(async () => sortedByRank(await fetchJson((await loadIndex()).grammar)))
const rememberedSentenceChoices = rememberUntilFailure(async () => {
  const { sentenceChoices } = await loadIndex()
  return sentenceChoices ? fetchJson(sentenceChoices) : []
})

export function loadIndex() {
  return rememberedIndex()
}

export function loadWords() {
  return rememberedWords()
}

export function loadGrammar() {
  return rememberedGrammar()
}

const rememberedCountWords = rememberUntilFailure(async () => {
  const { countWords } = await loadIndex()
  return countWords ? fetchJson(countWords) : []
})

export function loadCountWords() {
  return rememberedCountWords()
}

export function loadSentenceChoices() {
  return rememberedSentenceChoices()
}

export function clearContentCache() {
  rememberedIndex.forget()
  rememberedWords.forget()
  rememberedGrammar.forget()
  rememberedSentenceChoices.forget()
  rememberedCountWords.forget()
}
