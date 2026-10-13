# IOE Buddy

English flash cards and word games for kids. Client-only React PWA, hosted on GitHub Pages.

See [docs/INTENTION.md](docs/INTENTION.md). The screens follow the Word Buddies design in `docs/design/`.

The MVP has no login. All progress stays on the device.

## Architecture

### Service worker backend

- `src/sw.js` is the service worker. It precaches the app and answers every request to `<scope>api/...`.
- `src/sw/router.js` matches the method and path and returns JSON. An unknown route gives 404. A handler error gives 500.
- `src/sw/handlers/` holds one file per resource: profile, flashcards, exams, word of the day, credits, reset.
- `src/sw/exams/` holds one question generator per game: Picture Pick, Letter Pop, Match Up, Fill In. Each call gives a new random set of 10 questions.
- `src/sw/srs.js` schedules flash cards (Leitner boxes 0-5).
- `src/sw/pool.js` builds each 10-card session and the game word pool. See [docs/flashcard-pool.md](docs/flashcard-pool.md).
- The React app calls the backend only through `src/api/client.js`. It waits until the service worker controls the page before the first call.

| Method | Route | Result |
| --- | --- | --- |
| GET, PUT | `api/profile` | `{ name, stars }` |
| GET | `api/word-of-the-day` | one word, the same all day |
| GET | `api/flashcards` | one session of 10 cards from the pool |
| POST | `api/flashcards/:wordId/rate` | `{ rating: "easy" \| "medium" \| "hard" }` |
| GET | `api/exams/:type` | 10 questions for a game, from the words the learner has seen |
| POST | `api/exams/:type/results` | `{ correct, total }`, moves stars up or down, returns `{ stars, change }` |
| GET | `api/credits` | picture credits |
| POST | `api/reset` | clears progress and stars, keeps the name |

### Storage

- Progress lives in IndexedDB inside the service worker (database `ioe-buddy`, stores `profile`, `cards`, `results`).
- The app never touches storage directly.

### Content build

- `scripts/build-content.mjs` reads `content/clean/*.md` and writes JSON to `public/content/` (ignored by git).
- `public/content/words.json` holds all words and `public/content/grammar.json` all sentence patterns. `public/content/index.json` points to them and lists the picture credits.
- Units and lessons are hidden metadata (`unit`, `lesson`, `rank`). The app never shows them. `rank` sets the order in which new words come in.
- Each word gets its picture from `images/unit-XX/` first, then from any other `images/` folder. The script copies only the pictures that words use, to `public/content/images/<id>.png`.
- `npm run dev` and `npm run build` run the content build first.

### Pictures from the internet

- `images/web/` holds pictures that the book does not have (one to five, fish and chips). They come from Twemoji (CC-BY 4.0).
- `images/web/manifest.json` lists the source, author and license of each file. The content build puts them in the credits, and the app shows them on the Credits screen.
- To add a picture: put the PNG in `images/web/`, add an entry to the manifest, and run `npm run content`.

### Audio clips

- The app plays recorded clips, not the browser voice, because the browser voice on Android is slow and sometimes silent.
- `audio/` holds one `.mp3` for each text the app can say: each word, its sentence, "Find the <word>", the letters, the cheers, "Great job!" and "Try again". `src/lib/clips.js` lists these texts and gives each clip its file name.
- `npm run audio` makes the missing clips with the macOS `say` voice "Ava (Premium)" and `ffmpeg`, and removes clips that no text uses. `npm run audio -- --all` makes all clips again. `npm run audio -- --voice Samantha` uses a different installed voice. To get Ava, open System Settings > Accessibility > Spoken Content > System Voice > Manage Voices, and download "Ava (Premium)".
- Run `npm run audio` after you change words, sentences or cheers, and commit `audio/`. CI does not make clips.
- The content build copies `audio/` to `public/content/audio/`. The service worker keeps the clips for offline use and answers range requests from its cache.
- If a clip is missing or fails to play, `speak()` uses the browser voice for that text.

### Updates

- The content build writes `fileVersions` in `index.json`: a fingerprint of all pictures and of all clips. The service worker keeps pictures in `word-pictures-<fingerprint>` and clips in `word-audio-<fingerprint>`. When a file changes, the cache name changes, the phone downloads the files again, and the service worker deletes the old cache.
- A new service worker does not take over by itself. It waits, and `src/api/client.js` tells the app that an update is ready. The app looks for a new version at start and each time it comes back to the screen.
- `UpdatePrompt` shows "Time to update!" over the app. "Update now" starts the new service worker, downloads its pictures and clips with a progress bar, and reloads the app. After 2 minutes it reloads anyway.
- If the learner closes the app without the update, the new version starts the next time the app opens.

## Commands

```bash
npm install
npm run dev       # dev server at http://localhost:5173/ioe-buddy/
npm run content   # build public/content from content/clean and images
npm run audio     # make missing audio clips in audio/ (macOS only)
npm test          # Vitest (backend + UI) and node --test for scripts/
npm run lint      # oxlint
npm run build     # production build in dist/
npm run preview   # serve dist/ at http://localhost:4173/ioe-buddy/
```

Service workers need a real browser. Open the app in Chrome, Safari or Edge.

## Deploy

- Every push to `main` runs `.github/workflows/deploy.yml`. It runs lint, tests and the build, then publishes `dist/` to GitHub Pages.
- To deploy again without a push, run the workflow by hand in the Actions tab.
- The app runs at https://shirai91.github.io/ioe-buddy/. If the repo name changes, change `base` in `vite.config.js`.
