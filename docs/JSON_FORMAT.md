# Movie file format

Each movie is one JSON file in `movies/`. The file holds only what TMDB does
not know: where the cuts are. Title, poster, overview and cast come from TMDB
through the `tmdbId`.

## Complete example

An example that uses every field:

```json
{
  "tmdbId": 2059,
  "edition": "Theatrical",
  "runtime": "02:01:40",
  "episodes": [
    {
      "title": { "es": "La Charlotte", "en": "La Charlotte" },
      "timestamp": "00:51:40",
      "cue": {
        "es": "Termina justo después de la escena de la furgoneta.",
        "en": "Ends right after the van scene."
      }
    },
    {
      "title": { "es": "Pass and Stow", "en": "Pass and Stow" },
      "timestamp": "01:26:00"
    },
    {
      "title": { "es": "Heere at the Wall", "en": "Heere at the Wall" },
      "timestamp": "END"
    }
  ]
}
```

## File name

`<readable-name>-<year>.json`, lowercase with hyphens. The name without the
extension is the address of the movie page: `/movie/national-treasure-2004`.

Two editions of the same movie are two files with the same `tmdbId` and a
different `edition`, for example `the-fellowship-of-the-ring-2001.json` and
`the-fellowship-of-the-ring-2001-extended.json`.

## Movie fields

| Field | Required | Description |
| --- | --- | --- |
| `tmdbId` | Yes | The movie ID on TMDB. It is the number in the movie's URL on themoviedb.org. |
| `edition` | No | Name of the edition the cuts refer to, such as `"Theatrical"`, `"Extended"` or `"Director's Cut"`. Not translated. |
| `runtime` | No | Total duration of the copy used to mark the cuts, as `"HH:MM:SS"`, exactly as the player shows it. Credits included. |
| `episodes` | Yes | The list of parts, in order. At least one. |

`runtime` does two jobs. It lets anyone check in seconds whether their copy
matches the one the cuts were marked on. It also gives the exact length of the
last part. Without it, the app falls back to the TMDB runtime, which is in
whole minutes and refers to the standard release, and marks the last part as
approximate with a `~`.

## Episode fields

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Title of the part, as `{ "es": "...", "en": "..." }`. Both languages required. Keep it spoiler-free: it is always visible. |
| `timestamp` | Yes | Where the part **ends**, as `"HH:MM:SS"`. The last episode uses the string `"END"`. |
| `cue` | No | A sentence describing the last shot or line before the cut, as `{ "es": "...", "en": "..." }`. If present, both languages are required. |

There is no start time. Every part starts exactly where the previous one ends,
and the first one starts at `00:00:00`. This makes gaps and overlaps
impossible.

Cues are hidden in the app until the viewer asks for them, because they
describe how the part ends. That means a cue can be as detailed as it needs to
be. Cues matter most when copies differ: a logo at the start or a different
edition shifts every timestamp, and the cue is what still pins the cut down.

The interface calls each part "Night N" in English and "Parte N" in Spanish.

## Validation rules

`npm run validate` checks every file and reports problems by file and episode.
It also runs before every build. The app applies the same rules and flags
invalid files in the catalogue.

- The file contains a JSON object.
- `tmdbId` is present. Its type is not checked.
- `edition`, when present, is a non-empty string.
- `runtime`, when present, uses `HH:MM:SS`.
- `episodes` is a list with at least one episode. There is no upper or lower
  limit beyond that, so a single-episode movie is valid.
- Every `title` has non-empty `es` and `en`.
- Every `cue`, when present, has non-empty `es` and `en`.
- Every `timestamp` is `HH:MM:SS` or `"END"`. Two digits for hours, minutes
  and seconds below 60: `"00:52:40"`, not `"52:40"`.
- Timestamps are strictly increasing, and the first is later than `00:00:00`.
- The last episode uses `"END"`, and only the last one.
- `runtime`, when present, is later than the last cut.
- Two files with the same `tmdbId` must have different `edition` values. A
  missing `edition` counts as a value, so only one of them may omit it.
