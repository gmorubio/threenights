---
title: Marcar partes como vistas
slug: watched-parts
status: done
created: 2026-10-25
updated: 2026-10-25
branch: feature/watched-parts
design: null
---

# Marcar partes como vistas

## 1. Contexto y objetivo
Three Nights divide películas en partes para verlas en varias noches, pero hoy no recuerda por dónde va cada espectador. Quien vuelve a la web una noche después tiene que acordarse de qué parte le toca.

Esta funcionalidad permite marcar cada parte de una película como vista. El progreso se guarda solo en el navegador (un navegador por dispositivo, sin backend ni sincronización entre dispositivos). El catálogo muestra el progreso sobre cada póster y la ficha de la película destaca la siguiente parte por ver.

Éxito: el espectador marca y desmarca partes con un clic, el progreso sobrevive a recargas, se ve de un vistazo en el catálogo y la ficha indica qué parte toca, sin que nada falle si el almacenamiento del navegador está bloqueado o corrupto.

## 2. Alcance
### Dentro del alcance
- Botón por parte para marcar o desmarcar como vista, independiente en cada parte.
- Persistencia en `localStorage` (clave `threenights.watched`), con lectura tolerante, modo solo en memoria si el almacenamiento falla y sincronización entre pestañas abiertas.
- Ficha: aspecto atenuado de las partes vistas, parte siguiente destacada y resumen «N vista(s)» junto al número de partes.
- Catálogo: barra segmentada de progreso sobre el póster y texto accesible equivalente.
- Textos nuevos en español e inglés.
- Pruebas unitarias (Vitest) de la lógica pura y pruebas de UI (Playwright).
- Quitar la entrada «Mark parts as watched» de `docs/ROADMAP.md`. La sección «Watching» se queda vacía y se elimina con ella.

### Fuera del alcance
- Backend o sincronización entre dispositivos.
- Exportar o importar el progreso.
- Acción para desmarcar todo o reiniciar el progreso.
- Ordenar, agrupar o filtrar el catálogo por progreso (el orden sigue siendo alfabético).
- Fecha u hora en que se vio cada parte.
- Barra de progreso sobre el póster de la ficha.
- Puntos de reanudación dentro de una parte.
- Ejecutar Playwright en la CI de despliegue.
- Cambios en el formato de los ficheros de película.
- Actualizar `docs/functional/` (lo hace `/dev-workflows:ship` más adelante).

## 3. Criterios de aceptación
«N» es el número de partes de la película usada en la prueba. En el almacenamiento y en la lógica los índices empiezan en 0; en pantalla, la parte de índice 0 es «Parte 1». En las pruebas de UI cada resultado se comprueba con un `expect` propio y con nombre.

Lógica pura (`src/lib/watched.ts`):

