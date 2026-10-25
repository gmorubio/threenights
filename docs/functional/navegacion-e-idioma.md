# Navegación, idioma y avisos

Marco común de todas las páginas: una cabecera para volver al inicio y elegir idioma, un pie con la atribución a TMDB, la página de «no encontrada» y la forma en que se muestran los avisos de error. También decide en qué idioma se ve la web y lo recuerda entre visitas.

## Estructura común
- Todas las páginas comparten cabecera y pie.
- Cabecera: la marca Three Nights (tres lunas y el nombre), que lleva al catálogo, y el selector de idioma. La cabecera queda fija arriba al desplazarse.
- Pie: logotipo de TMDB, que abre la web de TMDB en otra pestaña, y el aviso «Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB» (en inglés si ese es el idioma activo).
- Al cambiar de página la vista vuelve arriba del todo. Cambiar de idioma no mueve la posición.

- Origen: documentación inicial (2026-10-25)

## Selector de idioma
- Dos opciones, ES y EN. La opción activa aparece resaltada.
- Idioma inicial, por orden de preferencia:
  1. El que se eligió la última vez en ese navegador.
  2. Si no hay ninguno guardado, el del navegador: español si su idioma empieza por «es».
  3. En cualquier otro caso, inglés.
- Al elegir un idioma se recuerda para las siguientes visitas. Si el navegador no permite guardar la elección (por ejemplo, almacenamiento bloqueado), la web funciona igual, pero la próxima vez vuelve a decidir según el navegador.
- Al cambiar de idioma cambian al momento todos los textos de la interfaz, los títulos y datos de las películas que vienen de TMDB, y el orden del catálogo, que se recalcula según el idioma. También cambia el idioma declarado de la página.

- Origen: documentación inicial (2026-10-25)

## Título de la pestaña
- Catálogo: «Three Nights».
- Ficha de una película: «‹título de la película› · Three Nights», con el título en el idioma activo. Mientras se cargan los datos, si TMDB no los tiene o si el fichero de la película no es válido, se usa el identificador de la película en lugar del título.
- Dirección desconocida: «Aquí no hay nada · Three Nights» (en inglés, «Nothing here · Three Nights»).
- Ficha de una película que no existe: aunque se ve la página no encontrada, la pestaña muestra solo «Three Nights». Pasa a «Aquí no hay nada · Three Nights» / «Nothing here · Three Nights» únicamente si después se cambia de idioma.

- Origen: documentación inicial (2026-10-25)

## Página no encontrada
- Se muestra para cualquier dirección desconocida y para la ficha de una película que no existe.
- Contenido: «Aquí no hay nada», «No existe ninguna película con esa dirección» y un enlace «Catálogo» para volver al inicio (en inglés: «Nothing here», «There is no movie at this address», «Catalogue»).
- La cabecera y el pie siguen visibles.

- Origen: documentación inicial (2026-10-25)

## Avisos de error
- Los errores se muestran como alertas destacadas en color de aviso, con un título en negrita y una explicación debajo (que puede incluir una lista de problemas). Los lectores de pantalla las anuncian como alertas.
- Se usan para los problemas con los datos de TMDB (faltan los datos o TMDB no conoce la película) y para fichas de película con un fichero no válido.
- Títulos y explicaciones siguen el idioma activo. Excepción: en el aviso de fichero no válido, la lista de problemas (por ejemplo, «"tmdbId" is missing.» o «Invalid JSON: …») se muestra siempre en inglés, sea cual sea el idioma elegido; solo el título («Fichero no válido» / «Invalid file») y la indicación de corregir el fichero cambian de idioma.

- Origen: documentación inicial (2026-10-25)
