import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'
import { clipName, spokenPhrases } from '../src/lib/clips.js'
import { buildContent } from './build-content.mjs'

const run = promisify(execFile)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AUDIO_DIR = path.join(projectRoot, 'audio')
const DEFAULT_VOICE = 'Ava (Premium)'
const WORDS_PER_MINUTE = '140'
const PARALLEL_CLIPS = 6
const TRIM_SILENCE = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'

export function planClips(phrases, existingFiles, { remakeAll = false } = {}) {
  const wanted = new Map(phrases.map((text) => [`${clipName(text)}.mp3`, text]))
  const existing = new Set(existingFiles)
  return {
    toMake: [...wanted].filter(([file]) => remakeAll || !existing.has(file)).map(([file, text]) => ({ file, text })),
    toRemove: existingFiles.filter((file) => file.endsWith('.mp3') && !wanted.has(file)),
  }
}

export function voiceInput(text) {
  const isSingleLetter = /^[a-z]$/i.test(text)
  return isSingleLetter ? `[[char LTRL]]${text.toLowerCase()}[[char NORM]]` : text
}

async function makeClip({ file, text }, voice, workDir) {
  const spoken = path.join(workDir, `${path.basename(file, '.mp3')}.aiff`)
  await run('say', ['-v', voice, '-r', WORDS_PER_MINUTE, '-o', spoken, voiceInput(text)])
  await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', spoken, '-af', TRIM_SILENCE, '-ac', '1', '-ar', '24000', '-b:a', '48k', path.join(AUDIO_DIR, file)])
}

async function inLanes(items, work) {
  const queue = [...items]
  const lane = async () => {
    while (queue.length > 0) await work(queue.shift())
  }
  await Promise.all(Array.from({ length: PARALLEL_CLIPS }, lane))
}

async function makeClips({ voice, remakeAll }) {
  const { words } = buildContent()
  fs.mkdirSync(AUDIO_DIR, { recursive: true })
  const plan = planClips(spokenPhrases(words), fs.readdirSync(AUDIO_DIR), { remakeAll })
  for (const file of plan.toRemove) fs.rmSync(path.join(AUDIO_DIR, file))
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ioe-audio-'))
  try {
    await inLanes(plan.toMake, (clip) => makeClip(clip, voice, workDir))
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }
  const { phrasesWithoutClip } = buildContent()
  console.log(`Audio clips: ${plan.toMake.length} made, ${plan.toRemove.length} removed, ${phrasesWithoutClip.length} missing, voice ${voice}`)
}

const isRunDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isRunDirectly) {
  const { values } = parseArgs({ options: { voice: { type: 'string', default: DEFAULT_VOICE }, all: { type: 'boolean', default: false } } })
  await makeClips({ voice: values.voice, remakeAll: values.all })
}