- **AC-1** [unit] — Given que no hay nada guardado (`null`), when se interpreta el valor almacenado, then el resultado es un progreso vacío.
- **AC-2** [unit] — Given un texto guardado que no es JSON válido, when se interpreta, then el resultado es un progreso vacío y no se lanza ninguna excepción.
- **AC-3** [unit] — Given un JSON válido que no es un objeto (número, texto, `null` o array), when se interpreta, then el resultado es un progreso vacío.
- **AC-4** [unit] — Given un objeto en el que el valor de un slug no es un array, when se interpreta, then ese slug no aparece en el resultado y los demás slugs válidos se conservan.
- **AC-5** [unit] — Given un array con elementos que no son enteros seguros no negativos (`1.5`, `"1"`, `-1`, `2**53`, `null`), when se interpreta, then esos elementos se descartan y los válidos se conservan.
- **AC-6** [unit] — Given un array con índices repetidos y desordenados (`[2, 0, 2]`), when se interpreta, then el resultado es `[0, 2]`.
- **AC-7** [unit] — Given un slug cuyo array queda vacío, ya sea de origen o tras descartar elementos, when se interpreta, then ese slug no aparece en el resultado.
- **AC-8** [unit] — Given un objeto guardado con la clave `"__proto__"`, when se interpreta, then el prototipo del resultado no cambia (sigue siendo `Object.prototype` o `null`) y `Object.prototype` no gana propiedades.
- **AC-9** [unit] — Given un progreso con partes vistas, when se serializa y se vuelve a interpretar, then se obtiene el mismo progreso, y el texto serializado tiene la forma `{"<slug>":[0,2]}`, con índices ascendentes.
- **AC-10** [unit] — Given un progreso en el que el índice 2 no está marcado, when se alterna el índice 2, then pasa a estar marcado y no cambian los demás índices de esa película ni las demás películas.
- **AC-11** [unit] — Given un progreso con los índices 0, 2 y 7 marcados en una película, when se alterna el índice 2, then deja de estar marcado y se conservan el 0 y el 7, aunque el 7 esté fuera de rango.
- **AC-12** [unit] — Given una película con un único índice marcado, when se alterna ese índice, then el slug desaparece del progreso.
- **AC-13** [unit] — Given una película de N partes con índices guardados dentro y fuera de `0..N-1`, when se calculan sus partes vistas, then solo se devuelven los índices dentro del rango, en orden ascendente.
- **AC-14** [unit] — Given una película con al menos una parte vista y al menos una sin ver, when se calcula la parte siguiente, then es la primera parte sin ver en orden, aunque haya partes posteriores vistas (vistas {1} de 3 → 0; vistas {0, 2} de 3 → 1).
- **AC-15** [unit] — Given una película sin partes vistas dentro del rango (sin entrada o solo con índices fuera de rango), when se calcula la parte siguiente, then no hay parte siguiente.
- **AC-16** [unit] — Given una película de al menos 2 partes con todas vistas, when se calcula la parte siguiente, then no hay parte siguiente.
- **AC-17** [unit] — Given una película de una sola parte con esa parte vista, when se calcula la parte siguiente, then no hay parte siguiente.

Ficha de la película:

- **AC-18** [ui] — Given una película válida de al menos 2 partes sin progreso, when se abre su ficha, se marca la Parte 1, se marca la Parte 2, se desmarca la Parte 2, se recarga y se desmarca la Parte 1, then:
  - al abrir, todos los botones de vista tienen `aria-pressed="false"` y el encabezado «Partes» no muestra resumen;
  - tras marcar la Parte 1, el botón de nombre «Vista, Parte 1» está pulsado con el texto visible «✓ Vista», los demás siguen sin pulsar y el encabezado muestra «1 vista»;
  - tras marcar la Parte 2, el encabezado muestra «2 vistas»;
  - tras desmarcar la Parte 2, el botón «Vista, Parte 2» no está pulsado, su texto visible es «○ Vista» y el encabezado muestra «1 vista»;
  - tras recargar, «Vista, Parte 1» sigue pulsado y «Vista, Parte 2» no;
  - tras desmarcar la Parte 1, el encabezado no muestra resumen.
- **AC-19** [ui] — Given una película válida de al menos 2 partes, when se abre sin progreso, se marca solo la última parte y después se marcan todas, then:
  - sin progreso, ninguna parte muestra «Siguiente»;
  - con solo la última vista, la Parte 1 muestra «Siguiente» junto a «Parte 1» y ninguna otra parte lo muestra;
  - la Parte 1 tiene `border-left-width` de 3px y `border-left-color` igual al color de `--accent`, y el borde izquierdo de las demás partes no es de ese color;
  - con todas vistas, ninguna parte muestra «Siguiente».
- **AC-20** [ui] — Given progreso guardado con la Parte 1 vista y la Parte 2 sin ver, when se abre la ficha, then:
  - la opacidad efectiva (producto de la del elemento y sus ancestros) de `.episode-label`, `.episode-title` y `.episode-cut-time` de la Parte 1 es menor que 1, y la de esos mismos elementos de la Parte 2 es 1;
  - la opacidad efectiva del botón de vista, `.episode-meta` y `.episode-cut-label` de la Parte 1 es 1.
