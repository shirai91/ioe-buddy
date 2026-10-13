import { generate as fillIn } from './fillIn.js'
import { generate as letterPop } from './letterPop.js'
import { generate as matchUp } from './matchUp.js'
import { generate as picturePick } from './picturePick.js'
import { generate as sentencePick } from './sentencePick.js'

export const examGenerators = {
  'picture-pick': picturePick,
  'letter-pop': letterPop,
  'match-up': matchUp,
  'fill-in': fillIn,
  'sentence-pick': sentencePick,
}

export const EXAM_TYPES = Object.keys(examGenerators)
