import { get, put } from '../db.js'
import { badRequest } from '../httpError.js'

export const PROFILE_STORE = 'profile'
export const PROFILE_KEY = 'me'
export const DEFAULT_PROFILE = { name: 'Buddy', stars: 0 }
const MAX_NAME_LENGTH = 40

export async function readProfile() {
  const { name, stars } = { ...DEFAULT_PROFILE, ...(await get(PROFILE_STORE, PROFILE_KEY)) }
  return { name, stars }
}

export async function saveProfile(profile) {
  return put(PROFILE_STORE, PROFILE_KEY, profile)
}

export async function getProfile() {
  return readProfile()
}

function isFilledString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validName(name) {
  if (!isFilledString(name)) throw badRequest('name must be a non-empty string')
  const trimmed = name.trim()
  if (trimmed.length > MAX_NAME_LENGTH) throw badRequest(`name must be at most ${MAX_NAME_LENGTH} characters`)
  return trimmed
}

function isJsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export async function updateProfile({ body = {} }) {
  if (!isJsonObject(body)) throw badRequest('Body must be a JSON object')
  if (body.unitId !== undefined) throw badRequest('unitId is no longer supported')
  const changes = body.name === undefined ? {} : { name: validName(body.name) }
  return saveProfile({ ...(await readProfile()), ...changes })
}
