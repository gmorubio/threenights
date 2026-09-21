---
name: slice-movie
description: Divide una película en partes, como si fuera una miniserie, a partir de su archivo de subtítulos (.srt o .vtt) y genera su fichero JSON en movies/ para Three Nights. Úsala siempre que el usuario adjunte un archivo de subtítulos en este repo, o diga cosas como "divide esta película", "hazme los cortes de", "nueva película", "añade esta peli", "slice" — aunque adjunte el archivo sin decir casi nada. También para ajustar después un corte de una película ya dividida ("mueve el corte 2", "explícame el corte 2 con spoilers"). NO es para editar a mano un JSON por otros motivos ni para trabajar en la app.
---

# slice-movie

Convierte un archivo de subtítulos en un fichero `movies/<slug>-<año>.json` con
los mejores puntos donde parar la película.

## Lo primero: el usuario NO ha visto la película

Esta skill se usa para películas que va a ver por primera vez. **Si le haces un
spoiler, se pierde la gracia.** Esto manda sobre todo lo que escribas: el chat,
los títulos, los cues y los mensajes de commit.

- Todo tu razonamiento con trama se queda en tu cabeza. Al chat solo llegan
  justificaciones **estructurales**: "cierre de secuencia con cambio de
  localización y salto temporal", "gancho fuerte", "hueco limpio de 40 s".
- Nunca: qué pasa, quién muere, quién gana, quién traiciona, qué se descubre,
  cómo acaba una escena, ni emociones que lo delaten.
