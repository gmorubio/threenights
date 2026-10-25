---
spec: specs/watched-parts.md
status: in-progress         # proposed | approved | in-progress | done | blocked
branch: feature/watched-parts
baseRef: 09a7888d9582990385a564720546acbaa34f7390
---

# Plan de implementación — Marcar partes como vistas

## Phases
<!-- /implement ticks these as it goes; it resumes from the first unticked one. -->
- [x] baseline
- [x] tdd
- [x] unit-suite
- [x] ui-tests
- [ ] full-suite
- [ ] review
- [ ] preexisting-decision

## Tasks
<!-- One task = one red/green/refactor cycle. Ordered so each task builds on the previous ones. -->

Orden: primero toda la lógica pura de `src/lib/watched.ts` (T1-T3, `Level: unit`, un único fichero de pruebas `src/lib/watched.test.ts` que crece en cada tarea); después el cableado y la UI (T4-T7, `Level: ui`, un fichero de Playwright por tarea). Cada tarea deja `npm run typecheck` en verde: si cambia la firma de un componente, sus llamadas se actualizan en la misma tarea.

Comandos: `npx vitest run src/lib/watched.test.ts` para T1-T3; `npx playwright test e2e/<fichero>.spec.ts` para T4-T7.

- [x] **T1** — `parseWatched` tolerante y `serializeWatched` con ida y vuelta — ACs: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
  - Level: unit
  - Files: `src/lib/watched.ts` (nuevo), `src/lib/watched.test.ts` (nuevo)
  - Test: `src/lib/watched.test.ts` — (AC-1) `parseWatched(null)` devuelve `{}`; (AC-2) un texto no JSON (`'{nope'`) devuelve `{}` y `expect(() => …).not.toThrow()`; (AC-3) los JSON válidos que no son objeto (`'3'`, `'"x"'`, `'null'`, `'[0,1]'`) devuelven `{}`; (AC-4) `{"a":[0],"b":"x","c":{"0":1}}` → `{ a: [0] }`; (AC-5) `{"a":[1.5,"1",-1,9007199254740992,null,0,3]}` → `{ a: [0, 3] }`; (AC-6) `{"a":[2,0,2]}` → `{ a: [0, 2] }`; (AC-7) `{"a":[],"b":["x",-1],"c":[1]}` → `{ c: [1] }`; (AC-8) con `'{"__proto__":[0],"a":[1]}'`, `Object.getPrototypeOf(result)` es `Object.prototype` o `null`, y `Object.prototype` no gana propiedades (comparar `Object.getOwnPropertyNames(Object.prototype)` antes y después, y `({} as any)[0]` sigue `undefined`); (AC-9) `serializeWatched({ 'hercules-1997': [0, 2] })` es exactamente `'{"hercules-1997":[0,2]}'`, y `parseWatched(serializeWatched(state))` es `toEqual(state)` para un progreso con varias películas.
  - Notes: crear el módulo con `WATCHED_KEY = 'threenights.watched'`, el tipo `WatchedState` (con su comentario de invariantes del §5), `parseWatched` y `serializeWatched`. Sin acceso a `window` en todo el módulo. `JSON.parse` dentro de `try`. Comprobación de objeto con la misma idea que `isObject` de `src/lib/validate.ts` (no es exportada: duplicarla localmente o exportarla, a criterio del implementador, sin cambiar el comportamiento de `validate.ts`). Iterar con `Object.entries` sobre el objeto parseado (solo propias). Filtrar con `Number.isSafeInteger(x) && x >= 0`, quitar duplicados (`new Set`) y ordenar numéricamente (`(a, b) => a - b`, no el orden por defecto de `sort`). Construir el resultado con `Object.fromEntries`, nunca asignando claves a un `{}`. AC-8 no exige conservar ni descartar el slug `"__proto__"`; solo que no altere prototipos. `serializeWatched` es `JSON.stringify(state)`: los índices ya llegan ascendentes por el invariante de `WatchedState` (lo garantizan `parseWatched` y, desde T2, `toggleWatched`).

