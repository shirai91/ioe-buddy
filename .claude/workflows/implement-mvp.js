export const meta = {
  name: 'implement-mvp',
  description: 'Build the IOE Buddy MVP from docs/design: skeleton, content, images, service-worker backend, screens, verify',
  whenToUse: 'Start or redo the first MVP build of IOE Buddy from the Word Buddies design',
  phases: [
    { title: 'Foundation', detail: 'skeleton + content pipeline + missing images, in parallel' },
    { title: 'Features', detail: 'service-worker backend and screens, one agent per non-overlapping file set' },
    { title: 'Verify', detail: 'build, test, lint, fix' },
  ],
}

const RESULT = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    checks: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'summary', 'files', 'checks', 'issues'],
}

const CONTEXT = `
You work in the repo /Users/tung.pham/projects/personal/ioe-buddy (IOE Buddy: English flash cards and word games for a 6-year-old).
Other agents work in the same folder at the same time. Touch ONLY the files your task owns. Never run git commit, git stash, git reset or git checkout.

Product facts:
- Read docs/INTENTION.md. The MVP has NO login and NO Firebase. Skip the design's Login screen (docs/design/Main.dc.html).
- The design is in docs/design/*.dc.html (Word Buddies). Each file is HTML + a DCLogic class that shows the behaviour. Match its look exactly: colors, fonts (Baloo 2 800 for headings, Nunito 600-800 for body), 4px #1D2B53 borders, chunky offset shadows, radii, sizes, SVG icons, copy, animations. Phone first (390px wide), centered column with max-width about 440px on wide screens.
- Stack: React 19 + Vite 8 + vite-plugin-pwa, plain JS (.jsx/.js), no TypeScript. Deployed to GitHub Pages under base "/ioe-buddy/". Use HashRouter routes. Use relative URLs (no leading slash) for app data so the base path works.
- Text to speech: window.speechSynthesis, lang en-US, rate 0.8 (see the design's speak()).

Architecture (the contract — do not change it):
- The service worker IS the backend. src/sw.js is the vite-plugin-pwa injectManifest entry. It precaches the app and answers every request whose path is "<scope>api/...". Persistent data lives in IndexedDB inside the service worker (localStorage does not exist in a service worker). The app never touches storage directly.
- The client calls the backend only through src/api/client.js (fetch to relative "api/..." URLs, JSON in and out). The client waits for navigator.serviceWorker to control the page before the first call.
- Content JSON is generated at build time by scripts/build-content.mjs into public/content/ (gitignored):
  public/content/index.json = { units: [{ id: "unit-01", number: 1, title, phonics, patterns: [string], wordCount, file: "content/units/unit-01.json" }], credits: [{ word, image, source, author, license }] }
  public/content/units/unit-XX.json = { id, number, title, phonics, patterns, words: [{ id, word, letter, ipa, vi, sentence, image }] }
  "letter" is the word's first letter as "Bb". "image" is a relative URL like "content/images/unit-01/ball.png", or null. The service worker reads these files with fetch and serves them through the API.
- API routes (all JSON, all under "api/"):
  GET  api/units                       -> [{ id, number, title, phonics, wordCount }]
  GET  api/units/:id                   -> unit file (words included)
  GET  api/profile                     -> { name, stars, unitId }   (defaults: name "Buddy", stars 0, unitId "unit-01"; unitId may be "all")
  PUT  api/profile                     <- { name?, unitId? }  -> profile
  GET  api/word-of-the-day             -> word (same word all day, from all units)
  GET  api/flashcards?unit=ID          -> { unitId, cards: [word + { rating, dueAt }] }  (due and hard cards first; unit defaults to profile.unitId)
  POST api/flashcards/:wordId/rate     <- { rating: "easy"|"medium"|"hard" } -> { ok: true }
  GET  api/exams/:type?unit=ID         -> { type, unitId, questions: [...] }  (type: picture-pick | letter-pop | match-up | fill-in; 10 questions/rounds; new random set every call; distractors may come from other units)
  POST api/exams/:type/results         <- { correct, total } -> { stars }  (adds "correct" stars to the profile total)
  GET  api/credits                     -> index.json credits
  POST api/reset                       -> { ok: true }  (clears progress and stars, keeps name)
  Unknown route -> 404 { error }. Handler error -> 500 { error }.
- Exam question generators live in src/sw/exams/<camelType>.js and export generate({ words, allWords, count }) -> questions. The question shape of each type is owned by the agent that builds that game's screen.

File layout:
- src/sw.js, src/sw/router.js, src/sw/db.js, src/sw/content.js, src/sw/handlers/*.js, src/sw/exams/{index,picturePick,letterPop,matchUp,fillIn}.js
- src/api/client.js
- src/components/* shared UI (AppHeader, BackButton, StarPill, ProgressSegments, ChunkyButton, WordPicture, ListenButton, FeedbackBar, ResultCard, Mascot) + src/lib/speak.js + src/lib/useApi.js
- src/screens/{Home,Practice,Credits,FlashCards,PicturePick,LetterPop,MatchUp,FillIn}.jsx (+ a .css file next to each when needed)
- Tests: Vitest, files next to the code as *.test.js(x).

Code rules (the user requires these):
- Do NOT write code comments. No file headers, no JSDoc, no section banners, no commented-out code, no TODOs. Name functions and variables so the code explains itself. Keep existing tool directives such as eslint-disable.
- Match the existing code style: ES modules, 2-space indent, no semicolons, single quotes (see src/main.jsx, vite.config.js).
- Do not add npm dependencies unless your task says you own package.json. If you need one, report it in "issues".
- Accessible markup as in the design: real <button>/<a>, aria-labels on icon buttons, touch targets >= 44px, decorative SVG aria-hidden.
- "Done" means your checks pass. Run them and report the real output in "checks".
`

