import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { planClips, voiceInput } from './build-audio.mjs'

describe('planClips', () => {
  const phrases = ['Great job!', 'ball', 'I see a ball.']

  test('makes only the clips that are missing', () => {
    const plan = planClips(phrases, ['ball.mp3'])

    assert.deepEqual(plan.toMake, [
      { file: 'great-job.mp3', text: 'Great job!' },
      { file: 'i-see-a-ball.mp3', text: 'I see a ball.' },
    ])
  })

  test('removes clips that no phrase uses and keeps other files', () => {
    const plan = planClips(phrases, ['ball.mp3', 'kite.mp3', '.DS_Store'])

    assert.deepEqual(plan.toRemove, ['kite.mp3'])
  })

  test('remakes every clip when asked', () => {
    const plan = planClips(phrases, ['ball.mp3', 'great-job.mp3', 'i-see-a-ball.mp3'], { remakeAll: true })

    assert.equal(plan.toMake.length, 3)
  })
})

describe('voiceInput', () => {
  test('spells a single letter so "a" is not read as the word "a"', () => {
    assert.equal(voiceInput('A'), '[[char LTRL]]a[[char NORM]]')
  })

  test('keeps words and sentences as they are', () => {
    assert.equal(voiceInput('I see a ball.'), 'I see a ball.')
  })
})
