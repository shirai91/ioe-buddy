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
| POST | `api/exams/:type/results` | `{ correct, total }`, adds stars |
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

## Commands

```bash
npm install
npm run dev       # dev server at http://localhost:5173/ioe-buddy/
npm run content   # build public/content from content/clean and images
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