const SKELETON = `${CONTEXT}
TASK: Build the app skeleton and every shared contract, so the other agents can build features in parallel against real code.
You OWN: package.json, package-lock.json, vite.config.js, index.html, vitest config, .gitignore, src/main.jsx, src/App.jsx, src/index.css, src/sw.js, src/sw/router.js, src/sw/exams/index.js, src/api/**, src/components/**, src/lib/**, and placeholder files for every screen and handler listed below.
Do NOT write scripts/build-content.mjs or anything under images/ or public/content/ (other agents own them).

Steps:
1. Install deps: react-router-dom, workbox-precaching, @fontsource/baloo-2, @fontsource/nunito (self-hosted fonts so the PWA works offline); dev: vitest, jsdom, fake-indexeddb, @testing-library/react. Add scripts: "content": "node scripts/build-content.mjs", "predev": "npm run content", "prebuild": "npm run content", "test": "vitest run". Add public/content/ to .gitignore.
2. vite.config.js: switch VitePWA to strategies "injectManifest", srcDir "src", filename "sw.js", injectRegister null (the app registers it), devOptions { enabled: true, type: "module" }, keep the manifest but set name/short_name to "IOE Buddy", theme_color "#6A45E8", background_color "#D9F1FF". Include json and png in globPatterns so content works offline. Keep base "/ioe-buddy/".
3. src/sw.js: precacheAndRoute(self.__WB_MANIFEST), skipWaiting + clients.claim, and a fetch listener that sends same-origin "<scope>api/*" requests to src/sw/router.js. router.js matches method + path pattern, parses JSON body and query, returns JSON Responses, 404/500 as in the contract. Register all routes from the contract, each pointing at a handler module in src/sw/handlers/ (units.js, profile.js, flashcards.js, exams.js, credits.js, reset.js). Write these handlers as minimal working stubs that return valid contract-shaped data from a small in-memory fixture. Write src/sw/db.js as a stub module with the API get(store, key), put(store, key, value), getAll(store), clear(store) backed by a Map. Write src/sw/content.js as a stub with loadIndex() and loadUnit(id). The backend agent will replace these internals; keep exported names stable.
4. src/sw/exams/index.js: export a registry { "picture-pick": picturePick.generate, "letter-pop": ..., "match-up": ..., "fill-in": ... } importing each file. Create each of the 4 generator files as a stub that returns [] .
5. src/api/client.js: one exported async function per route (getUnits, getUnit, getProfile, updateProfile, getWordOfTheDay, getFlashcards, rateCard, getExam, postExamResult, getCredits, resetProgress) + waitForBackend() that registers "sw.js" (import.meta.env.DEV: use the dev SW URL that vite-plugin-pwa serves, with { type: "module" }), and resolves when navigator.serviceWorker.controller exists (listen for controllerchange). src/lib/useApi.js: a tiny hook { data, error, loading, reload } around a client call.
6. src/main.jsx: import fonts, call waitForBackend() before render or show a friendly loading screen in the design style while it waits.
7. src/index.css: CSS custom properties for the design tokens (ink #1D2B53, sky #D9F1FF, sun #FFCE3A, coral #FF7A6B, salmon #FF9C8F, leaf #7ED957, mint bg #DDF7CF, lilac #B7A6FF, grape #6A45E8, peach bg #FFE3DE, success #2F9E44, error #E03131, ...) read from docs/design. Global focus-visible outline 4px #6A45E8. Page shell centered, max-width 440px, min-height 100dvh.
8. src/components: build the shared pieces exactly as the design draws them (read docs/design/Practice.dc.html, ExamLetterPop.dc.html, ExamPicture.dc.html, Pic.dc.html, Home.dc.html): AppHeader (back link + title + StarPill), BackButton, StarPill (reads stars prop), ProgressSegments (10 segments, done/current/todo colors), ChunkyButton (variants per design, disabled look), WordPicture (shows the word's image in a rounded framed tile; if image is null, shows a big colored letter tile like Pic.dc.html), ListenButton (purple round speaker), FeedbackBar (role=status), ResultCard ("You did it!" + star row + Play again + More games, as in the design's done state), Mascot (the smiling star SVG). src/lib/speak.js per the design's speak().
9. src/App.jsx: HashRouter routes "/" Home, "/cards" FlashCards, "/practice" Practice, "/practice/picture-pick" PicturePick, "/practice/letter-pop" LetterPop, "/practice/match-up" MatchUp, "/practice/fill-in" FillIn, "/credits" Credits. Create each screen as a placeholder component that renders AppHeader + its title.
10. Write a Vitest test for src/sw/router.js (route match, 404, JSON body). Configure vitest (jsdom for .jsx tests, node for src/sw).
Checks: npm run lint, npm test, and vite build with the content step skipped (run "npx vite build"; if it fails only because public/content is missing, create an empty fixture in the vitest/ build path rather than writing public/content). Report results.`

