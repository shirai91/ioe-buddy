# IOE Buddy — Intention

## Why

Help my kid learn English with flash cards and short exercises.

## Who

- **Learner:** my kid. Uses the app on a phone, tablet, or computer.
- **Parent:** me. Adds the word lists and checks progress.

## What the app does

- Shows vocabulary as flash cards.
- Gives simple exercises to practise the same words.
- Saves the learner's progress, so they can continue on any device.

## Where the words come from

- The vocabulary comes from a PDF file. I will give the PDF later.
- We convert the PDF into JSON files one time, before we build the app.
- The app reads only the JSON files. It never reads the PDF.

## How it is built

### App

- Client-only PWA (Progressive Web App: a web site that installs and works like a phone app).
- Pure React JS. No server code.
- Hosted on GitHub Pages as static files.

### Backend

- Firebase Authentication for sign-in.
- Firebase stores user data only: progress, scores, and settings.
- Firebase does not store the vocabulary.

### App data

- All app data (vocabulary, exercises) lives in static JSON files in the app.
- Split the data into small JSON files, for example one file per unit or topic.
- Keep one small index file that lists the units and their file paths.
- Fetch a unit file only when the learner opens that unit. Do not load all data at start.

## Rules we keep

- No coding before this intention is agreed.
- The app must work as static files on GitHub Pages.
- Keep each JSON file small, so the app loads fast on a phone.

## Open questions

- What does the PDF look like? Word lists, units, pictures, example sentences?
- Which exercise types do we want first?
- Do we need audio (word pronunciation)?
- One learner or more than one learner per parent account?
- Must the app work offline after the first visit?