- [x] **T2** — `toggleWatched` inmutable — ACs: AC-10, AC-11, AC-12
  - Level: unit
  - Files: `src/lib/watched.ts`, `src/lib/watched.test.ts`
  - Test: `src/lib/watched.test.ts` — (AC-10) `{ a: [0, 3], b: [1] }` alternando `('a', 2)` da `{ a: [0, 2, 3], b: [1] }` (índice insertado en orden) y el estado de entrada no cambia; (AC-11) `{ a: [0, 2, 7] }` alternando `('a', 2)` da `{ a: [0, 7] }`; (AC-12) `{ a: [1], b: [0] }` alternando `('a', 1)` da `{ b: [0] }` y `Object.hasOwn(result, 'a')` es `false`. Añadir el caso de un slug sin entrada (`{}` alternando `('a', 0)` da `{ a: [0] }`).
  - Notes: lecturas por slug con `Object.hasOwn`. Construir el nuevo estado sin mutar el anterior (por ejemplo `Object.fromEntries` sobre las entradas filtradas más la nueva). Mantener el invariante: ascendente, sin duplicados, nunca vacío (si queda vacío se borra la clave). Sin poda de índices fuera de rango.

- [x] **T3** — `watchedParts` y `nextPart` — ACs: AC-13, AC-14, AC-15, AC-16, AC-17
  - Level: unit
  - Files: `src/lib/watched.ts`, `src/lib/watched.test.ts`
  - Test: `src/lib/watched.test.ts` — (AC-13) con `{ a: [0, 2, 3, 9] }`, `watchedParts(state, 'a', 3)` es `[0, 2]`; con un slug sin entrada devuelve `[]`; con un slug heredado de `Object.prototype` (`'toString'`) devuelve `[]`. (AC-14) `nextPart`: vistas `{1}` de 3 → `0`; vistas `{0, 2}` de 3 → `1`; (AC-15) sin entrada → `null`, y solo `[5, 8]` con 3 partes → `null`; (AC-16) `[0, 1, 2]` de 3 → `null` (y `[0, 1]` de 2 → `null`); (AC-17) `[0]` de 1 → `null`.
  - Notes: `Object.hasOwn` para leer el slug. `watchedParts` filtra `index < partCount`; el orden ascendente viene del invariante. `nextPart` se apoya en `watchedParts`: si su longitud es 0 o igual a `partCount`, `null`; si no, el primer índice de `0..partCount-1` que no está en el conjunto. Con T3 el módulo queda completo según el §5 del spec.