const CONTENT = `${CONTEXT}
TASK: Write the content pipeline scripts/build-content.mjs (Node built-ins only, no npm deps) and its test.
You OWN: scripts/**, content/ (read only — never edit content/clean or content/raw).
It reads content/clean/unit-01.md ... unit-16.md, content/clean/glossary.md, content/clean/book-map.md, and every images/**/manifest.json, and writes public/content/index.json, public/content/units/unit-XX.json, and copies the used images to public/content/images/<folder>/<file>. It deletes public/content/ first so the output is always fresh. Shapes: see the contract above.
Rules:
- One unit file per unit 1-16. title from the "# Unit N: Title" line. phonics from "- Phonics:". patterns: split "- Sentence patterns:" on " / ".
- Words of a unit = the "- Vocabulary:" words, plus glossary entries with the same unit number that are not already there (match singular/plural and simple forms: banana/bananas, clock/clocks, lock/locks, mop/mops, pot/pots, lemon/lemons, nut/nuts, run/running, wash/washing). Keep the book's vocabulary spelling as "word". Skip proper names. id = kebab-case of word.
- ipa and vi from the glossary (match the same way); null when missing.
- image: find a file whose name matches the word or its other form (teddy bear -> teddy-bear.png, run -> running.png, wash -> washing.png) in images/unit-XX/ first, then in any images/** folder (another agent adds missing pictures under images/web/ with a manifest.json that has word, file, source, author, license). null when none.
- sentence: a short, kid-level example sentence for the word built ONLY from that unit's sentence patterns with the word substituted where it fits (e.g. "I have a car.", "This is my bag.", "That's a monkey.", "Look at the lemons."). If no pattern fits the word, use "This is a <word>." / "These are <word>." for plurals. Never use text that is not in the book patterns or these two fallbacks.
- credits: one entry per copied image from images/web (third-party images). Book images are not listed.
- Print a short report: units, words, words without image (list them).
Write scripts/build-content.test.mjs runnable with "node --test scripts/" that checks: 16 unit files, unit-01 has ball/bike/book with images, every word has id/word/letter, banana and bananas are not both in unit 13.
Checks: node scripts/build-content.mjs, node --test scripts/. Report the words-without-image list in "issues".`

