# Archivos de película y validación

Cada película del catálogo es un archivo JSON en la carpeta de películas que solo guarda lo que TMDB no sabe: dónde están los cortes. Para añadir una película basta con dejar su archivo en la carpeta; no hay ningún índice que mantener. Las mismas reglas de formato se comprueban en la web, que marca los archivos no válidos sin dejar de funcionar, y desde la línea de comandos, que se ejecuta antes de cada build.

## Un archivo por película
- Cada archivo `.json` de la carpeta de películas aparece en el catálogo; los archivos con otra extensión se ignoran.
- El nombre del archivo sin la extensión es el identificador de la película y forma su dirección: `/movie/<nombre>`. Si la dirección no corresponde a ningún archivo, se muestra la página de no encontrado.
- Convención de nombre: `<nombre-legible>-<año>.json`, en minúsculas y con guiones. Dos ediciones de la misma película son dos archivos distintos (por ejemplo, con el sufijo `-extended`).
- Título, póster, sinopsis y año no se escriben en el archivo: llegan de TMDB a través del `tmdbId`.

- Origen: documentación inicial (2026-10-25)

## Reglas del formato de un archivo
Un archivo es válido solo si cumple todas estas reglas:

- **Contenido**: un objeto JSON.
- **`tmdbId`**: obligatorio. Vale cualquier valor salvo ausente, nulo o texto vacío; no se comprueba si es número o texto.
- **`edition`** (edición): opcional. Si aparece, debe ser un texto no vacío (solo espacios cuenta como vacío). No se traduce.
- **`runtime`** (duración total de la copia usada para marcar los cortes): opcional. Formato `HH:MM:SS` y debe ser posterior al último corte. Si solo hay una parte, basta con que sea mayor que `00:00:00`.
- **`episodes`** (partes): lista con al menos una parte. No hay más límite: una película de una sola parte es válida.
- **Cada parte**: debe ser un objeto JSON. Si no lo es (un texto o un número, por ejemplo), se informa solo ese error para esa parte y no se revisan sus demás reglas.
- **Título de cada parte**: obligatorio, con texto no vacío en español (`es`) y en inglés (`en`).
- **Pista (`cue`) de cada parte**: opcional; si aparece, también necesita texto no vacío en los dos idiomas.
- **Marca de tiempo de cada parte**: indica dónde **termina** la parte. Formato `HH:MM:SS` con dos dígitos por campo y minutos y segundos por debajo de 60 (`"00:52:40"`, no `"52:40"`), o `END`.
  - Las marcas van en orden estrictamente creciente y la primera debe ser posterior a `00:00:00`.
  - La última parte debe usar `END`, y solo ella puede usarlo.
- No existe hora de inicio: cada parte empieza donde acaba la anterior y la primera empieza en `00:00:00`, así que no puede haber huecos ni solapes.

Los errores se informan por archivo y, cuando procede, por parte (`Episode N`). Si `episodes` falta o está vacío, no se revisan las reglas de las partes ni la de que la duración sea posterior al último corte; el formato `HH:MM:SS` de `runtime` sí se sigue comprobando. Los mensajes de error están siempre en inglés, sea cual sea el idioma de la interfaz.

- Origen: documentación inicial (2026-10-25)

## Ediciones de una misma película
- Dos archivos pueden compartir `tmdbId` solo si sus ediciones son distintas.
- La comparación de ediciones no distingue mayúsculas y descarta los espacios al principio y al final (`"Extended"` y `" extended "` chocan; los espacios intermedios sí cuentan).
- Un archivo sin edición cuenta como «sin edición»: solo uno de los archivos que comparten `tmdbId` puede omitirla.
- El `tmdbId` se compara como texto, así que `2059` y `"2059"` se consideran el mismo.
- Si dos archivos chocan, los dos pasan a ser no válidos y cada uno indica con qué otro archivo coincide.
- Esta regla solo se aplica entre archivos que ya cumplen las reglas individuales.

- Origen: documentación inicial (2026-10-25)

## Archivos no válidos en la web
Un archivo con JSON roto o que incumple alguna regla no rompe la web:

- **En el catálogo**: su tarjeta sigue apareciendo, con el nombre del archivo como título, sin año ni número de partes, y con la marca «Fichero no válido» / «Invalid file». No se consultan sus datos en TMDB.
- **En su ficha**: se muestra el nombre del archivo (`<nombre>.json`), un aviso «Fichero no válido» con la lista de errores y la indicación «Corrige el fichero y ejecuta npm run validate.».
- Si el JSON está mal escrito, el único error que se muestra es `Invalid JSON:` seguido del detalle del fallo de lectura.

- Origen: documentación inicial (2026-10-25)

## Validación por línea de comandos
- `npm run validate` revisa todos los archivos `.json` de la carpeta, en orden alfabético, con las mismas reglas que la web.
- Por cada archivo muestra `ok` o `FAIL`; en los fallidos lista debajo cada error.
- Al final resume `N movie file(s) valid.` o `X of N movie file(s) have errors.`.
- Termina con fallo si algún archivo tiene problemas.
- Se ejecuta automáticamente antes de cada build: si falla, el build no continúa. Arrancar el servidor de desarrollo no la ejecuta.

- Origen: documentación inicial (2026-10-25)
