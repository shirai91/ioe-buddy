import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { buildContent, folderFingerprint, isSameWord } from './build-content.mjs'

const temporaryDirs = []

function makeTemporaryDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  temporaryDirs.push(dir)
  return dir
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

after(() => {
  for (const dir of temporaryDirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('build-content with the book content', () => {
  let outDir
  let words
  let grammar
  let index

  before(() => {
    outDir = makeTemporaryDir('ioe-content-')
    fs.writeFileSync(path.join(outDir, 'stale.json'), '{}')
    buildContent({ outDir })
    words = readJson(path.join(outDir, 'words.json'))
    grammar = readJson(path.join(outDir, 'grammar.json'))
    index = readJson(path.join(outDir, 'index.json'))
  })

  const findWord = (text) => words.find((word) => word.word === text)
  const assertSortedByUniqueRank = (items) => {
    for (let position = 1; position < items.length; position += 1) assert.ok(items[position - 1].rank < items[position].rank)
  }

  test('removes old output before it writes', () => {
    assert.equal(fs.existsSync(path.join(outDir, 'stale.json')), false)
    assert.equal(fs.existsSync(path.join(outDir, 'units')), false)
  })

  test('index points to the words and grammar files', () => {
    assert.equal(index.version, 2)
    assert.equal(index.words, 'content/words.json')
    assert.equal(index.grammar, 'content/grammar.json')
    assert.equal(index.wordCount, words.length)
    assert.equal(index.grammarCount, grammar.length)
    for (const file of [index.words, index.grammar]) assert.ok(fs.existsSync(path.join(outDir, file.replace(/^content\//, ''))))
    assert.ok(Array.isArray(index.credits))
  })

  test('words are sorted by rank and ranks are unique', () => {
    assertSortedByUniqueRank(words)
  })

  test('the first words are ball, book and bike from unit 1 lesson 1', () => {
    assert.deepEqual(
      words.slice(0, 3).map(({ word, unit, lesson }) => ({ word, unit, lesson })),
      ['ball', 'book', 'bike'].map((word) => ({ word, unit: 1, lesson: 1 })),
    )
  })

  test('every word has id, word, letter, unit, lesson and rank', () => {
    for (const word of words) {
      assert.match(word.id, /^[a-z0-9]+(-[a-z0-9]+)*$/)
      assert.ok(word.word)
      assert.match(word.letter, /^[A-Z][a-z]$/)
      assert.equal(word.letter[1], word.word[0].toLowerCase())
      assert.ok(word.sentence)
      assert.ok(Number.isInteger(word.unit) && word.unit >= 1 && word.unit <= 16)
      assert.ok(Number.isInteger(word.lesson) && word.lesson >= 1 && word.lesson <= 3)
      assert.equal(Math.floor(word.rank / 100), word.unit * 10 + word.lesson)
    }
  })

  test('numbers one to ten land in their units', () => {
    for (const number of ['one', 'two', 'three', 'four', 'five']) assert.equal(findWord(number)?.unit, 9, number)
    for (const number of ['six', 'seven', 'eight', 'nine', 'ten']) assert.equal(findWord(number)?.unit, 16, number)
  })

  test('does not list banana and bananas both', () => {
    assert.ok(findWord('bananas'))
    assert.equal(findWord('banana'), undefined)
    assert.equal(findWord('clock'), undefined)
  })

  test('grammar has patterns with unit, lesson and unique sorted ranks', () => {
    assert.ok(grammar.length > 0)
    assertSortedByUniqueRank(grammar)
    assert.equal(new Set(grammar.map((pattern) => pattern.id)).size, grammar.length)
    for (const pattern of grammar) {
      assert.match(pattern.id, /^[a-z0-9]+(-[a-z0-9]+)*$/)
      assert.ok(pattern.pattern)
      assert.ok(Number.isInteger(pattern.unit) && Number.isInteger(pattern.lesson))
      assert.equal(Math.floor(pattern.rank / 100), pattern.unit * 10 + pattern.lesson)
    }
    assert.deepEqual(grammar.slice(0, 2).map((pattern) => pattern.pattern), ["Hi, I'm Bill.", 'Bye, Bill.'])
    assert.ok(grammar.some((pattern) => pattern.pattern === 'This is my ___.'))
  })

  test('no two words show the same picture', () => {
    const wordsByPicture = new Map()
    for (const word of words.filter((entry) => entry.image)) {
      const picture = fs.readFileSync(path.join(outDir, word.image.replace(/^content\//, ''))).toString('base64')
      wordsByPicture.set(picture, [...(wordsByPicture.get(picture) ?? []), word.word])
    }

    assert.deepEqual([...wordsByPicture.values()].filter((sharing) => sharing.length > 1), [])
  })

  test('every image file exists on disk', () => {
    for (const word of words.filter((item) => item.image)) {
      assert.equal(word.image, `content/images/${word.id}.png`)
      assert.ok(fs.existsSync(path.join(outDir, word.image.replace(/^content\//, ''))), word.image)
    }
    assert.equal(findWord('ball').image, 'content/images/ball.png')
  })

  test('takes ipa and vi from the glossary through the other word form', () => {
    const running = findWord('running')
    assert.equal(running.ipa, '/rʌn/')
    assert.equal(running.vi, 'chạy')
    assert.equal(running.image, 'content/images/running.png')
    const teddyBear = findWord('teddy bear')
    assert.equal(teddyBear.id, 'teddy-bear')
    assert.equal(teddyBear.image, 'content/images/teddy-bear.png')
  })

  test('adds glossary words of the unit that the vocabulary line misses', () => {
    const unit9Words = words.filter((word) => word.unit === 9).map((word) => word.word)
    assert.deepEqual(unit9Words.slice(0, 4), ['locks', 'clocks', 'mops', 'pots'])
  })

  test('builds sentences from the unit patterns', () => {
    const sentenceOf = (text) => findWord(text).sentence
    assert.equal(sentenceOf('cat'), 'I have a cat.')
    assert.equal(sentenceOf('apple'), 'This is my apple.')
    assert.equal(sentenceOf('monkey'), "That's a monkey.")
    assert.equal(sentenceOf('lemons'), 'Look at the lemons.')
    assert.equal(sentenceOf('bananas'), "He's having bananas.")
    assert.equal(sentenceOf('turtle'), 'I can see a turtle.')
    assert.equal(sentenceOf('ball'), 'This is a ball.')
    assert.equal(sentenceOf('washing'), 'I like washing.')
    assert.equal(sentenceOf('water'), 'This is water.')
    assert.equal(sentenceOf('sun'), 'Look at the sun.')
  })
})

describe('build-content extra words', () => {
  let words

  before(() => {
    const outDir = makeTemporaryDir('ioe-content-')
    buildContent({ outDir })
    words = readJson(path.join(outDir, 'words.json'))
  })

  const findWord = (text) => words.find((word) => word.word === text && word.sight)

  test('adds greetings, verbs, adjectives and small words as sight words', () => {
    for (const text of ['hi', 'hello', 'bye', 'I', 'have', 'like', 'look', 'see', 'sunny', 'he', 'she', 'you']) assert.ok(findWord(text), text)
    assert.equal(words.filter((word) => word.sight).length, 34)
  })

  test('puts a sight word in the lesson where the child says it', () => {
    assert.deepEqual(
      words.slice(0, 6).map(({ word, unit, lesson }) => `${word} ${unit}.${lesson}`),
      ['ball 1.1', 'book 1.1', 'bike 1.1', 'hi 1.3', 'I 1.3', 'bye 1.3'],
    )
    assert.deepEqual(
      [findWord('hello'), findWord('goodbye')].map(({ unit, lesson }) => `${unit}.${lesson}`),
      ['8.3', '16.3'],
    )
  })

  test('keeps the book sentence, ipa, vi and a picture', () => {
    const hi = findWord('hi')
    assert.equal(hi.sentence, "Hi, I'm Bill.")
    assert.equal(hi.ipa, '/haɪ/')
    assert.equal(hi.vi, 'xin chào')
    assert.equal(hi.image, 'content/images/hi.png')
    assert.equal(findWord('in').image, null)
  })

  test('the verb can has its own id and picture next to the noun can', () => {
    const canVerb = findWord('can')
    assert.equal(canVerb.id, 'can-verb')
    assert.equal(canVerb.unit, 14)
    assert.equal(canVerb.image, 'content/images/can-verb.png')
    const canNoun = words.find((word) => word.id === 'can')
    assert.equal(canNoun.unit, 3)
    assert.equal(canNoun.sight, undefined)
  })
})

describe('build-content audio clips', () => {
  test('copies the clips and lists the phrases that have no clip', () => {
    const audioDir = makeTemporaryDir('ioe-audio-')
    fs.writeFileSync(path.join(audioDir, 'great-job.mp3'), 'clip')
    const outDir = makeTemporaryDir('ioe-content-')

    const { phrasesWithoutClip } = buildContent({ audioDir, outDir })

    assert.equal(fs.readFileSync(path.join(outDir, 'audio', 'great-job.mp3'), 'utf8'), 'clip')
    assert.ok(phrasesWithoutClip.includes('Try again'))
    assert.ok(!phrasesWithoutClip.includes('Great job!'))
  })

  test('the clips in the repo cover every phrase the app can say', () => {
    const { phrasesWithoutClip } = buildContent({ outDir: makeTemporaryDir('ioe-content-') })

    assert.deepEqual(phrasesWithoutClip, [])
  })
})

describe('build-content file versions', () => {
  test('the index has a fingerprint of the pictures and of the audio clips', () => {
    const outDir = makeTemporaryDir('ioe-content-')
    const { index } = buildContent({ outDir })

    assert.equal(index.fileVersions.pictures, folderFingerprint(path.join(outDir, 'images')))
    assert.equal(index.fileVersions.audio, folderFingerprint(path.join(outDir, 'audio')))
    assert.match(index.fileVersions.audio, /^[0-9a-f]{12}$/)
  })

  test('the fingerprint changes when a file changes and stays when nothing changes', () => {
    const folder = makeTemporaryDir('ioe-files-')
    fs.writeFileSync(path.join(folder, 'ball.mp3'), 'old voice')
    const before = folderFingerprint(folder)

    assert.equal(folderFingerprint(folder), before)
    fs.writeFileSync(path.join(folder, 'ball.mp3'), 'new voice')
    assert.notEqual(folderFingerprint(folder), before)
  })
})

describe('build-content with third-party images', () => {
  test('lists images from images/web as credits and skips book images', () => {
    const imagesDir = makeTemporaryDir('ioe-images-')
    const outDir = makeTemporaryDir('ioe-content-')
    fs.mkdirSync(path.join(imagesDir, 'unit-01'))
    fs.writeFileSync(path.join(imagesDir, 'unit-01', 'ball.png'), 'book-ball')
    fs.mkdirSync(path.join(imagesDir, 'web'))
    fs.writeFileSync(path.join(imagesDir, 'web', 'bike.png'), 'web-bike')
    fs.writeFileSync(path.join(imagesDir, 'web', 'ball.png'), 'web-ball')
    fs.writeFileSync(
      path.join(imagesDir, 'web', 'manifest.json'),
      JSON.stringify([
        { word: 'bike', file: 'bike.png', source: 'https://example.org/bike', author: 'Ann', license: 'CC0' },
        { word: 'ball', file: 'ball.png', source: 'https://example.org/ball', author: 'Ben', license: 'CC0' },
      ]),
    )

    const result = buildContent({ imagesDir, outDir })
    const words = readJson(path.join(outDir, 'words.json'))
    const imageOf = (text) => words.find((word) => word.word === text).image

    assert.equal(imageOf('ball'), 'content/images/ball.png')
    assert.equal(fs.readFileSync(path.join(outDir, 'images', 'ball.png'), 'utf8'), 'book-ball')
    assert.equal(imageOf('bike'), 'content/images/bike.png')
    assert.equal(imageOf('book'), null)
    assert.equal(fs.readFileSync(path.join(outDir, 'images', 'bike.png'), 'utf8'), 'web-bike')
    assert.deepEqual(readJson(path.join(outDir, 'index.json')).credits, [
      { word: 'bike', image: 'content/images/bike.png', source: 'https://example.org/bike', author: 'Ann', license: 'CC0' },
    ])
    assert.ok(result.wordsWithoutImage.includes('unit-01: book'))
  })
})

test('matches singular, plural and simple forms', () => {
  for (const [first, second] of [['banana', 'bananas'], ['clock', 'clocks'], ['run', 'running'], ['wash', 'washing'], ['nut', 'nuts']]) {
    assert.ok(isSameWord(first, second), `${first} / ${second}`)
    assert.ok(isSameWord(second, first), `${second} / ${first}`)
  }
  assert.equal(isSameWord('bus', 'bike'), false)
  assert.equal(isSameWord('can', 'cat'), false)
})
