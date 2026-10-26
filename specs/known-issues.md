# Problemas conocidos

<!-- Managed by dev-workflows. One section per issue; ids are never reused. Status: open | fixed | wontfix -->

## KI-001 — Al volver atrás, la posición del catálogo se recorta si la página aún no tiene su altura final
- **Severity:** medium
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `src/components/Layout.tsx:15`
- **Found:** 2026-10-25 by fix/catalogue-scroll-restore (review, hallazgo F-1)
- **GitHub:** -

El arreglo de R-1 deja de reiniciar el scroll en navegaciones POP y confía en la restauración nativa del navegador. Esa restauración se aplica antes de que el catálogo tenga su altura final: en Chromium contra el primer render (títulos en esqueleto, orden por slug, más bajo que el final) y en Safari/Firefox, según el orden del estándar, contra la ficha que aún está montada. La posición guardada se recorta a la altura disponible. Medido en Chromium: 559→498 px a 360×420, 340→193 px a 800×400; a 360×640 se conserva. Hoy, con 3 películas, la tarjeta abierta sigue a la vista en el caso habitual; empeorará cuando el catálogo crezca.

Arreglo sugerido: guardar `window.scrollY` por `location.key` (sessionStorage, en PUSH/REPLACE y en `pagehide`), poner `history.scrollRestoration = 'manual'` y reaplicar la posición en POP cuando el catálogo tenga su layout final (tras cargar `details`). Añadir un test e2e donde la ficha sea más corta que el desplazamiento guardado. Se descartó en el bugfix por decisión de alcance (arreglo mínimo).

## KI-002 — El nombre de fichero (slug) no se valida y se usa sin codificar en la URL
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `src/lib/movies.ts:17`, `src/components/MovieCard.tsx:30`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-2, R-8)
- **GitHub:** -

`docs/JSON_FORMAT.md` exige `<nombre-legible>-<año>.json` en minúsculas y con guiones, pero ni `validate.ts` ni `scripts/validate.ts` lo comprueban, y la tarjeta enlaza a `/movie/${movie.slug}` sin codificar. Un fichero con `#`, `?` o `%` en el nombre pasa `npm run validate`, pero su ficha no es accesible desde el catálogo (el router corta el slug y `findMovie` no lo encuentra, o lo deja sin decodificar). Solo el dueño del repo añade ficheros, por eso es poco probable.

Arreglo sugerido: comprobar el slug en `validateAll` (`/^[a-z0-9]+(-[a-z0-9]+)*$/`) y usar `encodeURIComponent(movie.slug)` al construir el enlace.

## KI-003 — Un `tmdbId` solo con espacios pasa la validación y luego se trata como ausente
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `src/lib/validate.ts:9`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-3)
- **GitHub:** -

`isPresent` solo rechaza `undefined`, `null` y `''`. Con `"tmdbId": "  "` la validación pasa, el sync lo recorta a `''` y lo descarta, y la ficha muestra «Faltan los datos de TMDB» en vez de un error de validación claro.

Arreglo sugerido: tratar también las cadenas en blanco como ausentes (`typeof value === 'string' ? value.trim() !== '' : value != null`).

## KI-004 — La detección de ediciones duplicadas no recorta el `tmdbId`
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `src/lib/validate.ts:112`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-4)
- **GitHub:** -

`findEditionClashes` usa `String(data.tmdbId)` sin `trim`, mientras que `sync-tmdb.ts` y `tmdb.ts` sí recortan. Dos ficheros con `2059` y `" 2059"` y sin edición no se detectan como duplicados y el catálogo muestra la misma película dos veces.

Arreglo sugerido: normalizar la clave con `String(data.tmdbId).trim()`, idealmente con un helper `normalizeTmdbId` compartido por `validate.ts`, `tmdb.ts` y `sync-tmdb.ts`.

