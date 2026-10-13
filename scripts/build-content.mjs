import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clipName, spokenPhrases } from '../src/lib/clips.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UNIT_COUNT = 16
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']
const THIRD_PARTY_IMAGE_FOLDER = 'web'

const WORD_KINDS = {
  number: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  mass: ['milk', 'water', 'chicken', 'fish', 'fish and chips'],
  body: ['hair', 'hand', 'head', 'face', 'foot'],
  family: ['mother', 'father'],
  adjective: ['red'],
}
const SINGULAR_WORDS_ENDING_IN_S = ['bus']
const SLOT_ACCEPTS = {
  count: ['count'],
  plural: ['plural'],
  mass: ['mass', 'plural'],
  number: ['number'],
  body: ['body', 'family'],
  family: ['family'],
  adjective: ['adjective'],
  ing: ['ing'],
}
const KINDS_AFTER_THE = ['count', 'plural', 'mass']
const SUBJECT_PRONOUNS = ['i', 'you', 'he', 'she', 'it', 'we', 'they']

export function kebabCase(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function wordKind(word) {
  const lower = word.toLowerCase()
  const listedKind = Object.keys(WORD_KINDS).find((kind) => WORD_KINDS[kind].includes(lower))
  if (listedKind) return listedKind
  if (lower.endsWith('ing')) return 'ing'
  if (lower.endsWith('s') && !SINGULAR_WORDS_ENDING_IN_S.includes(lower)) return 'plural'
  return 'count'
}

export function wordForms(word) {
  const lower = word.toLowerCase()
  const forms = new Set([lower, `${lower}s`, `${lower}es`, `${lower}ing`, `${lower}${lower.at(-1)}ing`])
  if (lower.endsWith('es')) forms.add(lower.slice(0, -2))
  if (lower.endsWith('s')) forms.add(lower.slice(0, -1))
  if (lower.endsWith('ing')) {
    const stem = lower.slice(0, -3)
    forms.add(stem)
    if (stem.length > 1 && stem.at(-1) === stem.at(-2)) forms.add(stem.slice(0, -1))
  }
  return forms
}

export function isSameWord(first, second) {
  const secondLower = second.toLowerCase()
  return first.toLowerCase() === secondLower || wordForms(first).has(secondLower) || wordForms(second).has(first.toLowerCase())
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function headerField(markdown, label) {
  const match = markdown.match(new RegExp(`^- ${label}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

function splitList(text) {
  return text ? text.split(',').map((item) => item.trim()).filter(Boolean) : []
}

function tableRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
}

function parseGlossary(markdown) {
  return tableRows(markdown)
    .filter(([word, , , unit]) => word && word !== 'Word' && /^\d+$/.test(unit))
    .map(([word, ipa, vi, unit]) => ({ word, ipa: ipa || null, vi: vi || null, unit: Number(unit) }))
}

function parseExtraWords(markdown) {
  return tableRows(markdown)
    .filter(([word, , , , unit, lesson]) => word && word !== 'Word' && /^\d+$/.test(unit) && /^\d+$/.test(lesson))
    .map(([word, id, ipa, vi, unit, lesson, sentence]) => ({
      word,
      id: id || kebabCase(word),
      ipa: ipa || null,
      vi: vi || null,
      unit: Number(unit),
      lesson: Number(lesson),
      sentence,
    }))
}

function parseBookMap(markdown) {
  const unitsByNumber = new Map()
  for (const [unitCell, phonics, vocabulary, patterns] of tableRows(markdown)) {
    const match = unitCell?.match(/^(\d+)\s+(.+)$/)
    if (!match) continue
    unitsByNumber.set(Number(match[1]), {
      title: match[2],
      phonics: phonics || null,
      vocabulary: splitList(vocabulary),
      patterns: patterns ? patterns.split(' / ').map((pattern) => pattern.trim()) : [],
    })
  }
  return unitsByNumber
}

function parseNames(markdown) {
  return [...markdown.matchAll(/^- Names:\s*(.+)$/gm)]
    .flatMap((match) => splitList(match[1]))
    .filter((name) => /^[A-Z]/.test(name))
}

function parseUnit(markdown, number, bookMapUnit) {
  const titleMatch = markdown.match(/^# Unit (\d+):\s*(.+)$/m)
  const patternsText = headerField(markdown, 'Sentence patterns')
  return {
    number,
    title: titleMatch ? titleMatch[2].trim() : bookMapUnit?.title ?? `Unit ${number}`,
    phonics: headerField(markdown, 'Phonics') ?? bookMapUnit?.phonics ?? null,
    vocabulary: splitList(headerField(markdown, 'Vocabulary') ?? bookMapUnit?.vocabulary.join(', ')),
    patterns: patternsText ? patternsText.split(' / ').map((pattern) => pattern.trim()) : bookMapUnit?.patterns ?? [],
    names: parseNames(markdown),
  }
}

function isProperName(word, names) {
  return /^[A-Z]/.test(word) || names.some((name) => name.toLowerCase() === word.toLowerCase())
}

function unitWordList(unit, glossary, names) {
  const vocabulary = unit.vocabulary.filter((word) => !isProperName(word, names))
  const glossaryExtras = glossary
    .filter((entry) => entry.unit === unit.number)
    .map((entry) => entry.word)
    .filter((word) => !isProperName(word, names) && !vocabulary.some((existing) => isSameWord(existing, word)))
  return [...vocabulary, ...glossaryExtras]
}

function findGlossaryEntry(word, glossary, unitNumber) {
  const matches = glossary.filter((entry) => isSameWord(entry.word, word))
  return matches.find((entry) => entry.unit === unitNumber) ?? matches[0] ?? null
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildWordMatcher(knownWords) {
  const forms = new Set()
  for (const word of knownWords) for (const form of wordForms(word)) forms.add(form)
  const alternatives = [...forms].sort((a, b) => b.length - a.length).map(escapeRegExp)
  return new RegExp(`\\b(${alternatives.join('|')})\\b`, 'gi')
}

function precedingWord(text, index) {
  const match = text.slice(0, index).match(/([A-Za-z']+)\s+$/)
  return match ? match[1].toLowerCase() : null
}

function followingWord(text, index) {
  const match = text.slice(index).match(/^\s+([A-Za-z']+)/)
  return match ? match[1].toLowerCase() : null
}

function isUsedAsVerb(template) {
  return SUBJECT_PRONOUNS.includes(template.precededBy) || SUBJECT_PRONOUNS.includes(template.followedBy)
}

function patternTemplates(pattern, wordMatcher) {
  if (/_{2,}/.test(pattern)) return []
  return [...pattern.matchAll(wordMatcher)]
    .map((match) => {
      const endIndex = match.index + match[1].length
      return {
        pattern,
        matchedText: match[1],
        before: pattern.slice(0, match.index),
        after: pattern.slice(endIndex),
        slotKind: wordKind(match[1]),
        precededBy: precedingWord(pattern, match.index),
        followedBy: followingWord(pattern, endIndex),
      }
    })
    .filter((template) => !isUsedAsVerb(template))
}

function templateFits(template, word) {
  const kind = wordKind(word)
  if (SLOT_ACCEPTS[template.slotKind]?.includes(kind)) return true
  return template.precededBy === 'the' && KINDS_AFTER_THE.includes(kind) && KINDS_AFTER_THE.includes(template.slotKind)
}

function startsWithVowelSound(word) {
  return /^[aeiou]/i.test(word)
}

function fixArticle(before, word) {
  return before.replace(/\b(a|an)(\s+)$/i, (_, article, space) => {
    const isCapital = article[0] === 'A'
    const fixed = startsWithVowelSound(word) ? 'an' : 'a'
    return `${isCapital ? fixed[0].toUpperCase() + fixed.slice(1) : fixed}${space}`
  })
}

function startsSentence(before) {
  return before.trim() === '' || /[.?!]\s+$/.test(before)
}

function capitalize(text) {
  return text[0].toUpperCase() + text.slice(1)
}

function fillTemplate(template, word) {
  const filledWord = startsSentence(template.before) ? capitalize(word) : word
  return `${fixArticle(template.before, word)}${filledWord}${template.after}`
}

const ONE_OF_A_KIND_WORDS = new Set(['sun'])

function fallbackSentence(word) {
  if (ONE_OF_A_KIND_WORDS.has(word)) return `Look at the ${word}.`
  const kind = wordKind(word)
  if (kind === 'plural') return `These are ${word}.`
  if (kind === 'ing') return `I like ${word}.`
  if (kind === 'mass') return `This is ${word}.`
  return `This is ${startsWithVowelSound(word) ? 'an' : 'a'} ${word}.`
}

export function exampleSentence(word, patterns, wordMatcher, unitWords = []) {
  const templates = patterns.flatMap((pattern) => patternTemplates(pattern, wordMatcher))
  const patternWithWord = templates.find((template) => isSameWord(word, template.matchedText))
  if (patternWithWord) return { sentence: patternWithWord.pattern, fromPattern: true }
  const slotsUnitWord = (template) => unitWords.some((unitWord) => isSameWord(unitWord, template.matchedText))
  const unitWordTemplatesFirst = [...templates.filter(slotsUnitWord), ...templates.filter((template) => !slotsUnitWord(template))]
  const fittingTemplate = unitWordTemplatesFirst.find((template) => templateFits(template, word))
  if (fittingTemplate) return { sentence: fillTemplate(fittingTemplate, word), fromPattern: true }
  return { sentence: fallbackSentence(word), fromPattern: false }
}

function firstLetter(word) {
  const letter = word.match(/[a-z]/i)?.[0] ?? word[0]
  return `${letter.toUpperCase()}${letter.toLowerCase()}`
}

function readManifest(folderPath) {
  const manifestPath = path.join(folderPath, 'manifest.json')
  if (!fs.existsSync(manifestPath)) return []
  try {
    const entries = JSON.parse(readText(manifestPath))
    return Array.isArray(entries) ? entries : []
  } catch (error) {
    throw new Error(`Cannot parse ${manifestPath}: ${error.message}`)
  }
}

function listImageFolders(imagesDir) {
  if (!fs.existsSync(imagesDir)) return []
  const folders = []
  const visit = (absoluteDir) => {
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const childDir = path.join(absoluteDir, entry.name)
      const files = fs.readdirSync(childDir).filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
      folders.push({
        name: path.relative(imagesDir, childDir).split(path.sep).join('/'),
        absoluteDir: childDir,
        files,
        manifest: readManifest(childDir),
      })
      visit(childDir)
    }
  }
  visit(imagesDir)
  return folders.sort((a, b) => a.name.localeCompare(b.name))
}

function imageInFolder(folder, candidateNames) {
  const byFileName = folder.files.find((file) => candidateNames.includes(path.parse(file).name.toLowerCase()))
  if (byFileName) return byFileName
  const manifestEntry = folder.manifest.find(
    (entry) => entry.word && candidateNames.includes(kebabCase(entry.word)) && folder.files.includes(entry.file),
  )
  return manifestEntry?.file ?? null
}

function imageCandidateNames(word, glossaryWord) {
  const names = [word, glossaryWord].filter(Boolean).map(kebabCase)
  const forms = [word, glossaryWord].filter(Boolean).flatMap((text) => [...wordForms(text)].map(kebabCase))
  return [...new Set([...names, ...forms])]
}

function findImage(candidateNames, unitFolderName, imageFolders) {
  const unitFolder = imageFolders.find((folder) => folder.name === unitFolderName)
  const searchOrder = unitFolder ? [unitFolder, ...imageFolders.filter((folder) => folder !== unitFolder)] : imageFolders
  for (const folder of searchOrder) {
    const file = imageInFolder(folder, candidateNames)
    if (file) return { folder, file }
  }
  return null
}

function unitId(number) {
  return `unit-${String(number).padStart(2, '0')}`
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

const DEFAULT_WORD_LESSON = 1
const DEFAULT_PATTERN_LESSON = 3
const MAX_POSITION_IN_LESSON = 99
const SLOT = /_{2,}/

function normalizeText(text) {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ')
}

function parseLessons(markdown) {
  return markdown
    .split(/^(?=## )/m)
    .map((section) => ({ heading: section.match(/^## Lesson (\d+)/), section }))
    .filter(({ heading }) => heading)
    .map(({ heading, section }) => ({ number: Number(heading[1]), text: normalizeText(section) }))
}

function phraseSource(phrase) {
  return phrase.trim().split(/[\s-]+/).map(escapeRegExp).join('[\\s-]+')
}

function standaloneRegExp(alternatives) {
  return new RegExp(`(?<![a-z0-9])(?:${alternatives.join('|')})(?![a-z0-9])`)
}

function wordAppearanceMatchers(word) {
  const forms = [...wordForms(word)].sort((a, b) => b.length - a.length)
  return [standaloneRegExp(forms.map(phraseSource))]
}

function patternFixedParts(pattern) {
  return normalizeText(pattern)
    .split(SLOT)
    .flatMap((part) => part.split(/[.?!]+/))
    .map((part) => part.trim().replace(/^[,;:\s]+|[,;:\s]+$/g, ''))
    .filter((part) => /[a-z]/.test(part))
}

function patternAppearanceMatchers(pattern) {
  return patternFixedParts(pattern).map((part) => standaloneRegExp([phraseSource(part)]))
}

function firstAppearance(lessons, matchers) {
  for (const lesson of lessons) {
    const indexes = matchers.map((matcher) => lesson.text.search(matcher))
    if (indexes.every((index) => index >= 0)) return { lesson: lesson.number, index: indexes[0] }
  }
  return null
}

function appearanceInLessons(lessons, matchers, defaultLesson) {
  return firstAppearance(lessons, matchers) ?? { lesson: defaultLesson, index: Infinity }
}

function appearanceInLesson(lessons, lessonNumber, matchers) {
  const index = lessons.find((lesson) => lesson.number === lessonNumber)?.text.search(matchers[0]) ?? -1
  return { lesson: lessonNumber, index: index >= 0 ? index : Infinity }
}

function placeInLessons(unitNumber, items, appearanceOf) {
  const placed = items.map((item, bookOrder) => ({ item, bookOrder, ...appearanceOf(item) }))
  const byLessonThenAppearance = (a, b) => a.lesson - b.lesson || a.index - b.index || a.bookOrder - b.bookOrder
  const positionsByLesson = new Map()
  return [...placed].sort(byLessonThenAppearance).map((entry) => {
    const position = (positionsByLesson.get(entry.lesson) ?? 0) + 1
    positionsByLesson.set(entry.lesson, position)
    if (position > MAX_POSITION_IN_LESSON) throw new Error(`Unit ${unitNumber} lesson ${entry.lesson} has more than ${MAX_POSITION_IN_LESSON} items`)
    return { ...entry.item, unit: unitNumber, lesson: entry.lesson, rank: unitNumber * 1000 + entry.lesson * 100 + position }
  })
}

function sortedByUniqueRank(items, label) {
  const sorted = [...items].sort((a, b) => a.rank - b.rank)
  sorted.forEach((item, index) => {
    if (index > 0 && sorted[index - 1].rank === item.rank) throw new Error(`Duplicate ${label} rank ${item.rank}: "${sorted[index - 1].id}" and "${item.id}"`)
  })
  return sorted
}

function uniqueId(baseId, usedIds) {
  let candidate = baseId
  for (let suffix = 2; usedIds.has(candidate); suffix += 1) candidate = `${baseId}-${suffix}`
  usedIds.add(candidate)
  return candidate
}

function creditFor(found, word, imageUrl) {
  const entry = found.folder.manifest.find((item) => item.file === found.file) ?? {}
  return {
    word: entry.word ?? word,
    image: imageUrl,
    source: entry.source ?? null,
    author: entry.author ?? null,
    license: entry.license ?? null,
  }
}

function isThirdPartyFolder(folder) {
  return folder.name.split('/')[0] === THIRD_PARTY_IMAGE_FOLDER
}

export function buildContent({
  contentDir = path.join(projectRoot, 'content', 'clean'),
  imagesDir = path.join(projectRoot, 'images'),
  audioDir = path.join(projectRoot, 'audio'),
  outDir = path.join(projectRoot, 'public', 'content'),
} = {}) {
  const glossary = parseGlossary(readText(path.join(contentDir, 'glossary.md')))
  const extraWords = parseExtraWords(readText(path.join(contentDir, 'extra-words.md')))
  const bookMap = parseBookMap(readText(path.join(contentDir, 'book-map.md')))
  const imageFolders = listImageFolders(imagesDir)

  const units = Array.from({ length: UNIT_COUNT }, (_, index) => {
    const number = index + 1
    const markdown = readText(path.join(contentDir, `${unitId(number)}.md`))
    return { ...parseUnit(markdown, number, bookMap.get(number)), lessons: parseLessons(markdown) }
  })
  const allNames = units.flatMap((unit) => unit.names)
  const knownWords = [...glossary.map((entry) => entry.word), ...units.flatMap((unit) => unit.vocabulary)].filter(
    (word) => !isProperName(word, allNames),
  )
  const wordMatcher = buildWordMatcher(knownWords)

  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(outDir, 'images'), { recursive: true })

  const credits = []
  const wordsWithoutImage = []
  const sentencesFromFallback = []
  const unitOfWordId = new Map()
  const copiedImageIds = new Map()
  const usedPatternIds = new Set()

  const copyImage = (found, wordId, word) => {
    const fileName = `${wordId}${path.extname(found.file).toLowerCase()}`
    if (copiedImageIds.has(fileName)) throw new Error(`Image id clash: "${fileName}" for "${word}" and "${copiedImageIds.get(fileName)}"`)
    copiedImageIds.set(fileName, word)
    fs.copyFileSync(path.join(found.folder.absoluteDir, found.file), path.join(outDir, 'images', fileName))
    const imageUrl = `content/images/${fileName}`
    if (isThirdPartyFolder(found.folder)) credits.push(creditFor(found, word, imageUrl))
    return imageUrl
  }

  const buildWord = ({ word, wordId, unitNumber, ipa, vi, sentence, imageNames, sight }) => {
    const id = unitId(unitNumber)
    if (unitOfWordId.has(wordId)) throw new Error(`Duplicate word id "${wordId}" in ${unitOfWordId.get(wordId)} and ${id}`)
    unitOfWordId.set(wordId, id)
    const found = findImage(imageNames, id, imageFolders)
    const image = found ? copyImage(found, wordId, word) : null
    if (!image) wordsWithoutImage.push(`${id}: ${word}`)
    return { id: wordId, word, letter: firstLetter(word), ipa, vi, sentence, image, ...(sight && { sight: true }) }
  }

  const buildBookWord = (word, unit, unitWords) => {
    const glossaryEntry = findGlossaryEntry(word, glossary, unit.number)
    const { sentence, fromPattern } = exampleSentence(word, unit.patterns, wordMatcher, unitWords)
    if (!fromPattern) sentencesFromFallback.push(`${unitId(unit.number)}: ${sentence}`)
    return buildWord({
      word,
      wordId: kebabCase(word),
      unitNumber: unit.number,
      ipa: glossaryEntry?.ipa ?? null,
      vi: glossaryEntry?.vi ?? null,
      sentence,
      imageNames: imageCandidateNames(word, glossaryEntry?.word),
    })
  }

  const buildExtraWord = (entry) =>
    buildWord({ ...entry, wordId: entry.id, unitNumber: entry.unit, imageNames: [entry.id], sight: true })

  const unsortedWords = units.flatMap((unit) => {
    const unitWords = unitWordList(unit, glossary, allNames)
    const unitExtraWords = extraWords.filter((entry) => entry.unit === unit.number)
    const extraLessonById = new Map(unitExtraWords.map((entry) => [entry.id, entry.lesson]))
    const words = [...unitWords.map((word) => buildBookWord(word, unit, unitWords)), ...unitExtraWords.map(buildExtraWord)]
    const appearanceOf = (entry) => {
      const matchers = wordAppearanceMatchers(entry.word)
      const extraLesson = extraLessonById.get(entry.id)
      return extraLesson ? appearanceInLesson(unit.lessons, extraLesson, matchers) : appearanceInLessons(unit.lessons, matchers, DEFAULT_WORD_LESSON)
    }
    return placeInLessons(unit.number, words, appearanceOf)
  })

  const unsortedGrammar = units.flatMap((unit) => {
    const patterns = unit.patterns.map((pattern) => ({ id: uniqueId(kebabCase(pattern), usedPatternIds), pattern }))
    const appearanceOf = (entry) => appearanceInLessons(unit.lessons, patternAppearanceMatchers(entry.pattern), DEFAULT_PATTERN_LESSON)
    return placeInLessons(unit.number, patterns, appearanceOf)
  })

  const words = sortedByUniqueRank(unsortedWords, 'word')
  const grammar = sortedByUniqueRank(unsortedGrammar, 'pattern')

  const phrasesWithoutClip = copyClips(words, audioDir, path.join(outDir, 'audio'))
  const index = {
    version: 2,
    wordCount: words.length,
    grammarCount: grammar.length,
    words: 'content/words.json',
    grammar: 'content/grammar.json',
    credits,
    fileVersions: { pictures: folderFingerprint(path.join(outDir, 'images')), audio: folderFingerprint(path.join(outDir, 'audio')) },
  }
  writeJson(path.join(outDir, 'words.json'), words)
  writeJson(path.join(outDir, 'grammar.json'), grammar)
  writeJson(path.join(outDir, 'index.json'), index)

  return { index, words, grammar, imageCount: copiedImageIds.size, wordsWithoutImage, sentencesFromFallback, phrasesWithoutClip }
}

const FINGERPRINT_LENGTH = 12

export function folderFingerprint(folder) {
  const hash = createHash('sha256')
  const files = fs.existsSync(folder) ? fs.readdirSync(folder).sort() : []
  for (const file of files) {
    hash.update(file)
    hash.update(fs.readFileSync(path.join(folder, file)))
  }
  return hash.digest('hex').slice(0, FINGERPRINT_LENGTH)
}

function copyClips(words, audioDir, clipsOutDir) {
  const phrases = spokenPhrases(words)
  if (!fs.existsSync(audioDir)) return phrases
  fs.cpSync(audioDir, clipsOutDir, { recursive: true })
  return phrases.filter((text) => !fs.existsSync(path.join(audioDir, `${clipName(text)}.mp3`)))
}

const REPORT_PREVIEW_SIZE = 12

function printReport(result) {
  console.log(`Content built: ${result.words.length} words, ${result.grammar.length} patterns, ${result.imageCount} images, ${result.index.credits.length} credits`)
  console.log(`Words without image (${result.wordsWithoutImage.length}): ${result.wordsWithoutImage.join(', ') || 'none'}`)
  console.log(`Phrases without audio clip (${result.phrasesWithoutClip.length}): ${result.phrasesWithoutClip.join(', ') || 'none'}`)
  if (result.phrasesWithoutClip.length > 0) console.log('Run npm run audio to make the missing clips.')
  console.log(`Fallback sentences (${result.sentencesFromFallback.length}): ${result.sentencesFromFallback.join(', ') || 'none'}`)
  console.log(`First ${REPORT_PREVIEW_SIZE} words by rank:`)
  for (const word of result.words.slice(0, REPORT_PREVIEW_SIZE)) {
    console.log(`  ${word.rank}  unit ${word.unit}  lesson ${word.lesson}  ${word.word}`)
  }
}

const isRunDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isRunDirectly) printReport(buildContent())