const IMAGES = `${CONTEXT}
TASK: Find pictures for every glossary/vocabulary word that has no picture in images/.
You OWN: images/web/** only. Never edit images/unit-XX/.
1. Read content/clean/glossary.md and the "- Vocabulary:" line of content/clean/unit-*.md. List every word. A word has a picture if images/unit-XX/ (any unit) has a file for it or its plural/-ing form (clocks covers clock, running covers run, washing covers wash, teddy-bear covers teddy bear). Expected missing: one, two, three, four, five, fish and chips — confirm by checking, and include any others you find.
2. For each missing word, get a free picture from the internet. Use only openly licensed sources: OpenMoji (CC BY-SA 4.0) via https://cdn.jsdelivr.net/npm/openmoji@15.1.0/ or Twemoji (CC-BY 4.0) via https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/ or Wikimedia Commons public-domain/CC files. Prefer one style for all (OpenMoji color PNG 618x618, or render its SVG to PNG if only SVG exists — use macOS "sips" or "qlmanage", no new npm deps). Pick pictures a 6-year-old recognises: digits 1-5 as keycap or big friendly numbers; "fish and chips" as a fish-and-chips plate or the fish + fries emoji combined.
3. Download each file into a new empty scratch folder first, open it with the Read tool to check that it really shows the word, then copy it to images/web/<kebab-word>.png (about 300-600px square, transparent or white background).
4. Write images/web/manifest.json: [{ "word", "file", "source" (exact URL), "author", "license", "note" }].
Checks: every missing word has a file, every file opens as a PNG, manifest is valid JSON. Report the final list.`

const BACKEND = `${CONTEXT}
TASK: Implement the real service-worker backend behind the stubs the skeleton wrote.
You OWN: src/sw/router.js, src/sw/db.js, src/sw/content.js, src/sw/handlers/**, src/sw/srs.js (new), and tests under src/sw/ (except src/sw/exams/*). Do NOT edit src/sw/exams/*, src/sw.js plumbing (only if a real bug blocks you, then report it), src/api/**, src/components/**, src/screens/**.
1. db.js: real IndexedDB (database "ioe-buddy", stores: profile, cards, results) with the same exported API. No new deps; fake-indexeddb is already installed for tests.
2. content.js: fetch "content/index.json" and unit files relative to the SW scope, cache them in memory; allWords() helper.
3. handlers: implement every route in the contract. profile defaults. word-of-the-day: stable for a calendar day (hash of yyyy-mm-dd over all words). flashcards: Leitner style in src/sw/srs.js — hard => due now, medium => due in 1 day, easy => box up, due in 1/3/7/14 days; order: hard first, then due, then new, then the rest. exams: look up the registry in src/sw/exams/index.js, pass { words: unit words (or all words when unitId is "all"), allWords, count: 10 }. results: add correct to stars, store a result row with type/unit/correct/total/time. reset: clear cards, results, set stars 0.
4. Validate inputs (bad rating, unknown unit, unknown exam type -> 400/404 with { error }).
5. Tests with Vitest + fake-indexeddb + a mocked fetch for content: profile defaults and update, rate + deck order, word-of-the-day stable, exam route calls registry, results add stars, reset.
Checks: npm test, npm run lint.`