- **AC-21** [ui] — Given progreso guardado cuya parte siguiente tiene pista de corte, when se abre la ficha, then el scroll vertical de la página es 0 y el botón de pista de esa parte tiene `aria-expanded="false"`.
- **AC-22** [ui] — Given una parte vista con pista de corte, when se pulsa «Mostrar pista de corte», then el botón pasa a `aria-expanded="true"` y el texto de la pista es visible.
- **AC-23** [ui] — Given la Parte 1 marcada con el idioma en español, when se cambia el idioma a inglés, then el botón de nombre «Watched, Night 1» sigue pulsado con el texto visible «✓ Watched» y el encabezado muestra «1 watched».

Catálogo:

- **AC-24** [ui] — Given una película válida de al menos 2 partes, when se abre el catálogo sin progreso, con la parte de índice i vista y con todas sus partes vistas, then:
  - sin progreso, su tarjeta no tiene `.watched-bar`;
  - con la parte i vista, la tarjeta tiene una `.watched-bar` con `aria-hidden="true"` y N segmentos, de los que solo el i tiene `data-filled="true"`;
  - con todas vistas, los N segmentos tienen `data-filled="true"`.
- **AC-25** [ui] — Given una película de N partes con 1 parte vista, when se abre el catálogo en español y después en inglés, then:
  - en español existe un enlace con nombre accesible que contiene «1 de N partes vistas» («1 de 1 parte vista» si N = 1);
  - en inglés, el nombre contiene «1 of N nights watched» («1 of 1 night watched» si N = 1);
  - el texto está en un elemento con la clase `.visually-hidden` dentro del enlace.

Robustez:

- **AC-26** [ui] — Given dos pestañas del mismo navegador con la ficha de la misma película de al menos 2 partes, when se marca la Parte 1 en la pestaña A y después la Parte 2 en la pestaña B, then:
  - la pestaña B muestra la Parte 1 pulsada sin recargar;
  - la pestaña A muestra la Parte 2 pulsada sin recargar;
  - el valor guardado en `threenights.watched` contiene los índices 0 y 1 de esa película.
- **AC-27** [ui] — Given `threenights.watched` con un valor que no es JSON válido, when se abre la ficha y se marca la Parte 1, then:
  - la ficha se muestra sin errores de página y sin partes marcadas;
  - tras marcar, el valor guardado es JSON válido con el índice 0 de esa película.
- **AC-28** [ui] — Given `threenights.watched` con solo índices fuera de rango para una película, when se abren su ficha y el catálogo, then no hay partes pulsadas, ni «Siguiente», ni resumen en el encabezado, ni `.watched-bar` en su tarjeta.
- **AC-29** [ui] — Given que el acceso a `window.localStorage` lanza una excepción, when se marca la Parte 1 de una película de al menos 2 partes y después se recarga, then:
  - la Parte 1 queda pulsada y la Parte 2 muestra «Siguiente»;
  - no se produce ningún error de página (`pageerror`);
  - no aparecen más elementos `.notice` que en la misma ficha con almacenamiento normal;
  - tras recargar, no hay partes pulsadas.

## 4. Diseño de UI
Diseño cerrado en el grilling, sin maqueta (`design: null`).

**Ficha, cabecera de cada parte (`.episode-head`)**
- Botón de vista dentro de `.episode-name`, bajo la línea de duración y «Empieza en». Está siempre presente en las partes de un fichero válido, haya o no datos de TMDB.
- Texto visible fijo «Vista» / «Watched», precedido de un icono que cambia con el estado: «○ Vista» sin pulsar y «✓ Vista» pulsado (en inglés «○ Watched» / «✓ Watched»). El icono va en un `<span aria-hidden="true">`. Como el texto visible está contenido en el nombre accesible, cumple WCAG 2.5.3 (Label in Name).
- Nombre accesible fijo por parte, mediante `aria-label`: «Vista, Parte N» / «Watched, Night N». El estado se comunica solo con `aria-pressed`.
- Sin pulsar: pastilla con contorno, como `.lang-switch` (borde de 1px en `--line`, `border-radius: 999px`), y `min-height: 44px`. Pulsado: relleno sólido de acento, como `.lang-option[aria-pressed='true']` (fondo `--accent`, texto `#1a1305`).
- Parte vista: solo la etiqueta «Parte N», el título y la hora de corte bajan a opacidad ~0.6. Las líneas atenuadas por diseño (duración e inicio, «Corta en» / «Hasta el final», aviso de spoiler) y el botón de vista quedan a opacidad completa, de modo que todo el texto cumple WCAG AA. La pista sigue funcionando.
- Parte siguiente: borde izquierdo de 3px en `--accent` y etiqueta «Siguiente» / «Up next» junto a «Parte N» / «Night N». Sin scroll automático y sin abrir la pista.

