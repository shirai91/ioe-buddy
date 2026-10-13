import { clear } from '../db.js'
import { RESULTS_STORE } from './exams.js'
import { CARDS_STORE } from './flashcards.js'
import { readProfile, saveProfile } from './profile.js'

export async function resetProgress() {
  await Promise.all([clear(CARDS_STORE), clear(RESULTS_STORE)])
  const profile = await readProfile()
  await saveProfile({ ...profile, stars: 0 })
  return { ok: true }
}