- [x] **T4** — Proveedor de progreso y botón «Vista» en la ficha, con resumen en el encabezado — ACs: AC-18, AC-23, AC-27
  - Level: ui
  - Files: `src/lib/WatchedContext.tsx` (nuevo), `src/main.tsx`, `src/pages/Movie.tsx`, `src/pages/Movie.css`, `src/components/EpisodeList.tsx`, `src/components/EpisodeList.css`, `src/i18n/strings.ts`, `e2e/support/movies.ts` (nuevo), `e2e/watched-movie-page.spec.ts` (nuevo)
  - Test: `e2e/watched-movie-page.spec.ts` — (AC-18) ciclo completo en una película válida de ≥2 partes: estado inicial sin pulsar y sin `.parts-watched`; marcar Parte 1 → `getByRole('button', { name: 'Vista, Parte 1', pressed: true })` con texto «✓ Vista», resto sin pulsar, encabezado «1 vista»; marcar Parte 2 → «2 vistas»; desmarcar Parte 2 → sin pulsar, texto «○ Vista», «1 vista»; recargar → Parte 1 pulsada y Parte 2 no; desmarcar Parte 1 → sin `.parts-watched`. (AC-23) con la Parte 1 marcada, pulsar «EN» en el selector de idioma → `getByRole('button', { name: 'Watched, Night 1', pressed: true })` con texto «✓ Watched» y encabezado «1 watched». (AC-27) sembrar `threenights.watched = '{nope'` con `page.evaluate` + `page.reload()`: sin `pageerror`, sin botones pulsados; tras marcar Parte 1, el valor guardado es JSON válido y su entrada del slug contiene `0`. Cada resultado con su propio `expect` con nombre (mensaje).
  - Notes:
    - `e2e/support/movies.ts`: helper compartido por T4-T7 y por las pruebas de UI. Lee `movies/*.json` con `JSON.parse` en `try/catch`, pasa el resultado a `validateAll` de `src/lib/validate.ts` (como `scripts/validate.ts`) y devuelve las películas con `data`. Exporta también utilidades pequeñas: buscar película por condición (número mínimo de partes, parte con `cue`), `seedWatched(page, raw)` (`page.evaluate` + `page.reload()`) y `readWatched(page)`. Si ninguna película cumple, el test hace `test.skip`. Nunca importar `src/lib/movies.ts` ni `src/lib/tmdb.ts`. No lleva sufijo `.spec.ts`, así que Playwright no lo ejecuta como prueba; `tsconfig.json` ya incluye `e2e`, de modo que el typecheck lo cubre.
    - `test.use({ locale: 'es-ES' })` por defecto en todos los ficheros nuevos. No comprobar textos de TMDB.
    - `WatchedContext.tsx` con el patrón de `src/i18n/LanguageContext.tsx`: lectura inicial perezosa en `useState` (`try { parseWatched(window.localStorage.getItem(WATCHED_KEY)) } catch { return {} }`, con el acceso a `window.localStorage` dentro del `try`); un `ref` con el último estado; `toggle(slug, index)` calcula desde el `ref` (no dentro del updater de `setState`, por StrictMode), actualiza `ref` y estado y escribe `serializeWatched` en `try/catch` silencioso; `useWatched()` lanza fuera del proveedor. **No** añadir aún el listener de `storage`: llega en T6 con su propia prueba roja.
    - `main.tsx`: `<LanguageProvider><WatchedProvider><App /></WatchedProvider></LanguageProvider>`.
    - `Movie.tsx`: `useWatched()` al principio, antes de los `return` tempranos. Para ficheros válidos, `watchedParts(watched, movie.slug, file.episodes.length)`; pasar a `EpisodeList` `watched` (como `ReadonlySet<number>`) y `onToggle` (`(i) => toggle(movie.slug, i)`). Añadir `<span className="muted parts-watched">{t.watchedCount(n)}</span>` en `.movie-section-head` solo si n > 0. `Movie.css`: separador «·» antes de `.parts-watched`, como `.card-meta`.
    - `EpisodeList.tsx`: props nuevas `watched` y `onToggle` (la prop `nextIndex` llega en T5). En `EpisodeItem`, dentro de `.episode-name` y bajo `.episode-meta`, `<button type="button" className="watched-toggle" aria-pressed={isWatched} aria-label={t.watchedToggleName(number)}>` con `<span aria-hidden="true">{isWatched ? '✓' : '○'}</span> {t.watchedLabel}`. El índice que se pasa a `onToggle` es `number - 1`. La pista de corte no cambia.
    - `EpisodeList.css`: `.watched-toggle` como pastilla con contorno (borde 1px `--line`, `border-radius: 999px`, `min-height: 44px`); `.watched-toggle[aria-pressed='true']` con fondo `--accent` y texto `#1a1305`. No poner `opacity` en ningún ancestro del botón.
    - `strings.ts`: `watchedLabel`, `watchedToggleName(n)`, `watchedCount(n)` en `Strings`, `es` y `en` (tabla del §4). `nextPart` y `watchedOf` se añaden en T5 y T7.

- [x] **T5** — Parte siguiente destacada y partes vistas atenuadas — ACs: AC-19, AC-20
  - Level: ui
  - Files: `src/pages/Movie.tsx`, `src/components/EpisodeList.tsx`, `src/components/EpisodeList.css`, `src/i18n/strings.ts`, `e2e/watched-next-part.spec.ts` (nuevo)
  - Test: `e2e/watched-next-part.spec.ts` — (AC-19) película de ≥2 partes: sin progreso, ningún `.episode-next-label`; marcar solo la última parte → la Parte 1 muestra «Siguiente» junto a «Parte 1» y ninguna otra lo muestra; la Parte 1 tiene `border-left-width` `3px` y `border-left-color` igual al color calculado de una sonda con `color: var(--accent)`, y el de las demás partes es distinto; marcar todas → ningún «Siguiente». (AC-20) sembrar la Parte 1 vista y la Parte 2 sin ver: opacidad efectiva (producto de `getComputedStyle(el).opacity` subiendo por los ancestros, calculado en `page.evaluate`) de `.episode-label`, `.episode-title` y `.episode-cut-time` < 1 en la Parte 1 y = 1 en la Parte 2; opacidad efectiva = 1 para `.watched-toggle`, `.episode-meta` y `.episode-cut-label` de la Parte 1.
  - Notes:
    - `Movie.tsx`: calcular `nextPart(watched, movie.slug, file.episodes.length)` y pasarlo como `nextIndex: number | null`.
    - `EpisodeItem`: recibe `isNext`; añade `episode-watched` / `episode-next` al `<li>`; pinta `<span className="episode-next-label">{t.nextPart}</span>` junto a `.episode-label`. Sin scroll automático ni apertura de pista.
    - `EpisodeList.css`: `opacity: 0.6` solo en `.episode-watched .episode-label`, `.episode-watched .episode-title` y `.episode-watched .episode-cut-time`; `.episode-next { border-left: 3px solid var(--accent); }`. Nada de `opacity` en `.episode`, `.episode-head`, `.episode-name` ni `.episode-cut`.
    - `strings.ts`: `nextPart` («Siguiente» / «Up next»).
    - El helper de opacidad efectiva y la sonda de color pueden vivir en `e2e/support/movies.ts` si U1-U3 los reutilizan.