**Ficha, encabezado «Partes»**
- Tras «N partes» se añade «1 vista» / «2 vistas» («1 watched» / «2 watched»), separado con «·» como en `.card-meta`, solo si hay al menos una parte vista.
- El póster de la ficha no cambia.

**Catálogo, tarjeta**
- Barra segmentada pegada al borde inferior del póster, con un segmento por parte: relleno en `--accent` si la parte está vista y translúcido si no. Solo aparece si hay al menos una parte vista. Con todas vistas queda entera rellena, sin otra insignia.
- También aparece sobre el hueco de carga (sin parpadear con él) y sobre el recuadro sin póster. Se eleva con el póster en hover/focus.
- La barra es `aria-hidden`. Dentro del enlace hay un texto oculto visualmente: «1 de 3 partes vistas» / «1 of 3 nights watched». La barra solo informa: no tiene controles.

**Textos nuevos (`src/i18n/strings.ts`)**

| Clave | es | en |
|---|---|---|
| `watchedLabel` | Vista | Watched |
| `watchedToggleName(n)` | Vista, Parte n | Watched, Night n |
| `nextPart` | Siguiente | Up next |
| `watchedCount(n)` | 1 vista / n vistas | n watched |
| `watchedOf(w, total)` | total = 1: «w de 1 parte vista»; si no: «w de total partes vistas» | total = 1: «w of 1 night watched»; si no: «w of total nights watched» |

El plural de `watchedOf` depende de `total`, igual que `partCount`.

## 5. Especificación técnica
### Componentes afectados
| Componente / fichero | Cambio |
|---|---|
| `src/lib/watched.ts` (nuevo) | Lógica pura: `WATCHED_KEY`, `parseWatched`, `serializeWatched`, `toggleWatched`, `watchedParts`, `nextPart`. Sin acceso a `window`. |
| `src/lib/watched.test.ts` (nuevo) | Pruebas Vitest de AC-1 a AC-17. |
| `src/lib/WatchedContext.tsx` (nuevo) | `WatchedProvider` y `useWatched()`, con el patrón de `src/i18n/LanguageContext.tsx`: lectura perezosa en `useState`, `try/catch` silencioso en cada acceso a `window.localStorage` (incluido el propio acceso a la propiedad) y un hook que lanza fuera del proveedor. Escucha el evento `storage`. |
| `src/main.tsx` | Montar `<WatchedProvider>` dentro de `<LanguageProvider>`, envolviendo `<App />`. |
| `src/pages/Movie.tsx` | Llamar a `useWatched()` al principio, antes de los `return` tempranos (regla de hooks). Para ficheros válidos, calcular `watchedParts`, `nextPart` y el número de vistas y pasarlos a `EpisodeList`. Añadir `<span className="muted parts-watched">{t.watchedCount(n)}</span>` en `.movie-section-head` si n > 0. |
| `src/pages/Movie.css` | Separador «·» de `.parts-watched`. |
| `src/components/EpisodeList.tsx` | Nuevas props `watched: ReadonlySet<number>`, `nextIndex: number \| null` y `onToggle: (index: number) => void`. `EpisodeItem` recibe `watched`, `isNext` y `onToggle`, y: añade las clases `episode-watched` / `episode-next` al `<li>`; pinta `.episode-next-label` junto a `.episode-label`; y añade `<button type="button" className="watched-toggle" aria-pressed aria-label={t.watchedToggleName(number)}>` con el texto visible del §4. La pista de corte no cambia. |
| `src/components/EpisodeList.css` | Ver «Estilos» abajo. |
| `src/components/Poster.tsx` / `Poster.css` | Nueva prop opcional `overlay?: ReactNode`. `Poster` envuelve siempre la variante (carga, vacío o imagen) en `<div className="poster-frame">` (`position: relative`) y pinta `overlay` como hermano de `.poster`, no como hijo. Así la animación `shimmer` de `.poster-skeleton`, que anima `opacity`, no afecta a la barra. La ficha no pasa `overlay`; `.movie-poster .poster` sigue aplicando. |
| `src/components/MovieCard.css` | La elevación en hover/focus (`transform`) pasa de `.card .poster` a `.card .poster-frame`, para que barra y póster suban juntos. El `box-shadow` sigue en `.card .poster`. |
| `src/components/WatchedBar.tsx` / `WatchedBar.css` (nuevos) | `<div className="watched-bar" aria-hidden="true">` con `total` hijos `<span className="watched-segment" data-filled="true\|false">`. Posición absoluta (`left/right/bottom: 0`) dentro de `.poster-frame`, con las esquinas inferiores redondeadas a `var(--radius)` y `overflow: hidden`. |
| `src/components/MovieCard.tsx` | Con `movie.data` y al menos una parte vista: pasa `<WatchedBar>` como `overlay` de `Poster` y añade `<span className="visually-hidden">{t.watchedOf(w, total)}</span>` dentro del `<Link>`. |
| `src/styles/global.css` | Utilidad `.visually-hidden`, que hoy no existe. |
| `src/i18n/strings.ts` | Claves del §4 en `Strings`, `es` y `en`. |
| `e2e/watched-parts.spec.ts` (nuevo) | Pruebas Playwright de AC-18 a AC-29. |
| `docs/ROADMAP.md` | Quitar la entrada y la sección «Watching», que queda vacía. |

