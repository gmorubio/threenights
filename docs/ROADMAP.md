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
