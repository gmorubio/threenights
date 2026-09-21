# Three Nights

A cut guide for watching movies as a miniseries. Each movie is split into a few
"nights", with the exact timestamp where to stop and an optional spoiler-free
cue describing the last shot before the cut. It usually takes about three
nights per movie, hence the name.

Three Nights does not play video. You watch the movie wherever you have it and
keep the guide open to know when to pause.

- A static site with no backend. The cuts live in JSON files in
  [`movies/`](movies), one per movie.
- Posters, overviews and cast come from [TMDB](https://www.themoviedb.org/).
- Spanish and English, with a switch in the top right corner.

This repository is my own catalogue. It is open so that you can copy it and
build yours.

## Make your own copy

You need [Node](https://nodejs.org/) 23.6 or newer and a free TMDB account.

1. **Fork** this repository on GitHub, or clone it:

   ```bash
   git clone https://github.com/gmorubio/threenights.git
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Get your TMDB token. On themoviedb.org go to Settings > API and copy the
   **API Read Access Token**. It is the long one, not the short API key.

4. Create your `.env` and paste the token as the value of `TMDB_READ_TOKEN`:

   ```bash
   cp .env.example .env
   ```

   The `.env` file is gitignored. Never commit it.

5. Start the app and open http://localhost:5173:

   ```bash
   npm run dev
   ```

The movies you see are mine. Delete the files in `movies/` and add your own.

## Add a movie

### With Claude Code, from a subtitle file

The repository includes a [Claude Code](https://claude.com/claude-code) skill,
[`slice-movie`](.claude/skills/slice-movie/SKILL.md), that reads the subtitles
of a movie and finds the best places to stop: always on a scene change,
preferably on a cliffhanger, with nights of 30 to 60 minutes when the story
allows it.

1. Get the subtitles of your copy of the movie as a `.srt` or `.vtt` file.
   They must match your copy, or every timestamp will be off.
2. Open this folder in Claude Code. The skill is picked up on its own.
3. Attach the file or give its path, and ask for the cuts:

   ```
   /slice-movie ~/Downloads/Heat.1995.1080p.BluRay.srt
   ```

4. Claude proposes the nights, with titles, timestamps, cues and how confident
   it is in each cut. Ask for changes ("try 4 parts", "another title for
   night 2") or answer **ok**.
5. After your ok it writes `movies/<name>-<year>.json`, validates it, downloads
   the TMDB data and commits that one file. It never pushes.

It is built for movies you have not seen yet: everything it says is
spoiler-free, and it explains a cut with plot only if you ask for it. The
subtitle file is never copied into the repository. The skill is written in
Spanish, but it answers in the language you use.

### By hand

1. Find the movie on themoviedb.org. The number in the URL is its ID:
   `themoviedb.org/movie/2059-national-treasure` has ID `2059`.
2. Create `movies/<readable-name>-<year>.json` following
   [docs/JSON_FORMAT.md](docs/JSON_FORMAT.md). The file name becomes the URL of
   the movie page.
3. Check it and download its TMDB data:

   ```bash
   npm run validate
   npm run sync
   ```

## Publish your copy on GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
publishes the site on every push to `main`. It is free for public
repositories. On your fork:

1. Under Settings > Secrets and variables > Actions, create a repository
   secret called `TMDB_READ_TOKEN` with your token.
2. Under Settings > Pages, set the source to **GitHub Actions**.
3. In the Actions tab, enable workflows. GitHub disables them on new forks.
4. Push to `main`, or run the workflow by hand. A manual run also refreshes
   ratings and overviews without a new commit.

Your site will be at `https://<your-user>.github.io/<repo-name>/`.

### Your token stays private

A static site cannot keep a secret: anything its JavaScript can read, a visitor
can read too. So the site never calls TMDB. `npm run sync` does, on the machine
that builds it, and the site only reads the result. Posters load from TMDB's
image server, which needs no token.

- The variable has no `VITE_` prefix, so Vite cannot put it into the bundle.
- No file in `src/` reads the token. Only the scripts in `scripts/` do.
- `npm run check-dist` runs after every build and before every deploy, and
  fails if the token appears in any published file.
- GitHub masks secrets in the logs and does not hand them to workflows
  triggered from forks.

## More

- [docs/JSON_FORMAT.md](docs/JSON_FORMAT.md): the movie file format and the
  rule for spoiler-free cues.
- [docs/ROADMAP.md](docs/ROADMAP.md): ideas postponed to later versions.
- `npm test` runs the unit tests. `npm run build` validates, type-checks,
  syncs and builds the site into `dist/`.

## License and attribution

The code is under the [MIT License](LICENSE).

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie
data and images belong to TMDB and their owners. If you publish your own copy,
keep the TMDB attribution in the footer.
