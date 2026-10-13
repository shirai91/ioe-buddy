export const CHEERS = {
  easy: ['Super!', 'Great!', 'Perfect!', 'Excellent!', 'Fantastic!', 'Awesome!', 'Well done!', 'You got it!'],
  medium: ['Good try!', 'Nice try!', 'Almost there!', 'So close!', 'Keep going!', 'You can do it!', 'Nearly!'],
  hard: [
    'We will practice it again.',
    "That's OK!",
    "Let's try it again later.",
    'No problem!',
    'You will get it next time!',
    'Practice makes perfect!',
  ],
}

export function pickCheer(level, previous, random = Math.random) {
  const fresh = CHEERS[level].filter((cheer) => cheer !== previous)
  return fresh[Math.floor(random() * fresh.length)]
}
