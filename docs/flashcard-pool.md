# Flash card pool

The learner never sees units or lessons. The app keeps them as hidden metadata on each word and pattern. The metadata sets the order in which new words come in: book Unit 1 Lesson 1 first, then later lessons.

## Content metadata

`npm run content` writes:

- `public/content/index.json`: `{ version: 2, wordCount, grammarCount, words: "content/words.json", grammar: "content/grammar.json", credits }`
- `public/content/words.json`: all words, sorted by `rank`.
  `{ id, word, letter, ipa, vi, sentence, image, unit, lesson, rank, sight? }`
- `public/content/grammar.json`: all sentence patterns, sorted by `rank`.
  `{ id, pattern, unit, lesson, rank }`
- `public/content/images/<id>.png`: one picture per word.

Hidden fields:

| Field | Meaning |
|---|---|
| `unit` | Book unit number, 1-16. |
| `lesson` | First lesson (1-3) of that unit where the word or pattern is printed. Vocabulary words not found in a lesson get 1. |
| `rank` | `unit * 1000 + lesson * 100 + position`. `position` is the order of first appearance in that lesson (book order). Lower rank = taught earlier. Ranks are unique. |

No screen shows `unit`, `lesson` or `rank`. No API route takes a unit.

## Word sources

- Book words: the unit vocabulary line plus the glossary words of that unit. The sentence comes from the unit patterns.
- Sight words: `content/clean/extra-words.md`. These are greetings, verbs, adjectives and small words that the children say in the songs, chants and speech bubbles (hi, bye, have, like, look, see, sunny, he, she...). Each row gives the word, an optional id, ipa, vi, unit, lesson and the book sentence. These words get `sight: true`.
- A sight word goes in the lesson from its row. Its picture is `images/web/<id>.png` (Twemoji), or none.
- An id must be unique. Use the `Id` column when two words have the same spelling (`can` the noun, `can-verb` the verb).
- Articles (a, an, the) and "is", "are", "at", "to" are not cards.

## Card state

Each rated word has a progress row: `{ wordId, box, rating, dueAt, reviewedAt, introducedAt, promotedOn, seen, lapses }`.

| State | Rule |
|---|---|
| new | No progress row. |
| tricky | Last rating was `hard`. |
| learning | Seen, not tricky, `box <= 1`. |
| due | Seen, not tricky, `dueAt <= now`. |
| resting | Seen, `dueAt > now`. |


## Rating

Leitner boxes 0-5. Review interval in days by box: `[0, 1, 3, 7, 14, 30]`.

| Rating | Effect |
|---|---|
| hard | `box = 0`, `dueAt = now`. `lapses + 1` if the old box was 2 or more. |
| medium | Box stays (a new word goes to 1). `dueAt = now + 1 day`. |
| easy | `box + 1` (max 5), `dueAt = now + interval[box]`. A word goes up only one box per calendar day (`promotedOn`). A second easy on the same day keeps box and `dueAt`. |

Every rating sets `reviewedAt = now`, `seen + 1`, and `introducedAt` on the first rating.

## Session: 10 cards

`GET api/flashcards` builds one session of exactly 10 cards (fewer only when the content has fewer words). A word shows at most twice. The same word is never on two cards in a row.

Limits:

| Name | Value |
|---|---|
| `SESSION_SIZE` | 10 |
| `MAX_NEW_PER_SESSION` | 4 |
| `MAX_TRICKY_PER_SESSION` | 4 |
| Unlocked words | `5 + floor(stars / 2)`. New words stop when the seen words reach this count. See [Stars](#stars). |
| `MIN_RECALL_GAP` | 3 cards between a new word and its recall |

Fill order:

1. **Tricky**: tricky words, oldest `reviewedAt` first, up to 4.
2. **Reserve**: if new words are allowed and some exist, keep 2 slots free for one new word.
3. **Due**: due words, lowest box first, then most overdue, then lowest rank. Fill up to the reserve.
4. **New**: unseen words in strict `rank` order. Each new word takes 2 slots: a `new` card and a `recall` card later. Count = min(allowed, free slots / 2).
5. **Warm-up**: other seen words, picked with weighted random. Weight = `(6 - box) * (1 + daysSinceReviewed / 7)`. Weak and old words come more often.
6. **Top-up**: if slots are still free, add more unseen words in rank order (over the session cap, under the unlocked word count). A new word in the last free slot has no recall.
7. **Repeat**: if slots are still free, add a second card for words in the session, tricky first.

Order:

- Start with a known card (due or warm-up) when there is one. Easy start, more confidence.
- Spread `new` cards over the first 60% of the session.
- Each `recall` comes at least 3 cards after its `new` card.
- Tricky cards go in the middle, between easier cards.

Each card in the response: the word fields plus `{ key, kind, box }`. `kind` is `new | recall | tricky | due | warmup | repeat`. `key` is unique in the session (`<wordId>:<n>`).

First session for a new learner: 5 new words (`ball`, `book`, `bike`, then the next 2 by rank), each with a recall = 10 cards.

## Stars

Stars show what the learner knows now. They go up and down, like a chess rating.

A finished game changes the stars by `round(10 * correct / total) - 5`:

| Score | Change |
|---|---|
| 10 of 10 | +5 |
| 7 of 10 | +2 |
| 5 of 10 | 0 |
| 2 of 10 | -3 |
| 0 of 10 | -5 |

Stars never go below 0. `POST api/exams/:type/results` returns `{ stars, change }`. `change` is the real change after the 0 floor.

Stars open new flash card words. The learner can see `5 + floor(stars / 2)` words. A perfect game opens 2 or 3 more words. If the stars go down, the learner keeps the words they saw, but no new words come until the stars go up again. Rules live in `src/sw/stars.js`.

## Other routes that use the pool

- **Games** (`GET api/exams/:type`): the generator gets `words` = seen words, tricky first, then lowest box. If fewer than 6 words are seen, the next unseen words by rank fill it to 6. `allWords` (all content) is used for distractors. Picture Pick and Match Up treat sight words as words with no picture, so they come last as answers and distractors.
- **Word of the day**: picked by the date hash from the seen words plus the next 3 unseen words by rank.
- **Reset**: deletes all progress. The pool starts again at Unit 1 Lesson 1.