- Tampoco sinopsis: si al buscar en TMDB lees el argumento, no lo repitas.
- **Única vía de escape:** si el usuario lo pide expresamente ("explícame el corte
  2 con spoilers"), explicas ESE corte con trama, precedido de una línea
  `⚠️ SPOILERS del corte 2`. Solo ese corte, solo esa vez. No lo ofrezcas tú.

Como el usuario aprueba a ciegas, su "ok" revisa la forma (duraciones, número de
partes, títulos). La calidad narrativa de los cortes es responsabilidad tuya:
por eso cada corte lleva una valoración de confianza honesta.

## El criterio de corte

Este es el encargo original del autor del proyecto, tal cual lo formuló. Es el
núcleo de la skill:

> Quiero que cojas el archivo de subtítulos de una película y dividas la
> película en episodios como si fueran una miniserie. Lo MÁS IMPORTANTE es que
> los episodios se adapten al flujo narrativo de la historia, es decir:
>
> - que no haya cortes bruscos (siempre en cambio de escena)
> - que el cambio de escena sea lo suficientemente importante para cortar un
>   episodio
> - si es posible, simula la tendencia típica de una serie de dejarte con la
>   sensación de cliffhanger, para dividir en episodios pero sin perder el
>   interés en continuar la película
> - si es posible, que cada episodio no tenga menos de 30 minutos ni más de 60,
>   siempre prevaleciendo más las condiciones anteriores.
>
> Lee el guion y las marcas de tiempo para saber cuándo hacer los mejores
> cortes.

Precisiones acordadas:

- **El número de partes es libre.** No hay preferencia por ninguna cantidad,
  ni siquiera para desempatar. Si 5 cortes son mejores que 3, son 5; si 3 son
  mejores que 5, son 3. El proyecto se llama Three Nights, pero eso no obliga.
- **30–60 minutos es orientativo.** Una parte de 62 minutos con un corte
  excelente gana a una de 55 con un corte mediocre. Si una zona no tiene
  ningún corte digno (un tercer acto sin respiro), prefiere una parte larga a
  un corte brusco, y dilo en la confianza.
- **Restricciones del usuario.** Si al lanzar la skill dice "en 2 partes",
  "máximo 45 min" o similar, se respeta. Si eso obliga a un corte malo, no lo
  escondas: confianza baja y una frase estructural explicando por qué.
- Para valorar la duración de la última parte necesitas la duración total: usa
  el `runtime` que dé el usuario o, si no, la duración de TMDB (solo para estimar).

## Dónde cae exactamente el corte

No ves la película: solo sabes cuándo se habla. Un cambio de escena cae siempre
en un hueco entre dos subtítulos.

- El `timestamp` es el **final de la última frase de la escena que acaba**. El
  script ya redondea los finales al segundo siguiente: copia esa hora tal cual.
  Así nunca se entra en la escena siguiente.
- La **ventana** es ese hueco hasta la primera frase de la escena nueva. Hueco
  corto = corte preciso. Hueco largo = el usuario tendrá que afinar a ojo;
  cuenta en contra de la confianza.
- Las anotaciones para sordos (`[door slams]`, `♪ music ♪`) son tu única pista
  de lo que pasa sin diálogo. Úsalas cuando existan.
- Entre dos cortes de calidad narrativa pareja, elige el de hueco más limpio.
  Es un desempate, nunca pasa por delante de lo narrativo.
- **Escenas coletilla.** Si entre dos huecos hay una escena brevísima (un par
  de frases, menos de ~30 s) que remata lo anterior, pertenece a la parte que
  cierra: corta después de ella aunque el hueco anterior sea más limpio, y
  avísalo en la propuesta para que el usuario no pare antes de tiempo.
- **Ventanas mínimas.** Una ventana de menos de ~6 s es un corte seco: preciso,
  pero sin margen si la copia va desplazada unos segundos. No baja la confianza
  del corte, pero dilo en los avisos: ahí manda el cue, no el reloj.

## Pasos

### 1. Leer los subtítulos

El usuario adjunta el archivo en el chat o da su ruta. **Nunca lo copies dentro del repo** ni
escribas su contenido en ningún fichero del proyecto. Compáctalo a un fichero
temporal fuera del repo (el scratchpad de la sesión si existe, o `mktemp -d`):

```bash
node .claude/skills/slice-movie/scripts/compact-subs.mjs "<adjunto>" --out "<tmp>/subs.txt"
```

La salida trae un resumen, las líneas descartadas como basura del subtitulador,
los huecos sin diálogo más largos y la transcripción con una línea por
subtítulo (`HH:MM:SS–HH:MM:SS texto`). Los silencios de 6 s o más tienen línea
propia en su sitio; los de 2 a 5 s van anotados al final de la línea, como
`(+4 s)`: es la ventana hasta la frase siguiente. Si el resumen avisa de líneas
con caracteres rotos, no uses texto de esas líneas en títulos ni cues.

**Lee la transcripción entera**, por tramos si pasa de 2000 líneas. No cortes
una película que no has leído completa: el gancho de un corte depende de lo que
viene después. Revisa la lista de basura por si se ha descartado diálogo real.

### 2. Identificar la película

- Si el usuario da el ID de TMDB, úsalo.
- Si no: deduce título y año del nombre del archivo
  (`Heat.1995.1080p.BluRay.srt`) o, si no ayuda, de los diálogos. Busca en la
  web su página de TMDB y saca el ID de la URL
  (`themoviedb.org/movie/949-heat` → `949`). **No leas `.env` ni uses el token
  de TMDB.** Apunta también la duración que da TMDB.
- Slug: título original en inglés de TMDB, minúsculas con guiones, más el año:
  `heat-1995.json`. Con edición: `heat-1995-extended.json`.
- `edition` solo si el usuario la indica o el nombre del archivo lo deja claro
  (`Extended.Cut`). `runtime` solo si el usuario da la duración exacta de su copia.
  **Nunca escribas en el JSON la duración de TMDB.**

Párate y pregunta antes de seguir si:

- hay ambigüedad (remake, títulos homónimos, nombre de archivo ilegible);
- `movies/<slug>-<año>.json` ya existe: ¿otra edición o sobrescribir?;
- **los tiempos no cuadran**: lo normal es que el último subtítulo caiga entre
  5 y 15 minutos antes de la duración de TMDB (los créditos). Sospecha si cae
  después de esa duración, si cae más de ~20 minutos antes, o si el primer
  diálogo llega absurdamente tarde. Suele ser otra edición o un archivo
  desincronizado, y todos los cortes saldrían mal.
  Enseña los datos ("TMDB: 170 min; último subtítulo: 03:24:10 — ¿versión
  extendida?") y espera;
- el script falla (formato `.ass`, archivo vacío o ilegible) o aquello no es una
  película (un episodio de serie, varias películas en un archivo).

### 3. Elegir los cortes

Aplica el criterio. Anota para ti los candidatos, con su trama; nada de eso
sale al chat. Si existe otra división de calidad **realmente cercana** con
distinto número de partes, guárdala como alternativa. Si no existe, no la
inventes.

### 4. Títulos y cues

Lee `docs/JSON_FORMAT.md` en cada ejecución: es la referencia del formato y de
la regla de los cues. No te fíes de tu memoria del formato. Su ejemplo usa una
película real: tómalo solo como muestra de formato, no como modelo de dónde
cortar ni de cómo titular.

**Títulos** (siempre visibles en la app): como capítulos de una miniserie, 1–5
palabras. Pueden ser una frase o nombre del diálogo, un lugar, una imagen.
Prueba que deben pasar: *leído antes de ver la parte no dice nada; leído
después, encaja*. Ni descripciones ("El atraco sale mal") ni adelantos ("La
traición", "El funeral"). Escríbelos naturales en cada idioma, sin traducir
palabra por palabra; un nombre propio o una cita que se mantiene en original
queda igual en los dos. La frase puede oírse por primera vez en otra parte,
mientras pase la prueba. Prepara 1–2 alternativas por parte, también para la
última.

**Cues** (todas las partes menos la última): describen lo que **se ve y se
oye** en el corte, nunca lo que pasa ni lo que significa. Vale: el lugar, quién
está en pantalla, un objeto, un gesto, un fundido, un cambio de música. No
vale: revelaciones, muertes, giros, quién gana, emociones que delaten el
desenlace, frases de diálogo con información de trama. Como el `timestamp` es
el final de la última frase, el cue también dice qué hacer desde ahí: parar en
el primer cambio de escena; si se oye diálogo nuevo, te has pasado. Para eso
puedes citar la primera frase de la escena siguiente **solo si es inocua**
(un saludo, una fórmula, nada con nombres, datos ni trama): como no ves la
imagen, es el marcador más fiable de "te has pasado".

- Bien: "Termina tras la escena del coche, de noche. Para en el primer cambio
  de escena; si oyes un 'Good morning, everyone', te has pasado."
- Mal: "Termina cuando descubren que la carta era falsa."

### 5. La propuesta

Todavía no escribas ningún fichero. Presenta esto en el chat, en el idioma en
que te hable el usuario (la plantilla está en español):

```
**Título (Año) · TMDB 000 · `titulo-año.json`**
Duración usada para estimar: 170 min (TMDB, créditos incluidos) · 3 partes

**Parte 1 — "Título" / "Title"** · hasta 00:52:14 · 52 min
Alternativas: "…" / "…" · "…" / "…"
Corte: cierre de secuencia con cambio de localización; gancho fuerte.
Ventana sin diálogo: 00:52:14 → 00:52:51 (37 s) · Confianza: alta
Descartado: 00:47:30 (ventana 14 s) — cambio de escena más limpio, gancho menor.   ← solo si hubo un candidato parejo
Cue: "…" / "…"

**Parte 2 — …**

**Parte 3 — "Título" / "Title"** · hasta el final · ~58 min (unos 48 sin créditos)
Alternativas: "…" / "…"

Alternativa: 4 partes (38/41/35/44 min); el corte 2 es más flojo.   ← solo si existe
Sin `runtime`: la última parte saldrá aproximada. Si me das la duración exacta de tu copia, la añado.
Avisos: …   ← ventanas mínimas, escenas coletilla, tramos largos sin diálogo, partes fuera de rango, basura dudosa
```

La confianza (alta / media / baja) resume calidad narrativa del corte y
limpieza del hueco. Sé honesto: un corte de confianza media es el que el
usuario debe vigilar mientras ve la película.

Espera su respuesta. Aplica los cambios que pida (otro título, "enséñame la
alternativa", "prueba con 4 partes") y vuelve a presentar lo que cambie. Su
"ok" confirma también el ID y el nombre del fichero.

### 6. Escribir, validar y commit

Solo tras el "ok":

1. Escribe `movies/<slug>-<año>.json` con el estilo de los ficheros existentes.
   La última parte usa `"timestamp": "END"` y no lleva cue.
2. `npm run validate`. Si falla, corrige y repite. Si sigue fallando, **no hay
   commit**: explica qué falla.
3. `npm run sync` para que la app tenga los datos de TMDB de la película nueva.
   El script usa el token por su cuenta; tú sigues sin leer `.env`. Si falla
   (sin token o sin conexión), avisa y sigue: no bloquea el commit, y el deploy
   hace su propio sync.
4. Commit automático en `main`, solo de ese fichero, sin push:
   `git add movies/<fichero>` (nunca `git add .`) y mensaje en inglés
   `Add Heat (1995)`, con la atribución de coautoría habitual. Sin spoilers en
   el mensaje.
5. Borra el fichero temporal de los subtítulos compactados.

**Ajustes posteriores** (tras ver la película: "mueve el corte 2 a 00:54:10",
añadir el `runtime`): edita, valida y haz un commit pequeño aparte,
`Adjust Heat (1995) cut 2`.

## Casos raros

Avisa en la propuesta y sigue (solo degradan un corte):

- Basura del subtitulador: el script ya la descarta.
- Película corta: propone las partes que salgan aunque alguna baje de 30 min.
  Si no admite ningún corte digno, una sola parte con `"END"` es válida;
  explícalo.
- Zona sin ningún corte bueno: parte larga antes que corte brusco.
- Tramos largos sin diálogo: avisa de que ahí no ves nada, sin contar trama.

Párate y pregunta (invalidan todos los tiempos): los de la lista del paso 2.
Un JSON con los cortes desplazados es peor que no tener JSON.