const HOME = `${CONTEXT}
TASK: Build the Home, Practice and Credits screens, the user menu and the unit picker.
You OWN: src/screens/Home.jsx, src/screens/Practice.jsx, src/screens/Credits.jsx (+ their .css), src/components/UserMenu.jsx, src/components/UnitPicker.jsx (+ .css), and their tests.
Design: docs/design/Home.dc.html, HomeMenuOpen.dc.html, UserMenu.dc.html, Practice.dc.html.
- Home: user menu at top-left with greeting by time of day ("Good morning!" / "Good afternoon!" / "Good evening!") and "Hi, <name>!"; StarPill with profile stars; title "Let's learn English!"; the two big cards Flash Cards (-> #/cards) and Practice (-> #/practice); Word of the day card from api/word-of-the-day with its WordPicture and a listen button.
- No login in the MVP, so the user menu (same look as UserMenu.dc.html) holds: the child's name (editable inline, saved with PUT api/profile), "Credits" (-> #/credits), and "Reset progress" (asks for confirmation in the same kid style, then POST api/reset). No "Sign out". Closes on outside tap and on Escape.
- Unit picker: a chunky pill under the title showing the current unit ("Unit 1 · In the school playground"), opening a list of all 16 units plus "All units"; saves unitId with PUT api/profile. Flash cards and games use that unit. Style it with the design tokens so it looks native to the design.
- Practice: exactly as Practice.dc.html, links to the 4 games, star pill.
- Credits: list api/credits entries (word, picture, author, license, link) plus "Pictures from the Tieng Anh 1 Global Success book" for book images.
Use the shared components from src/components and src/api/client.js. If a shared component is missing something, wrap it inside your files; do not edit it, and report it.
Tests: a render test for Home with a mocked client. Checks: npm test, npm run lint.`

const FLASHCARDS = `${CONTEXT}
TASK: Build the Flash Cards screen.
You OWN: src/screens/FlashCards.jsx (+ .css) and its test.
Design: docs/design/FlashCard.dc.html and FlashCardBack.dc.html (read the whole file, including the DCLogic class: card flip with 3D turn, deal animation between cards, counter "3 / 6", dots, prev/next, listen, rate buttons Easy/Medium/Hard on the back, finished summary with counts, "Practice tricky words (n)" and restart).
Data: GET api/flashcards (unit from profile); front = WordPicture of the word on the card color, back = word, letter, sentence, listen button. Rating calls POST api/flashcards/:id/rate. Card background colors rotate through the design's palette. Words without image show the WordPicture letter fallback.
Use shared components; do not edit them (report gaps). Tests: render with mocked client, flip, rate advances the card. Checks: npm test, npm run lint.`

const GAMES_A = `${CONTEXT}
TASK: Build two games end to end: Picture Pick and Match Up (generator in the service worker + screen).
You OWN: src/sw/exams/picturePick.js, src/sw/exams/matchUp.js (+ tests), src/screens/PicturePick.jsx, src/screens/MatchUp.jsx (+ .css, tests).
Design: docs/design/ExamPicture.dc.html and ExamMatch.dc.html (read the whole files, DCLogic included: question flow, wrong/right states, feedback text, stars only for first-try correct, Next/Finish, done screen, Play again = fetch a NEW exam).
Generators: generate({ words, allWords, count }) returns count questions; new random set each call; never the same word twice in a row; distractors from the unit first, then allWords, never duplicated; prefer words with images for picture choices. You define each question's JSON shape; keep it plain data.
Screens: GET api/exams/<type>, play, then POST api/exams/<type>/results { correct, total } and show ResultCard with the stars. Use shared components; do not edit them (report gaps).
Checks: npm test, npm run lint.`

