# IOE exam analysis (Grade 1, rounds 6-15)

The source is `content/raw/ioe-rounds.md`. It holds the questions and answers of the IOE self-practice rounds 6-15. The real exam is on 26-29/11/2026.

## Games in the rounds

Each round has 4 games. Each game has 10 questions (Match Up has 6 pairs).

| IOE game | What the child does | Rounds | IOE Buddy game |
|---|---|---|---|
| Tái tạo san hô, Dọn rác bãi biển, Chinh phục Fansipan | Types the missing letters or the missing word. Some have a picture, some have audio, some have only the sentence. | 6-15 | Fill In |
| Ghép cặp | Matches a word, a phrase or missing letters to a picture. | 6-15 | Match Up |
| Bắn nỏ | Removes the extra letter from a word (BAKG → BAG). Some questions use audio or a riddle. | 6-10, 15 | Letter Pop |
| Cao thủ trượt ván, Tàu vũ trụ | Reads or hears a phrase and picks the picture (A-D). | 6, 7, 10-15 | Picture Pick |
| Thành phố xanh | Picks the word or the letters for a blank (A-D). | 8, 9, 11-13 | Sentence Quiz |

## Words

- The rounds use about 60 words. Most are in Tieng Anh 1 Units 1-6. The others are home, food, color and number words.
- The words in every round or almost every round: bag, this, I, bike, apple, my, cat, cake, can, have, and, car.
- Before this change, many exam words came late as new flash cards: one at rank 180, bed at 202, street at 289, window at 291.
- `content/clean/exam-words.md` lists 64 exam words. Most used come first. The build now gives these words ranks 1-64.
- 4 words were not in the app. They are new Starters-style cards now: room, pillow, clock (unit 22) and school (unit 23).
- The distractor pictures (squirrel, rocket, scooter, candy and others) are not exam words. The app does not add them.

## Sentences

The rounds use these patterns most:

- `This is my ___.` / `This is a ___.` / `This ___ my bag.`
- `I have a ___.` / `I have an apple.` / `I like milk.`
- `There's a/an ___ in/on the ___.` / `There are two apples.`
- `Hi, I'm Bill.` / `Bye, Bill.`
- `A ___ and a ___.` (one thing each, not many)
- Riddles: `You sleep on it at night.` → bed

`content/clean/sentence-choice.md` has 36 new questions from the rounds. They include the article questions (a/an/my), the verb questions (is/am/have/has/like), the riddles and the new words. Count questions now also use can, pillow and clock.

## Tips from the rounds

- "A cat" means one cat. Pick the picture with only one thing.
- "an" comes before a, e, i, o, u: an apple.
- Do not use "a" with "my": "This is my bag", not "This is my a bag".
- When two words fit the letters, pick the simple word that the round uses in other questions.

## Faster new words

The exam is in 8 days, so new words now come faster.

| Rule | Before | Now |
|---|---|---|
| Weak words that stop new words | 8 | 20 |
| Slots kept for new words in a session | 2 (one word) | 2 for each allowed new word (up to 4 words) |

A simulation tests the new rules. The child starts on 19/11 and already knows the first 50 words of the old order. The child rates 50% of new cards easy and 30% medium. "Known" means box 2 or higher on 25/11.

| Sessions a day | Rules | All 64 exam words seen | Seen on 25/11 | Known on 25/11 |
|---|---|---|---|---|
| 2 | old | day 21 | 30 of 64 | 26 of 64 |
| 2 | new | day 10 | 53 of 64 | 34 of 64 |
| 3 | old | day 12 | 43 of 64 | 35 of 64 |
| 3 | new | day 6 (24/11) | 64 of 64 | 45 of 64 |

The "old" rows already use the new exam-first order. With the old order, the last exam words came after rank 280.

Do 3 flash card sessions a day until the exam. Then the child sees all exam words by 24/11 and has 1-2 days to review them.