`src/pages/Catalogue.tsx` y `src/lib/sort.ts` no cambian.

**Estilos (`EpisodeList.css`)**
- Atenuado de parte vista. Selectores exactos, con `opacity: 0.6` en cada elemento y nunca en un ancestro del botón (la opacidad no se puede deshacer en un hijo):
  - `.episode-watched .episode-label`
  - `.episode-watched .episode-title`
  - `.episode-watched .episode-cut-time`
- Sin atenuar: `.episode-meta`, `.episode-cut-label`, `.cue-hint`, `.cue-text` y `.watched-toggle`.
- `.episode-next { border-left: 3px solid var(--accent); }`. Todas las `.episode` tienen ya un borde de 1px en `--line`.
- `.watched-toggle`: pastilla con contorno y `min-height: 44px`. `.watched-toggle[aria-pressed='true']`: fondo `--accent`, texto `#1a1305`.

### Modelo de datos y estado
```ts
// src/lib/watched.ts
export const WATCHED_KEY = 'threenights.watched';
/** slug -> índices de parte vistos (base 0): enteros seguros no negativos, sin duplicados, ascendentes, nunca vacío. */
export type WatchedState = Readonly<Record<string, readonly number[]>>;

export function parseWatched(raw: string | null): WatchedState;
export function serializeWatched(state: WatchedState): string;
/** Inmutable. Añade o quita `index`. Si el slug se queda sin índices, se borra la clave. No toca otros índices ni slugs. */
export function toggleWatched(state: WatchedState, slug: string, index: number): WatchedState;
/** Índices vistos dentro de 0..partCount-1, ascendentes. Su longitud es el progreso. */
export function watchedParts(state: WatchedState, slug: string, partCount: number): number[];
/** Primera parte sin ver si hay al menos una vista y al menos una sin ver; si no, null. */
export function nextPart(state: WatchedState, slug: string, partCount: number): number | null;
```
- Reglas de `parseWatched`:
  - `JSON.parse` dentro de `try`. Si el resultado no es un objeto (o es `null` o un array), el progreso es `{}`.
  - Por cada entrada propia: se ignora si el valor no es un array. Si lo es, se conservan solo los elementos con `Number.isSafeInteger(x) && x >= 0`, se quitan duplicados y se ordenan. Si el array queda vacío, se descarta el slug.
  - El resultado se construye con `Object.fromEntries` (u objeto de prototipo `null`), nunca asignando claves a un `{}`, para que una clave `"__proto__"` no altere el prototipo.
