import { loadWords } from '../content.js'
import { add } from '../db.js'
import { examGenerators } from '../exams/index.js'
import { badRequest, notFound } from '../httpError.js'
import { examPool } from '../pool.js'
import { readProgressByWordId } from './flashcards.js'
import { readProfile, saveProfile } from './profile.js'

export const QUESTIONS_PER_EXAM = 10
export const RESULTS_STORE = 'results'

function generatorFor(type) {
  if (!Object.hasOwn(examGenerators, type)) throw notFound(`Unknown exam type ${type}`)
  return examGenerators[type]
}

export async function getExam({ params }) {
  const generate = generatorFor(params.type)
  const [allWords, progressByWordId] = await Promise.all([loadWords(), readProgressByWordId()])
  const words = examPool({ words: allWords, progressByWordId })
  const questions = await generate({ words, allWords, count: QUESTIONS_PER_EXAM })
  return { type: params.type, questions }
}

function isCount(value) {
  return Number.isInteger(value) && value >= 0
}

function validScore(body) {
  const { correct, total } = body ?? {}
  if (!isCount(correct) || !isCount(total) || correct > total) {
    throw badRequest('correct and total must be whole numbers with correct <= total')
  }
  return { correct, total }
}

export async function postExamResult({ params, body }) {
  generatorFor(params.type)
  const { correct, total } = validScore(body)
  const profile = await readProfile()
  const saved = await saveProfile({ ...profile, stars: profile.stars + correct })
  await add(RESULTS_STORE, { type: params.type, correct, total, time: Date.now() })
  return { stars: saved.stars }
}
