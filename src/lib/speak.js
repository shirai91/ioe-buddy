import { clipPath } from './clips.js'

export const SPEECH_LANG = 'en-US'
export const SPEECH_RATE = 0.8

let player = null
let turn = 0

function stopVoice() {
  const synth = globalThis.speechSynthesis
  if (synth?.speaking || synth?.pending) synth.cancel()
}

function speakWithVoice(texts) {
  try {
    const synth = globalThis.speechSynthesis
    if (!synth) return false
    stopVoice()
    const utterance = new SpeechSynthesisUtterance(texts.join(' ').toLowerCase())
    utterance.lang = SPEECH_LANG
    utterance.rate = SPEECH_RATE
    synth.speak(utterance)
    return true
  } catch {
    return false
  }
}

export function clipUrl(text) {
  return `${import.meta.env.BASE_URL}${clipPath(text)}`
}

function playClip(text) {
  return new Promise((resolve, reject) => {
    player.onended = resolve
    player.onerror = reject
    player.src = clipUrl(text)
    Promise.resolve(player.play()).catch(reject)
  })
}

async function playClips(texts, myTurn) {
  for (const [index, text] of texts.entries()) {
    try {
      await playClip(text)
    } catch {
      if (myTurn === turn) speakWithVoice(texts.slice(index))
      return
    }
    if (myTurn !== turn) return
  }
}

export function speak(...parts) {
  const texts = parts.flat().filter(Boolean)
  if (texts.length === 0) return false
  turn += 1
  stopVoice()
  if (typeof Audio === 'undefined') return speakWithVoice(texts)
  player ??= new Audio()
  player.pause()
  playClips(texts, turn)
  return true
}