## KI-005 — Tras un fallo de escritura, las marcas sin guardar pisan cambios más nuevos de otras pestañas
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `src/lib/WatchedContext.tsx:57`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-5)
- **GitHub:** -

Si `localStorage.setItem` falla en `toggle`, la marca queda en `unsaved` sin caducidad y cada `adopt` posterior la vuelve a aplicar sobre lo guardado. Si otra pestaña cambia esa misma parte después, esta pestaña deshace el cambio en silencio en su siguiente escritura. Requiere un fallo de cuota, que luego se libere espacio y un cambio en otra pestaña sobre la misma parte; no corrompe datos.

Arreglo sugerido: en `adopt`, descartar las marcas sin guardar que el almacenamiento ya refleja y reintentar la escritura; o dar prioridad al almacenamiento cuando haya cambiado desde el fallo.

## KI-006 — El fetch a TMDB no tiene timeout
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `scripts/sync-tmdb.ts:108`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-6)
- **GitHub:** -

`fetchDetails` llama a `fetch` sin `signal`. Si la conexión se acepta y se queda colgada, `predev` y el paso de sync en CI esperan hasta unos 5 minutos (timeouts por defecto de undici) antes de fallar. Sin red falla en segundos.

Arreglo sugerido: `signal: AbortSignal.timeout(10_000)` y un mensaje de error propio para el timeout.

## KI-007 — Peticiones a TMDB en paralelo sin límite y sin reintento ante 429
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `scripts/sync-tmdb.ts:137`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-7)
- **GitHub:** -

El sync lanza 2 × N peticiones a la vez y cualquier 429 o 5xx aborta todo el `Promise.all` (el build falla; con `--soft` se conservan los datos viejos). TMDB limita las conexiones simultáneas por IP, así que con unas 10 películas o más puede haber builds que fallan al azar. Hoy hay 3.

Arreglo sugerido: limitar la concurrencia a 4–8 peticiones y reintentar 429 y 5xx con backoff respetando `Retry-After`.

## KI-008 — Un póster que falla al cargar deja el marco vacío
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/ki-008-poster-fallback
- **Location:** `src/components/Poster.tsx:34`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-9)
- **GitHub:** -

`PosterImage` no tiene `onError`: si la imagen de TMDB da 404 o no hay red, queda un `<img>` roto y nunca se usa el recuadro con el título (`.poster-empty`), que solo aparece cuando no hay `path`.

Arreglo sugerido: estado `failed` (reiniciado al cambiar `path`), `onError={() => setFailed(true)}` y pintar `poster-empty` cuando `!path || failed`.

## KI-009 — Se crea un `Intl.Collator` nuevo en cada comparación al ordenar
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `src/lib/sort.ts:18`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-10)
- **GitHub:** -

`compareTitles` crea un collator y recalcula las dos claves de orden en cada llamada, O(n log n) collators por ordenación. Despreciable con 3 películas; crece con el catálogo.

Arreglo sugerido: un collator cacheado por idioma a nivel de módulo y calcular la clave de cada película una sola vez antes de ordenar.

## KI-010 — El estado de una película se arrastra si se reutiliza la ficha al cambiar de slug
- **Severity:** low
- **Status:** fixed
- **Fixed in:** fix/known-issues-2026-10-26
- **Location:** `src/pages/Movie.tsx:16`
- **Found:** 2026-10-25 by reviews/2026-10-25-app.md (R-11)
- **GitHub:** -

La ruta `movie/:slug` no tiene `key`, así que al pasar de una película a otra sin desmontar la ficha se conservan las pistas abiertas (por índice de parte, un spoiler no pedido) y, durante un render, los datos de TMDB de la anterior. Hoy es latente: ningún enlace va de una ficha a otra. Se vuelve alcanzable en cuanto exista navegación película a película.

Arreglo sugerido: remontar por película (`<Movie key={slug} />` con un pequeño wrapper que lea `useParams`), o `key` por slug en `EpisodeList`.
