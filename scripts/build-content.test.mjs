import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { buildContent, buildCountWords, buildSentenceChoices, folderFingerprint, isSameWord, mixEvenly } from './build-content.mjs'

const LAST_BOOK_UNIT = 16
const LAST_STARTERS_UNIT = 27
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
  let sentenceChoices
  let countWords

  before(() => {
    outDir = makeTemporaryDir('ioe-content-')
    fs.writeFileSync(path.join(outDir, 'stale.json'), '{}')
    buildContent({ outDir })
    words = readJson(path.join(outDir, 'words.json'))
    grammar = readJson(path.join(outDir, 'grammar.json'))
    index = readJson(path.join(outDir, 'index.json'))
    sentenceChoices = readJson(path.join(outDir, 'sentence-choices.json'))
    countWords = readJson(path.join(outDir, 'count-words.json'))
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

  test('sentence choices have one blank, four different options and a known word', () => {
    assert.equal(index.sentenceChoices, 'content/sentence-choices.json')
    assert.equal(index.sentenceChoiceCount, sentenceChoices.length)
    assert.ok(sentenceChoices.length > 0)
    const wordIds = new Set(words.map((word) => word.id))
    for (const choice of sentenceChoices) {
      const options = [choice.answer, ...choice.wrong].map((option) => option.toLowerCase())
      assert.equal(new Set(options).size, 4, choice.sentence)
      assert.equal(`${choice.before}${choice.answer}${choice.after}`, choice.sentence)
      assert.ok(wordIds.has(choice.wordId), choice.wordId)
    }
    assert.equal(new Set(sentenceChoices.map((choice) => choice.id)).size, sentenceChoices.length)
  })

  test('count words name known words with a picture and a plural', () => {
    assert.equal(index.countWords, 'content/count-words.json')
    assert.equal(index.countWordCount, countWords.length)
    assert.ok(countWords.length >= 20)
    const pictured = new Set(words.filter((word) => word.image && !word.sight).map((word) => word.id))
    for (const countWord of countWords) {
      assert.ok(pictured.has(countWord.wordId), countWord.wordId)
      assert.ok(countWord.plural)
    }
    assert.equal(countWords.find((countWord) => countWord.wordId === 'bus').plural, 'buses')
  })

  test('words are sorted by rank and the rank is the position, starting at 1', () => {
    assertSortedByUniqueRank(words)
    words.forEach((word, index) => assert.equal(word.rank, index + 1))
  })

  test('the first book words are ball, book and bike from unit 1 lesson 1', () => {
    assert.deepEqual(
      words.filter((word) => word.unit <= LAST_BOOK_UNIT).slice(0, 3).map(({ word, unit, lesson }) => ({ word, unit, lesson })),
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
      assert.ok(Number.isInteger(word.unit) && word.unit >= 1 && word.unit <= LAST_STARTERS_UNIT)
      assert.ok(Number.isInteger(word.lesson) && word.lesson >= 1 && word.lesson <= 3)
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
      words.filter((word) => word.unit <= LAST_BOOK_UNIT).slice(0, 6).map(({ word, unit, lesson }) => `${word} ${unit}.${lesson}`),
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
    assert.equal(findWord('in').image, 'content/images/in.png')
    assert.equal(findWord('it').image, null)
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

describe('build-content Starters words', () => {
  let words

  before(() => {
    const outDir = makeTemporaryDir('ioe-content-')
    buildContent({ outDir })
    words = readJson(path.join(outDir, 'words.json'))
  })

  const findWord = (id) => words.find((word) => word.id === id)

  test('mix evenly with the book words from the start, each list in its own order', () => {
    assert.deepEqual(words.slice(0, 4).map((word) => word.id), ['ball', 'arm', 'leg', 'book'])
    const isStarters = (word) => word.unit > LAST_BOOK_UNIT
    const half = words.slice(0, Math.floor(words.length / 2))
    const startersShareInFirstHalf = half.filter(isStarters).length / half.length
    const startersShare = words.filter(isStarters).length / words.length
    assert.ok(Math.abs(startersShareInFirstHalf - startersShare) < 0.02)
    assert.deepEqual(words.filter(isStarters).slice(0, 3).map(({ id, unit, lesson }) => `${id} ${unit}.${lesson}`), ['arm 17.1', 'leg 17.1', 'body 17.1'])
  })

  test('keep the row id, ipa, vi, sentence and the Starters picture', () => {
    const tShirt = findWord('t-shirt')
    assert.equal(tShirt.word, 'T-shirt')
    assert.equal(tShirt.ipa, '/ˈtiː ʃɜːt/')
    assert.equal(tShirt.vi, 'áo phông')
    assert.equal(tShirt.sentence, "It's a red T-shirt.")
    assert.equal(tShirt.image, 'content/images/t-shirt.png')
    assert.equal(tShirt.sight, undefined)
    assert.equal(findWord('in-front-of').unit, 27)
  })

  test('are not cards that the book already has', () => {
    assert.equal(words.filter((word) => word.word === 'hand').length, 1)
    assert.equal(findWord('hand').unit, 8)
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

describe('mixEvenly', () => {
  test('spreads the shorter list evenly through the longer list and keeps both orders', () => {
    assert.deepEqual(mixEvenly(['a1', 'a2'], ['b1', 'b2', 'b3', 'b4']), ['a1', 'b1', 'b2', 'a2', 'b3', 'b4'])
    assert.deepEqual(mixEvenly(['a1', 'a2'], []), ['a1', 'a2'])
    assert.deepEqual(mixEvenly([], ['b1']), ['b1'])
  })
})

describe('buildSentenceChoices', () => {
  const words = [{ id: 'car' }]
  const row = { sentence: 'I have a ___.', answer: 'car', wrong: ['cat', 'cup', 'cake'], wordId: 'car', unit: 2 }

  test('splits the sentence at the blank', () => {
    const [choice] = buildSentenceChoices([row], words)
    assert.deepEqual(choice, { id: 'i-have-a-car', before: 'I have a ', after: '.', answer: 'car', wrong: ['cat', 'cup', 'cake'], wordId: 'car', unit: 2, sentence: 'I have a car.' })
  })

  test('rejects bad rows', () => {
    assert.throws(() => buildSentenceChoices([{ ...row, sentence: 'I have a car.' }], words), /one ___/)
    assert.throws(() => buildSentenceChoices([{ ...row, wrong: ['Car', 'cup', 'cake'] }], words), /same option/)
    assert.throws(() => buildSentenceChoices([{ ...row, wordId: 'bus' }], words), /unknown word/)
  })
})

describe('buildCountWords', () => {
  const words = [{ id: 'book', word: 'book', image: 'content/images/book.png' }, { id: 'in', word: 'in', image: null, sight: true }]

  test('keeps the word text and the plural, and skips words with no game picture', () => {
    const rows = [
      { wordId: 'book', plural: 'books', unit: 1 },
      { wordId: 'in', plural: 'ins', unit: 3 },
    ]

    assert.deepEqual(buildCountWords(rows, words), {
      countWords: [{ wordId: 'book', word: 'book', plural: 'books', unit: 1 }],
      countWordsWithoutPicture: ['in'],
    })
  })

  test('rejects bad rows', () => {
    assert.throws(() => buildCountWords([{ wordId: 'bus', plural: 'buses', unit: 11 }], words), /not a known word/)
    assert.throws(() => buildCountWords([{ wordId: 'book', plural: '', unit: 1 }], words), /no plural/)
  })
})