- Las lecturas por slug en `toggleWatched`, `watchedParts` y `nextPart` usan `Object.hasOwn`.
- La identidad de una parte es `(slug, índice)`. Se indexa por slug, no por `tmdbId`, porque varias ediciones pueden compartir `tmdbId`.
- `parseWatched` no conoce el número de partes. Los índices fuera de rango se conservan en el estado y en las escrituras (sin poda) y se descartan solo en `watchedParts` y `nextPart`.
- Contexto: `{ watched: WatchedState; toggle(slug: string, index: number): void }`. El estado vive en React; `localStorage` es solo persistencia.
- Un `ref` guarda siempre el último estado. `toggle` calcula el siguiente estado a partir del `ref` (no dentro del updater de `setState`, que StrictMode invoca dos veces), actualiza el `ref` y el estado, y escribe `serializeWatched` en `try/catch`.
- La lectura inicial (`try { parseWatched(window.localStorage.getItem(WATCHED_KEY)) } catch { {} }`) es idempotente, así que es segura con StrictMode.
- El estado no depende del idioma activo.

### Contratos (APIs, eventos, formatos de almacenamiento)
- `localStorage['threenights.watched']`: JSON `{ "<slug>": [<índice>, ...] }`, por ejemplo `{"hercules-1997":[0,2]}`. Sin campo de versión. El slug es el nombre del fichero sin `.json`, el mismo de la URL `/movie/:slug`.
- Evento `storage` de `window`, registrado en un `useEffect` con limpieza. Actualiza a la vez el `ref` y el estado, para que una marca posterior en esta pestaña parta del valor que escribió la otra:
  - si `event.key === WATCHED_KEY`, el nuevo estado es `parseWatched(event.newValue)`;
  - si `event.key === null` (`localStorage.clear()` en otra pestaña), el nuevo estado es vacío;
  - otras claves se ignoran.

### Gestión de errores y casos límite
- JSON inválido, forma incorrecta o entradas inválidas: se ignoran sin fallar (AC-2 a AC-8, AC-27). La siguiente marca sobrescribe con un valor válido.
- `localStorage` bloqueado o que lanza, incluido el acceso a `window.localStorage`: funciona en memoria durante la vida de la pestaña, sin aviso, igual que el idioma (AC-29).
- Índices fuera de rango (por ejemplo, tras volver a cortar una película con slice-movie): no cuentan para la barra, el resumen ni la parte siguiente, y no se borran (AC-11, AC-13, AC-28).
- Película de una parte: mismas reglas. Si está vista, barra de un segmento lleno y sin parte siguiente (AC-17).
- Fichero de película no válido: no hay botones de vista, barra, texto de partes vistas ni resumen, aunque `threenights.watched` tenga una entrada para su slug. Lo garantizan los `return` tempranos que ya existen: `Movie.tsx` sale antes de pintar las partes y `MovieCard` solo pinta progreso con `movie.data`.
- Sin datos de TMDB: los botones de vista y la barra dependen solo del fichero de película, nunca de TMDB.

### Riesgos y restricciones
- Limitación aceptada: si cambian los cortes de una película, el progreso guardado puede apuntar a partes distintas; si se renombra el fichero, su progreso se pierde. Se documentará en `docs/functional/` durante `/dev-workflows:ship`.
- Progreso limitado a un navegador por dispositivo.
- La CI de despliegue no ejecuta Playwright: las AC [ui] se verifican en local.

## 6. Estrategia de pruebas
Unitarias: `src/lib/watched.test.ts` (Vitest, entorno node, sin DOM).