const GAMES_B = `${CONTEXT}
TASK: Build two games end to end: Letter Pop and Fill In (generator in the service worker + screen).
You OWN: src/sw/exams/letterPop.js, src/sw/exams/fillIn.js (+ tests), src/screens/LetterPop.jsx, src/screens/FillIn.jsx (+ .css, tests).
Design: docs/design/ExamLetterPop.dc.html and ExamFill.dc.html (read the whole files, DCLogic included).
Generators: generate({ words, allWords, count }) returns count questions; new random set each call; never the same word twice in a row. Letter Pop: one extra letter at a random spot that is not equal to its neighbours (see the design's fresh()). Fill In: follow the design's logic for which letters are hidden and which letter tiles are offered. Multi-word entries (teddy bear, fish and chips): handle spaces cleanly (show the space as a gap, never as a tile) or skip them for these two games. You define each question's JSON shape; keep it plain data.
Screens: GET api/exams/<type>, play, then POST api/exams/<type>/results { correct, total } and show ResultCard with the stars. Use shared components; do not edit them (report gaps).
Checks: npm test, npm run lint.`

const VERIFY = (reports) => `${CONTEXT}
TASK: Integrate and verify the whole MVP. You may now edit any file to fix problems.
Agent reports from the earlier steps:
${reports}
1. Run: npm run content, npm test, npm run lint, npm run build. Fix every failure at its root cause.
2. Fix every reported issue and shared-component gap that blocks a feature. Make sure no screen is still a placeholder.
3. Check the built service worker: dist/sw.js exists, precaches index.html, json and png content, and answers api/ routes. Run "npx vite preview --port 4173 --strictPort" in the background, then with curl check that index.html, content/index.json and an image load under /ioe-buddy/. Stop the preview server after.
4. Search the src/ and scripts/ trees for code comments added in this build and remove them (keep eslint-disable and similar directives).
5. Update README.md: short sections for the architecture (service-worker backend, IndexedDB, content build, images/web credits) and the commands.
Report what you fixed and the final output of each check.`

const reportOf = (name, r) => r
  ? `## ${name}: ${r.status}\n${r.summary}\nChecks: ${r.checks}\nIssues: ${r.issues.join(' | ') || 'none'}`
  : `## ${name}: agent failed or was skipped`

phase('Foundation')
const supporting = parallel([
  () => agent(CONTENT, { label: 'content-pipeline', phase: 'Foundation', schema: RESULT }),
  () => agent(IMAGES, { label: 'missing-images', phase: 'Foundation', schema: RESULT }),
])
const skeleton = await agent(SKELETON, { label: 'skeleton', phase: 'Foundation', schema: RESULT })
if (!skeleton || skeleton.status === 'blocked') {
  const [content, images] = await supporting
  return { stoppedAt: 'skeleton', skeleton, content, images }
}
log(`Skeleton ${skeleton.status}: ${skeleton.summary.slice(0, 160)}`)

phase('Features')
const FEATURES = [
  ['backend', BACKEND],
  ['home-practice-credits', HOME],
  ['flash-cards', FLASHCARDS],
  ['games-picture-match', GAMES_A],
  ['games-letter-fill', GAMES_B],
]
const features = await parallel(FEATURES.map(([label, prompt]) => () =>
  agent(prompt, { label, phase: 'Features', schema: RESULT })))
const [content, images] = await supporting

const reports = [
  reportOf('skeleton', skeleton),
  reportOf('content-pipeline', content),
  reportOf('missing-images', images),
  ...FEATURES.map(([label], i) => reportOf(label, features[i])),
].join('\n\n')

phase('Verify')
const verify = await agent(VERIFY(reports), { label: 'integrate-verify', phase: 'Verify', schema: RESULT })

return {
  skeleton, content, images,
  features: Object.fromEntries(FEATURES.map(([label], i) => [label, features[i]])),
  verify,
}