- [x] **T6** — Sincronización entre pestañas con el evento `storage` — ACs: AC-26
  - Level: ui
  - Files: `src/lib/WatchedContext.tsx`, `e2e/watched-sync.spec.ts` (nuevo)
  - Test: `e2e/watched-sync.spec.ts` — dos páginas del mismo `context` (`context.newPage()`) con la ficha de la misma película de ≥2 partes; marcar Parte 1 en A → B muestra «Vista, Parte 1» pulsado sin recargar; marcar Parte 2 en B → A muestra «Vista, Parte 2» pulsado sin recargar; el valor de `threenights.watched` (leído con `page.evaluate`) contiene los índices 0 y 1 del slug.
  - Notes: `useEffect` con limpieza que escucha `storage` en `window`: si `event.key === WATCHED_KEY`, nuevo estado `parseWatched(event.newValue)`; si `event.key === null`, `{}`; otras claves se ignoran. Actualizar a la vez el `ref` y el estado, para que la marca de B parta de lo que escribió A (si no, la prueba pierde el índice 0, que es justo lo que pinza el último `expect`).

- [x] **T7** — Barra de progreso y texto accesible en el catálogo — ACs: AC-24, AC-25
  - Level: ui
  - Files: `src/components/Poster.tsx`, `src/components/Poster.css`, `src/components/WatchedBar.tsx` (nuevo), `src/components/WatchedBar.css` (nuevo), `src/components/MovieCard.tsx`, `src/components/MovieCard.css`, `src/styles/global.css`, `src/i18n/strings.ts`, `docs/ROADMAP.md`, `e2e/watched-catalogue.spec.ts` (nuevo)
  - Test: `e2e/watched-catalogue.spec.ts` — tarjetas localizadas por `a[href="/movie/<slug>"]`. (AC-24) película de ≥2 partes: sin progreso, la tarjeta no tiene `.watched-bar`; con solo el índice i visto (i = 1, por ejemplo), hay una `.watched-bar` con `aria-hidden="true"` y N `.watched-segment`, de los que solo el i tiene `data-filled="true"`; con todas vistas, los N tienen `data-filled="true"`. (AC-25) película de N partes con 1 vista: en español existe `getByRole('link', { name: /1 de N partes vistas/ })` («1 de 1 parte vista» si N = 1); tras pulsar «EN», el nombre contiene «1 of N nights watched» («1 of 1 night watched» si N = 1); el texto está en un `.visually-hidden` dentro del enlace.
  - Notes:
    - `Poster.tsx`: prop opcional `overlay?: ReactNode`; envolver siempre la variante (carga, vacío o imagen) en `<div className="poster-frame">` y pintar `overlay` como hermano de `.poster`, nunca como hijo (la animación `shimmer` anima `opacity` de `.poster-skeleton`). `Poster.css`: `.poster-frame { position: relative; }`. La ficha no pasa `overlay`; comprobar que `.movie-poster .poster` sigue aplicando.
    - `WatchedBar.tsx` / `.css`: `<div className="watched-bar" aria-hidden="true">` con `total` `<span className="watched-segment" data-filled="true|false">`; posición absoluta `left/right/bottom: 0` dentro de `.poster-frame`, esquinas inferiores con `var(--radius)` y `overflow: hidden`; relleno `--accent` o translúcido.
    - `MovieCard.tsx`: con `movie.data` y `watchedParts(...).length > 0`, pasa `<WatchedBar>` como `overlay` y añade `<span className="visually-hidden">{t.watchedOf(w, total)}</span>` dentro del `<Link>`. Sin `movie.data` no pinta nada de progreso.
    - `MovieCard.css`: el `transform` de hover/focus pasa de `.card .poster` a `.card .poster-frame` (con su `transition`); el `box-shadow` se queda en `.card .poster`.
    - `global.css`: utilidad `.visually-hidden` con la técnica de recorte (`position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;` …), nunca `display: none` ni `visibility: hidden`, para que entre en el nombre accesible del enlace.
    - `strings.ts`: `watchedOf(w, total)` con el plural según `total`, como `partCount`.
    - La prueba solo ve la variante de póster que se pinte en el entorno (imagen o recuadro vacío, según exista `src/data/tmdb.json`); que `overlay` salga en las tres ramas y fuera del elemento animado se verifica en la revisión.
    - Cierre de la funcionalidad (no comprobable con pruebas): quitar de `docs/ROADMAP.md` la entrada «Mark parts as watched» y la sección «Watching», que queda vacía. No tocar `docs/functional/` (lo hace `/dev-workflows:ship`). Verificar que `e2e/smoke.spec.ts` sigue en verde.

