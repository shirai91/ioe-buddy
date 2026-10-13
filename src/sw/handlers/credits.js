import { loadIndex } from '../content.js'

export async function getCredits() {
  const index = await loadIndex()
  return index.credits ?? []
}
