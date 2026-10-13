# IOE Buddy

English flash cards and exercises for kids. Client-only React PWA, hosted on GitHub Pages.

See [docs/INTENTION.md](docs/INTENTION.md).

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run deploy
```

`npm run deploy` builds the app and pushes `dist/` to the `gh-pages` branch.

## First publish

1. Create the GitHub repo `ioe-buddy` and add it as `origin`.
2. Run `npm run deploy`.
3. In the repo settings, open Pages and set the source to the `gh-pages` branch, folder `/`.

The app runs at `https://<user>.github.io/ioe-buddy/`. If the repo name changes, change `base` in `vite.config.js`.
