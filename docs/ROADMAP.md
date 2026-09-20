# Roadmap

Version 1 is deliberately small: a catalogue, a movie page and the cuts. These
ideas were considered and postponed. None of them is rejected.

## Movie page

- **Where to watch.** Streaming providers from TMDB. It depends on the country,
  changes monthly and needs a separate API call.
- **Trailer.** Embedded player on the movie page.
- **Recommended and similar movies.** Only useful if limited to movies that
  have a file in `movies/`.
- **Cast photos.**
- **Budget, revenue and reviews.**

## Catalogue

- **Search and filters.** Worth adding once the grid no longer fits on a
  screen or two.
- **Sort by date added.** Needs a new `addedAt` field in the movie file,
  because file dates on disk are not reliable.

## Watching

- **Mark parts as watched.** Stored in the browser, with progress on each
  poster and the next part highlighted. Limited to one browser per device
  unless a backend appears.

## Movie file format

- **Synopsis per part.** Extra writing and a spoiler risk.
- **Screenshot of the cut point.** Requires managing image files.
- **Credits start time.** An optional field so the last part can show its
  length without the credits.
- **Separate resume point.** An optional start time per part, for resuming a
  few seconds earlier than the cut. Addable without breaking existing files.
- **A tool to author cuts.** Nothing planned yet.

## Publishing on GitHub Pages

The app is fully static once built, so it can be hosted on GitHub Pages. Four
things need attention first:

- **The TMDB token.** With live calls from the browser, the token ships inside
  the published JavaScript where anyone can read it. Before publishing, replace
  the live calls with a sync script that fetches TMDB data at build time and
  writes it to JSON, so the token stays on the build machine.
- **Base path.** A project site lives under `/<repo-name>/`, so Vite needs its
  `base` option set.
- **Deep links.** GitHub Pages returns 404 when a movie page is reloaded,
  because it does not know the path belongs to the app. Either switch to hash
  routing or use the `404.html` redirect trick.
- **Plan.** Publishing Pages from a private repository requires a paid GitHub
  plan, and the published site is public either way.