UI: `e2e/watched-parts.spec.ts`, con estas condiciones:
- **Elección de películas.** Se leen `movies/*.json` con `JSON.parse` protegido por `try/catch` y se pasan a `validateAll` de `src/lib/validate.ts`, igual que `scripts/validate.ts` (está comprobado que Playwright puede importarlo). Se eligen películas con `data` y el número de partes, o las pistas, que pida cada test. Nunca se fijan slugs ni recuentos; si ninguna película cumple la condición, el test se omite.
- **Imports prohibidos.** Los tests nunca importan `src/lib/movies.ts` ni `src/lib/tmdb.ts`, porque usan `import.meta.glob`.
- **TMDB.** No se comprueban sus textos. Las tarjetas se localizan por `href` `/movie/<slug>`.
- **Idioma.** Por defecto `test.use({ locale: 'es-ES' })`. AC-23 y AC-25 cambian a inglés con el selector de idioma.
- **Botones.** Se localizan con `getByRole('button', { name, pressed })`, usando el nombre accesible fijo «Vista, Parte N».
- **Progreso sembrado.** Se escribe con `page.evaluate` y después `page.reload()`. `addInitScript` no sirve para esto porque se repite en cada recarga; se usa solo para que el getter de `window.localStorage` lance (AC-29).
- **Colores (AC-19).** Se normalizan resolviendo `--accent` en un elemento sonda (`color: var(--accent)`) y comparando con el `border-left-color` calculado.
- **Variantes del póster.** La UI solo comprueba la barra en la variante que se pinte en el entorno de prueba (imagen o recuadro vacío, según exista `src/data/tmdb.json`). No se interceptan módulos de Vite. Que `overlay` se pinte en las tres ramas de `Poster`, y fuera del elemento animado en la de carga, se verifica en la revisión de código.

| AC | Nivel | Qué demuestra la prueba |
|---|---|---|
| AC-1 | unit | `parseWatched(null)` devuelve `{}`. |
| AC-2 | unit | Un texto no JSON devuelve `{}` sin lanzar. |
| AC-3 | unit | Un JSON que no es objeto devuelve `{}`. |
| AC-4 | unit | Se descarta un slug cuyo valor no es array, sin afectar a los demás. |
| AC-5 | unit | Solo sobreviven los enteros seguros no negativos. |
| AC-6 | unit | Los índices salen sin duplicados y en orden ascendente. |
| AC-7 | unit | Se descartan los slugs con array vacío. |
| AC-8 | unit | La clave `"__proto__"` no altera prototipos. |
| AC-9 | unit | Serializar e interpretar conserva el progreso con el formato acordado. |
| AC-10 | unit | `toggleWatched` marca solo el índice indicado. |
| AC-11 | unit | Desmarcar conserva los demás índices, incluidos los fuera de rango. |
| AC-12 | unit | Desmarcar el último índice borra el slug. |
| AC-13 | unit | `watchedParts` ignora los índices fuera de `0..N-1`. |
| AC-14 | unit | `nextPart` devuelve la primera parte sin ver aunque haya posteriores vistas. |
| AC-15 | unit | `nextPart` es `null` sin progreso en rango. |
| AC-16 | unit | `nextPart` es `null` con todas las partes vistas. |
| AC-17 | unit | `nextPart` es `null` en una película de una parte vista. |
| AC-18 | ui | Ciclo completo del botón: estado inicial, marcar, resumen singular y plural, desmarcar, persistencia tras recargar. |
| AC-19 | ui | Cálculo de la parte siguiente conectado a la ficha: etiqueta, borde de acento de 3px y desaparición con todo visto. |
| AC-20 | ui | Solo se atenúan los tres elementos acordados; botón y líneas secundarias quedan a opacidad efectiva 1. |
| AC-21 | ui | Sin scroll automático y con la pista de la parte siguiente cerrada. |
| AC-22 | ui | La pista de una parte vista se abre con normalidad. |
| AC-23 | ui | Cambiar de idioma conserva el estado y traduce nombre, texto y resumen. |
| AC-24 | ui | Barra ausente, parcial y completa, con `aria-hidden` y un segmento por parte. |
| AC-25 | ui | Texto accesible del enlace en ambos idiomas, dentro de `.visually-hidden`. |
| AC-26 | ui | El evento `storage` sincroniza dos pestañas en ambos sentidos sin perder marcas. |
| AC-27 | ui | Un valor corrupto no rompe la ficha y se sobrescribe al marcar. |
| AC-28 | ui | Los índices fuera de rango no se muestran en la ficha ni en el catálogo. |
| AC-29 | ui | Con el almacenamiento bloqueado todo funciona en memoria, sin errores ni avisos nuevos, y se pierde al recargar. |
