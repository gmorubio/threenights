# Three Nights

A cut guide for watching movies as a miniseries. Each movie is split into a few
"nights", with the exact timestamp where to stop and an optional cue describing
the last shot before the cut. It usually takes about three nights per movie,
hence the name.

Three Nights does not play video. You watch the movie wherever you have it and
keep the guide open to know when to pause.

- No backend. The cuts live in JSON files in [`movies/`](movies).
- Posters, overviews and cast come from [TMDB](https://www.themoviedb.org/),
  fetched when the site is built and never from the browser.
- Spanish and English, with a switch in the top right corner.

## Getting started

You need Node 23.6 or newer (the scripts run TypeScript directly with Node).

```bash
npm install
```

Create your `.env` from the example:

```bash
cp .env.example .env
```

Open `.env` and paste your TMDB **API Read Access Token** as the value of
`TMDB_READ_TOKEN`. You find it at themoviedb.org under Settings > API. Use the
long read access token, not the short API key. The `.env` file is gitignored
and must never be committed.

Start the app:

```bash
npm run dev
```

Then open http://localhost:5173. Starting the app first downloads the TMDB data
for every movie into `src/data/tmdb.json`, which is gitignored. Offline, it
warns and carries on with the data from the last time.

## Adding a movie

1. Find the movie on themoviedb.org. The number in the URL is its ID:
   `themoviedb.org/movie/2059-national-treasure` has ID `2059`.
2. Create `movies/<readable-name>-<year>.json`. The file name becomes the URL
   of the movie page, so keep it lowercase with hyphens.
3. Fill it in following [docs/JSON_FORMAT.md](docs/JSON_FORMAT.md).
4. Check it:

   ```bash
   npm run validate
   ```

5. Download its TMDB data:

   ```bash
   npm run sync
   ```

The dev server picks both up on its own. A file with errors shows up in the
catalogue flagged as invalid, and its page lists what is wrong.

## Where the TMDB token goes

Nowhere near the browser. A static site cannot keep a secret: anything the
JavaScript can read, a visitor can read too. So the app never calls TMDB.
`npm run sync` does, on the machine that builds the site, and writes the
result to `src/data/tmdb.json`. The app only reads that file. Posters load
straight from TMDB's image server, which needs no token.

Three things keep it that way:

- The variable is called `TMDB_READ_TOKEN`, without the `VITE_` prefix. Vite
  can only put `VITE_` variables into the bundle.
- No file in `src/` reads the token. Only the two scripts in `scripts/` do.
- `npm run check-dist` runs after every build and before every deploy, and
  fails if the token appears in any file of `dist/`.

## Publishing on GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
publishes the site on every push to `main`. To set it up on your repository:

1. Under Settings > Secrets and variables > Actions, create a repository
   secret called `TMDB_READ_TOKEN` with your token.
2. Under Settings > Pages, set the source to **GitHub Actions**.
3. Push to `main`, or run the workflow by hand from the Actions tab. A manual
   run is also how you refresh ratings and overviews without a new commit.

GitHub does not hand secrets to workflows triggered from forks, and masks them
in the logs. The workflow sets the `/<repo-name>/` base path on its own and
copies `index.html` to `404.html` so that reloading a movie page works.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Syncs the TMDB data and starts the app locally. |
| `npm run sync` | Downloads the TMDB data of every movie in `movies/`. |
| `npm run validate` | Checks every file in `movies/` against the format rules. |
| `npm test` | Runs the unit tests for time maths, validation and sorting. |
| `npm run build` | Validates, type-checks, syncs, builds the static site into `dist/` and checks it. |
| `npm run check-dist` | Fails if the TMDB token appears anywhere in `dist/`. |

## Project layout

```
movies/            One JSON file per movie. This is the content.
scripts/           Validator, TMDB sync and the check of the built site.
src/lib/           Format types, time maths, validation, TMDB data access.
src/data/          TMDB data written by `npm run sync`. Gitignored.
src/i18n/          Interface strings and the language context.
src/components/    Shared interface pieces.
src/pages/         The two screens: catalogue and movie.
docs/              Format reference and roadmap.
```

What is planned for later versions is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