## UI tests
<!-- [ui] ACs not already pinned by a Level: ui task. Written after the TDD phase. -->
Estas AC describen comportamiento que ya queda implementado en T4-T7 (pista sin cambios, lectura tolerante, `try/catch` del almacenamiento), así que no tendrían una prueba roja propia: se escriben después de la fase TDD como pruebas de regresión. Usan `e2e/support/movies.ts`, `test.use({ locale: 'es-ES' })`, se omiten con `test.skip` si ninguna película cumple la condición y cada resultado lleva su propio `expect` con nombre.

- [x] **U1** — ACs: AC-21, AC-22 — `e2e/watched-cues.spec.ts`. (AC-21) elegir una película de ≥2 partes con alguna parte k con `cue`; sembrar como vistas todas las partes salvo k (así k es la parte siguiente y hay al menos una vista); al abrir la ficha, `window.scrollY` es 0 y el botón «Mostrar pista de corte» de la parte k tiene `aria-expanded="false"`. (AC-22) sembrar vista una parte con `cue`; al pulsar su «Mostrar pista de corte», `aria-expanded="true"` y `.cue-text` visible.
- [x] **U2** — ACs: AC-28 — `e2e/watched-out-of-range.spec.ts`. Sembrar para una película de N partes solo índices fuera de rango (`[N, N + 5]`); en la ficha no hay botones `.watched-toggle` pulsados, ni `.episode-next-label`, ni `.parts-watched`; en el catálogo su tarjeta no tiene `.watched-bar`.
- [x] **U3** — ACs: AC-29 — `e2e/watched-blocked-storage.spec.ts`. Abrir la ficha de una película de ≥2 partes con almacenamiento normal y contar los `.notice`; después `page.addInitScript` que redefine el getter de `window.localStorage` para que lance, recargar, escuchar `pageerror`; marcar la Parte 1 → queda pulsada y la Parte 2 muestra «Siguiente»; ningún `pageerror`; no hay más `.notice` que en la cuenta inicial; tras recargar (el init script se repite), no hay partes pulsadas.

## Deviations
<!-- Filled when implementation finds the spec impossible, contradictory or incomplete. -->
- Organizativa, sin cambio de comportamiento: el §5 y el §6 del spec agrupan todas las pruebas de UI en `e2e/watched-parts.spec.ts`. Este plan las reparte en un fichero por tarea o entrada de UI (`e2e/watched-movie-page.spec.ts`, `e2e/watched-next-part.spec.ts`, `e2e/watched-sync.spec.ts`, `e2e/watched-catalogue.spec.ts`, `e2e/watched-cues.spec.ts`, `e2e/watched-out-of-range.spec.ts`, `e2e/watched-blocked-storage.spec.ts`) más el helper `e2e/support/movies.ts`, para que cada ciclo rojo/verde tenga su propio fichero. Se cumplen todas las condiciones del §6 (elección de películas con `validateAll`, imports prohibidos, idioma, siembra con `page.evaluate` + `reload`, sonda de color).
- No se ha encontrado nada del spec que no se pueda implementar tal como está escrito.

## Log
<!-- One line per checkpoint: date, phase, result, commit. -->
2026-10-25 baseline — passed (unit, ui, typecheck) — 259b8ee
2026-10-25 tdd — T1-T7 done (21 agents) — 87a06d1
2026-10-25 unit-suite — passed — (this commit)
2026-10-25 ui-tests — U1-U3 passed — (this commit)
