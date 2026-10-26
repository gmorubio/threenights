# Datos de TMDB y publicación

Toda la información descriptiva de cada película (pósteres, fondos, títulos, año, duración, géneros, valoración, sinopsis, dirección y reparto) viene de TMDB, en español y en inglés. El navegador nunca consulta TMDB: antes de servir o publicar la web, un paso de sincronización descarga los datos con el token del propietario, y la web solo lee el resultado. Así el token no llega nunca al sitio publicado.

## Datos que se muestran
Por cada película se obtienen dos versiones, una en español (es-ES) y otra en inglés (en-US), y la web muestra la del idioma elegido.

- **Título** y, en la ficha, el **título original** si es distinto. Si TMDB no da título, se usa el original; si tampoco hay datos, se muestra el nombre del fichero de la película.
- **Año** de estreno.
- **Duración**: la de TMDB solo se usa si el fichero de la película no indica una propia; en ese caso la duración de la última parte se marca como aproximada.
- **Géneros**, en el idioma elegido.
- **Valoración** sobre 10, con un decimal. Solo aparece si la película tiene votos en TMDB y una media mayor que 0.
- **Dirección**: todas las personas con el cargo de director.
- **Reparto**: hasta 6 personas, en el orden de los créditos de TMDB, con el personaje si se conoce.
- **Póster**: en el catálogo y en la ficha (a mayor tamaño). Si no hay póster, o la imagen no llega a cargar (por ejemplo, sin conexión con el servidor de imágenes de TMDB), se muestra un recuadro con el título. Si al cambiar de idioma el póster es otro, se vuelve a intentar cargar.
- **Fondo**: imagen de cabecera de la ficha. Si no hay, la cabecera aparece sin imagen.

- Origen: documentación inicial (2026-10-25); fix/ki-008-poster-fallback

## Sinopsis en el otro idioma
- Si la sinopsis falta en el idioma elegido, se usa la del otro idioma y debajo aparece la nota «TMDB no tiene la sinopsis en español. Se muestra en inglés.» (o su equivalente en inglés).
- Si no existe en ningún idioma, se muestra «TMDB no tiene sinopsis de esta película.».

- Origen: documentación inicial (2026-10-25)

## Sincronización
- Descarga los datos de cada identificador de TMDB distinto que aparezca en los ficheros de la carpeta movies. Se omiten los ficheros que no son JSON legible o que no tienen tmdbId (se informan en la validación) y también aquellos cuyo tmdbId no es número ni texto, o es texto en blanco. Estos últimos pasan la validación sin aviso y la web los muestra siempre con «Faltan los datos de TMDB», aunque se vuelva a sincronizar. Un fichero con otros errores de validación también se sincroniza, aunque la web lo muestre como «Fichero no válido». Las ediciones distintas de la misma película comparten los datos.
- Los datos quedan congelados hasta la siguiente sincronización: los cambios en TMDB no se ven en la web hasta volver a sincronizar y publicar.
- Si TMDB no conoce una película en alguno de los dos idiomas, esa película queda marcada como «no encontrada».
- Cualquier otro fallo detiene la sincronización entera, con un mensaje claro: falta el token, el token no es válido (se recuerda que hace falta el token de acceso de lectura completo, no la clave corta), no hay conexión con TMDB o TMDB responde con error. En ese caso no se sobrescriben los datos anteriores.
- **Entorno de desarrollo**: al arrancarlo, la sincronización se ejecuta en modo suave. Si falla, solo muestra un aviso y la web arranca con los datos de la última sincronización (o sin datos, si nunca se sincronizó).
- **Build y publicación**: la sincronización es obligatoria. Si falla, el build se detiene.

- Origen: documentación inicial (2026-10-25)

## Errores visibles en la web
| Situación | Título del aviso | Qué indica |
|---|---|---|
| La película no tiene datos sincronizados (añadida después de la última sincronización, o nunca se sincronizó) | «Faltan los datos de TMDB» | Volver a sincronizar con el token de lectura configurado. |
| TMDB no tiene esa película | «TMDB no conoce esta película» | Revisar el identificador de TMDB del fichero y volver a sincronizar. |

- **Ficha de película**: el aviso aparece sobre la lista de partes; la ficha sigue mostrando las partes y usa el nombre del fichero como título.
- **Catálogo**: cada tarjeta afectada muestra el título del aviso como etiqueta. Si a todas las películas les faltan datos sincronizados, se muestra un único aviso encima de la cuadrícula en lugar de una etiqueta en cada tarjeta.

- Origen: documentación inicial (2026-10-25)

## Protección del token al publicar
- Después de cada build se revisan todos los archivos del sitio generado. Si el token aparece en alguno, el build falla con el mensaje de que el token está dentro del sitio y la lista de archivos afectados. El token nunca se muestra.
- Si no hay token configurado en ese momento, la comprobación no tiene nada que buscar y se da por superada.
- Si hay token configurado y se ejecuta la comprobación sin haber generado antes el sitio, falla pidiendo hacer primero el build. Sin token se da por superada aunque no exista el sitio.

- Origen: documentación inicial (2026-10-25)

## Atribución a TMDB
En el pie de todas las páginas aparece el logotipo de TMDB, que enlaza a su web en una pestaña nueva, y el aviso «Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.» (en inglés si ese es el idioma elegido).

- Origen: documentación inicial (2026-10-25)
