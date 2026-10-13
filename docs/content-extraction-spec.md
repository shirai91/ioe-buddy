# Content extraction spec

Source: `/Users/tung.pham/Downloads/Tieng-Anh-1-Global-Success---Sach-Hoc-Sinh-b1c517ec-3afa-4af9-a169-12cf89196879.pdf`

The PDF has no text layer. Read pages as images with the Read tool and the `pages` parameter.
PDF page = printed book page + 1.

## Section map

| File | Section | Book pages | PDF pages |
|---|---|---|---|
| book-map.md | Book map | 4-5 | 5-6 |
| unit-01.md | Unit 1 In the school playground | 6-8 | 7-9 |
| unit-02.md | Unit 2 In the dining room | 9-11 | 10-12 |
| fun-time-1.md | Fun time 1 | 12-13 | 13-14 |
| unit-03.md | Unit 3 At the street market | 14-16 | 15-17 |
| unit-04.md | Unit 4 In the bedroom | 17-19 | 18-20 |
| review-1.md | Review 1 | 20-22 | 21-23 |
| unit-05.md | Unit 5 At the fish and chip shop | 23-25 | 24-26 |
| unit-06.md | Unit 6 In the classroom | 26-28 | 27-29 |
| fun-time-2.md | Fun time 2 | 29-30 | 30-31 |
| unit-07.md | Unit 7 In the garden | 31-33 | 32-34 |
| unit-08.md | Unit 8 In the park | 34-36 | 35-37 |
| review-2.md | Review 2 | 37-39 | 38-40 |
| unit-09.md | Unit 9 In the shop | 40-42 | 41-43 |
| unit-10.md | Unit 10 At the zoo | 43-45 | 44-46 |
| fun-time-3.md | Fun time 3 | 46-47 | 47-48 |
| unit-11.md | Unit 11 At the bus stop | 48-50 | 49-51 |
| unit-12.md | Unit 12 At the lake | 51-53 | 52-54 |
| review-3.md | Review 3 | 54-56 | 55-57 |
| unit-13.md | Unit 13 In the school canteen | 57-59 | 58-60 |
| unit-14.md | Unit 14 In the toy shop | 60-62 | 61-63 |
| fun-time-4.md | Fun time 4 | 63-64 | 64-65 |
| unit-15.md | Unit 15 At the football match | 65-67 | 66-68 |
| unit-16.md | Unit 16 At home | 68-70 | 69-71 |
| review-4.md | Review 4 | 71-73 | 72-74 |
| glossary.md | Glossary | 74+ | 75-77 |

Verify each boundary against the page images. If a boundary is wrong, follow the images and say so in the file's `Notes`.

## Output folders

- Raw extraction: `content/raw/<file>`
- Cleaned output: `content/clean/<file>`

## File format (Markdown)

```markdown
# Unit 1: In the school playground

- Type: unit | fun-time | review | glossary | book-map
- Book pages: 6-8
- PDF pages: 7-9
- Phonics: Bb
- Vocabulary: ball, bike, book
- Names: Bill
- Sentence patterns: Hi, I'm Bill. / Bye, Bill.

## Lesson 1

### Activity 1: Listen and repeat. (Track 2)

- Words: ball, Bill, book, bike
- Highlighted letter: b
- Picture: school playground; two boys play with a ball; a girl reads a book; a bike.

### Activity 4: Listen and tick. (Track 4)

1. a) [picture: basketball] b) [picture: bike] — example answer shown: b
2. a) [picture: football] b) [picture: book] — answer: from audio, not shown

### Activity 7: Let's talk.

- Picture 1: [description]. Speech: "Hi, I'm Bill."
- Picture 2: [description]. Speech: "Bye, Bill."

## Notes

- Anything uncertain, unreadable, or a boundary change.
```

## Rules

- Copy all English text that is printed on the page exactly: words, labels, instructions, sentences, dialogue lines, captions.
- Keep the book's activity number, title, and track number.
- Describe every picture that an exercise needs (tick options, matching items, trace words, odd-one-out). Use plain words: `[picture: red apple]`.
- For tracing activities, list the letters or words to trace and the missing letters to write.
- Write `answer: from audio, not shown` when the answer needs the audio. Write the answer when the page shows it (example items).
- If the book prints no answer but the pictures make it clear (read and tick, look and circle, matching, word grids), write `answer (from pictures): <x>`.
- Songs and chants: do not copy full lyrics. Record the title (if any), track number, the target words, the repeated sentence patterns, and a one-line summary.
- Stories (Review pages): for each frame, give a short description and the speech lines that use the unit sentence patterns.
- Skip noise: page numbers, running footers ("Unit 1 In the school playground"), icon images, watermark, decoration.
- Do not invent text. If you cannot read something, write `[unreadable]` and add a note.
- The glossary: list every entry with its unit and any Vietnamese meaning shown.
