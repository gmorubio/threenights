# Catálogo

Página de inicio. Muestra el lema del producto y una cuadrícula con una tarjeta por cada fichero de película, ordenada alfabéticamente en el idioma activo. Desde cada tarjeta se abre la ficha de la película.

## Página de inicio
- Arriba aparece el lema en el idioma activo: «Películas para ver en varias noches, cortadas donde toca.» / «Movies to watch over a few nights, cut where it makes sense.»
- La pestaña del navegador muestra solo «Three Nights».
- Si no hay ningún fichero de película, en lugar de la cuadrícula se muestra: «Aún no hay películas. Añade un fichero JSON en la carpeta movies.»
- La cuadrícula se adapta al ancho de la pantalla: con pantallas estrechas las tarjetas son más pequeñas y hay menos por fila.

- Origen: documentación inicial (2026-10-25)

## Tarjeta de película
Cada tarjeta enlaza a la ficha de su película y muestra:
- **Póster.** Si la película no tiene póster, o la imagen no llega a cargar, aparece un recuadro con el título escrito en lugar de un marco vacío; si no hay datos de TMDB o el fichero no es válido, el recuadro muestra el nombre del fichero.
- **Título** en el idioma activo. Si no hay datos de TMDB, se muestra el nombre del fichero en tipografía monoespaciada.
- **Datos secundarios**, separados por «·»: año (solo si se conoce), número de partes («1 parte» / «N partes»; en inglés «1 night» / «N nights») y la edición, resaltada, si el fichero la indica.

- **Progreso**, si hay al menos una parte vista: barra segmentada sobre el borde inferior del póster (ver [Partes vistas y progreso](partes-vistas.md#progreso-en-el-catálogo)).

Al pasar el ratón o enfocar la tarjeta con el teclado, el póster (con su barra de progreso, si la tiene) se eleva ligeramente.

- Origen: documentación inicial (2026-10-25); progreso: specs/watched-parts.md; fix/ki-008-poster-fallback

## Carga
- Mientras se cargan los datos, cada película válida muestra un esqueleto animado en lugar del póster y del título; el número de partes y la edición ya son visibles.
- Las tarjetas de ficheros no válidos no tienen fase de carga: aparecen directamente.
- Al cambiar de idioma, los datos se vuelven a cargar: reaparecen los esqueletos y la cuadrícula se reordena con los títulos del nuevo idioma.

- Origen: documentación inicial (2026-10-25)

## Orden
- Para que la cuadrícula no se reordene durante la carga, se espera a tener todos los títulos y solo entonces se ordena. Mientras carga, las tarjetas siguen el orden de los ficheros.
- Se ordena alfabéticamente por el título en el idioma activo; las películas sin título (sin datos o con fichero no válido) se ordenan por el nombre de su fichero.
- Se ignora el artículo inicial del idioma activo si va seguido de más palabras: con español activo, el, la, los, las, un, una, unos, unas; con inglés activo, the, a, an. Ejemplo: en inglés «The Fabelmans» se ordena como «Fabelmans»; en español «Los Fabelman» se ordena como «Fabelman».
- No distingue mayúsculas ni acentos, y los números se ordenan de forma natural («2» antes que «10»).

- Origen: documentación inicial (2026-10-25)

## Errores
- **Fichero no válido.** La tarjeta muestra el nombre del fichero, sin año, partes ni edición, y la marca «Fichero no válido» / «Invalid file».
- **Sin datos de TMDB.** La tarjeta muestra el nombre del fichero y la marca del error: «Faltan los datos de TMDB» o «TMDB no conoce esta película». Mantiene el número de partes y la edición.
- **Error común a todas.** Si todas las películas válidas fallan con «Faltan los datos de TMDB», ese aviso aparece una sola vez encima de la cuadrícula, con la explicación de cómo sincronizar los datos, y no se repite en las tarjetas. El error «TMDB no conoce esta película» nunca se agrupa: siempre se marca en cada tarjeta.
- Cualquier fallo inesperado al cargar los datos se trata como «Faltan los datos de TMDB».

- Origen: documentación inicial (2026-10-25)
