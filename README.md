# Three Nights

A cut guide for watching movies as a miniseries. Each movie is split into a few
"nights", with the exact timestamp where to stop and an optional cue describing
the last shot before the cut. It usually takes about three nights per movie,
hence the name.

Three Nights does not play video. You watch the movie wherever you have it and
keep the guide open to know when to pause.

- No backend. The cuts live in JSON files in [`movies/`](movies).
- Posters, overviews and cast come live from [TMDB](https://www.themoviedb.org/).
- Spanish and English, with a switch in the top right corner.

## Getting started

You need Node 23.6 or newer (the validator runs TypeScript directly with Node).

```bash
npm install
```

Create your `.env` from the example:

```bash
cp .env.example .env
```

Open `.env` and paste your TMDB **API Read Access Token** as the value of
`VITE_TMDB_READ_TOKEN`. You find it at themoviedb.org under
Settings > API. Use the long read access token, not the short API key. The
`.env` file is gitignored and must never be committed.

Start the app:

```bash
npm run dev
```

Then open http://localhost:5173. Restart the dev server after changing `.env`.

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

The dev server picks the new file up on its own. A file with errors shows up in
the catalogue flagged as invalid, and its page lists what is wrong.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app locally. |
| `npm run validate` | Checks every file in `movies/` against the format rules. |
| `npm test` | Runs the unit tests for time maths, validation and sorting. |
| `npm run build` | Validates, type-checks and builds the static site into `dist/`. |

## Project layout

```
movies/            One JSON file per movie. This is the content.
scripts/           The command-line validator.
src/lib/           Format types, time maths, validation, TMDB client.
src/i18n/          Interface strings and the language context.
src/components/    Shared interface pieces.
src/pages/         The two screens: catalogue and movie.
docs/              Format reference and roadmap.
```

What is planned for later versions is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
