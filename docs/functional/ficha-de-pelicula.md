# Ficha de película y noches

Cada película del catálogo tiene su propia página. Ahí se ven sus datos (de TMDB y del archivo de la película) y, sobre todo, cómo está dividida en partes para verla en varias noches: dónde empieza y dónde corta cada una, cuánto dura y, si se quiere, una pista para reconocer el momento exacto del corte.

## Acceso y navegación
- Cada película tiene su propia dirección, basada en el nombre de su archivo.
- Un enlace «Catálogo» arriba del todo lleva de vuelta al catálogo.
- El título de la pestaña del navegador es «<título> · Three Nights». Mientras cargan los datos, si TMDB no los tiene o si el fichero no es válido, se usa el nombre del archivo en lugar del título. Si la dirección no corresponde a ninguna película, la pestaña muestra solo «Three Nights».
- Si la dirección no corresponde a ninguna película, aparece la página «Aquí no hay nada» («No existe ninguna película con esa dirección.») con un enlace al catálogo.
- Al cambiar de idioma se actualizan en el momento los textos de la interfaz, los datos de TMDB y los títulos y pistas de las partes.

- Origen: documentación inicial (2026-10-25)

## Cabecera de la película
- Imagen de fondo de la película detrás de la cabecera, si TMDB la tiene.
- Póster. Mientras cargan los datos se ve un hueco de carga; si no hay póster, se muestra un recuadro con el título.
- Título en el idioma activo. Si no se conoce (TMDB sin datos), se muestra el nombre del archivo en tipografía monoespaciada. Mientras carga, en su lugar aparece un hueco de carga.
- Título original debajo, solo si es distinto del título.
- Línea de datos, cada uno solo si se conoce:
  - Año.
  - Duración total redondeada al minuto («2 h 15 min», o «48 min» si dura menos de una hora; las horas exactas se muestran como «2 h 0 min»). Se toma la del archivo si la indica; si no, la de TMDB.
  - Géneros, separados por comas.
  - Valoración con una estrella y un decimal («★ 7.8»); no aparece si la película no tiene votos.
  - Edición, si el archivo la indica («Edición: Extendida»).
- «Dirección» seguida de los nombres de quienes la dirigen, separados por comas, solo si TMDB indica al menos un director.
- Sinopsis:
  - Se muestra en el idioma activo.
  - Si no existe en ese idioma pero sí en el otro, se muestra la del otro idioma con la nota «TMDB no tiene la sinopsis en español. Se muestra en inglés.» (o su equivalente en inglés).
  - Si no existe en ninguno, aparece «TMDB no tiene sinopsis de esta película.».
- En pantallas estrechas el póster y los datos se apilan en una sola columna.

- Origen: documentación inicial (2026-10-25)

## Partes (noches)
- Sección «Partes» con el número total («1 parte», «3 partes») y, si hay partes vistas, el resumen «· N vista(s)».
- Cada parte aparece numerada («Parte 1», «Parte 2»…; «Night 1»… en inglés) con:
  - Su título en el idioma activo. El título siempre está visible.
  - Su duración, redondeada al minuto («1 h 5 min» o «48 min»).
  - «Empieza en» con la hora de inicio.
  - «Corta en» con la hora de corte.
  - El botón «Vista» para marcarla como vista. Las partes vistas se atenúan y la primera sin ver se destaca como «Siguiente» (ver [Partes vistas y progreso](partes-vistas.md)).
- Las horas se muestran en formato H:MM:SS, como en un reproductor (por ejemplo «1:26:00»; las horas no llevan cero delante).
- La primera parte empieza en 0:00:00 y cada parte empieza exactamente donde terminó la anterior.
- La última parte muestra «Hasta el final» en lugar de «Corta en», con la hora final de la película debajo.
- Cómo se cierra la última parte:
  - Con la duración indicada en el archivo, si existe.
  - Si no, con la duración de TMDB. Como TMDB solo da minutos, la duración y la hora final de la última parte llevan «~» delante y bajo la lista aparece la nota «Duración de la última parte aproximada, según TMDB.».
  - Si no se conoce ninguna duración, la hora final aparece como «—» y la última parte no muestra duración.
- Si el archivo indica la duración, sobre la lista aparece la nota «Cortes marcados sobre una copia de H:MM:SS. Si la tuya dura otra cosa, guíate por las pistas.».
- Caso límite: si la duración de TMDB no es posterior al último corte, la última parte muestra «Hasta el final» con «—», sin duración, y la nota de duración aproximada sigue apareciendo.
- Los cortes intermedios desordenados o una duración del archivo anterior al último corte hacen que el fichero no sea válido (ver Archivo no válido).

- Origen: documentación inicial (2026-10-25); partes vistas: specs/watched-parts.md

## Pista de corte
- Solo las partes que tienen pista muestran este control.
- La pista empieza oculta tras el botón «Mostrar pista de corte», acompañado del aviso de spoiler «Describe el final de esta parte.».
- Al pulsarlo se muestra la pista, el botón pasa a «Ocultar pista» y el aviso de spoiler desaparece; vuelve a aparecer al ocultar la pista. Se puede mostrar y ocultar tantas veces como se quiera, de forma independiente en cada parte.
- La decisión no se guarda: al recargar o volver a la ficha, todas las pistas vuelven a estar ocultas.

- Origen: documentación inicial (2026-10-25)

## Reparto
- Sección «Reparto» con hasta 6 miembros, en el orden de importancia de TMDB.
- Cada miembro muestra su nombre y, si se conoce, «como <personaje>».
- La sección no aparece si no hay reparto o no hay datos de TMDB.

- Origen: documentación inicial (2026-10-25)

## Archivo no válido
- Si el archivo de la película no es válido, la ficha no muestra cabecera ni partes.
- En su lugar se ve el enlace al catálogo, el nombre del archivo («<nombre>.json») y un aviso «Fichero no válido» con la lista de errores encontrados y el texto de ayuda «Corrige el fichero y ejecuta npm run validate.».

- Origen: documentación inicial (2026-10-25)

## Fallo de TMDB
- Si no hay datos de TMDB para la película, aparece un aviso encima de las partes:
  - «Faltan los datos de TMDB», si aún no se han descargado, con instrucciones para descargarlos.
  - «TMDB no conoce esta película», si el identificador no existe en TMDB, con la indicación de revisar el identificador del archivo.
- La ficha sigue funcionando con lo que da el archivo: título sustituido por el nombre del archivo, póster sustituido por un recuadro con el nombre del archivo, edición, duración del archivo si existe, y todas las partes con sus horas y pistas.
- Sin duración en el archivo, la última parte queda sin cerrar («—»).
- No se muestran imagen de fondo, título original, año, sinopsis, dirección, géneros, valoración ni reparto.

- Origen: documentación inicial (2026-10-25)
