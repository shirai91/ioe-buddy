export const SPEECH_LANG = 'en-US'
export const SPEECH_RATE = 0.8

export function speak(text) {
  try {
    const synth = globalThis.speechSynthesis
    if (!synth || !text) return false
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text.toLowerCase())
    utterance.lang = SPEECH_LANG
    utterance.rate = SPEECH_RATE
    synth.speak(utterance)
    return true
  } catch {
    return false
  }
}
