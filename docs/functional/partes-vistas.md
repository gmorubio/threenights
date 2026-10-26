# Partes vistas y progreso

El espectador puede marcar cada parte de una película como vista. La ficha atenúa las partes vistas, destaca la siguiente que toca y resume cuántas lleva; el catálogo muestra el progreso sobre el póster de cada tarjeta. El progreso se guarda solo en el navegador: no hay cuentas, backend ni sincronización entre dispositivos.

## Marcar y desmarcar una parte
- Cada parte de la ficha tiene un botón «Vista» / «Watched», bajo la línea de duración y «Empieza en». Aparece en todas las partes de un fichero válido, haya o no datos de TMDB.
- Sin marcar se ve «○ Vista» con contorno; marcada, «✓ Vista» con relleno de color de acento. Un clic alterna el estado. Cada parte es independiente: se pueden marcar en cualquier orden, sin que marcar una marque las anteriores.
- Para lectores de pantalla el botón se llama siempre «Vista, Parte N» / «Watched, Night N» y anuncia si está pulsado.
- Cambiar de idioma no cambia lo marcado; solo se traducen los textos.
- No hay acción para desmarcar todo ni para reiniciar el progreso: se desmarca parte a parte.

- Origen: specs/watched-parts.md

## Progreso en la ficha
- **Parte vista.** Su etiqueta «Parte N», su título y su hora de corte se ven atenuados. El resto (duración, «Empieza en», «Corta en» / «Hasta el final», aviso de spoiler y el propio botón) se mantiene a plena intensidad, y su pista de corte sigue funcionando igual.
- **Parte siguiente.** Es la primera parte sin ver, en orden, aunque haya partes posteriores vistas (por ejemplo, con la 1 y la 3 vistas, la siguiente es la 2). Se distingue con un borde de acento a la izquierda y la etiqueta «Siguiente» / «Up next» junto a «Parte N». Solo se destaca si hay al menos una parte vista y al menos una sin ver: sin progreso, o con todas vistas, ninguna parte lleva «Siguiente».
- La ficha no se desplaza sola hasta la parte siguiente ni abre su pista.
- **Resumen.** En el encabezado «Partes», tras el número de partes, aparece «· 1 vista» / «· N vistas» («1 watched» / «N watched»), solo si hay al menos una parte vista.
- El póster de la ficha no muestra progreso.

- Origen: specs/watched-parts.md

## Progreso en el catálogo
- Si una película tiene al menos una parte vista, su tarjeta muestra una barra fina pegada al borde inferior del póster, con un segmento por parte: de color de acento si está vista y translúcido si no. Con todas vistas, la barra queda entera rellena, sin otra insignia.
- Sin partes vistas no hay barra.
- La barra aparece también sobre el hueco de carga y sobre el recuadro que sustituye al póster (sin póster o con la imagen sin cargar), y se eleva junto con el póster al pasar el ratón o enfocar la tarjeta. Solo informa: no tiene acción propia (al pulsarla se abre la ficha, como con el resto de la tarjeta) y los lectores de pantalla no la anuncian; el progreso se lee en el texto del enlace.
- Para lectores de pantalla, el enlace de la tarjeta incluye el texto «1 de 3 partes vistas» («1 de 1 parte vista» si solo tiene una; en inglés «1 of 3 nights watched» / «1 of 1 night watched»).
- El progreso no cambia el orden del catálogo, que sigue siendo alfabético.

- Origen: specs/watched-parts.md; fix/ki-008-poster-fallback

## Dónde se guarda y cuánto dura
- El progreso se recuerda en el navegador y sobrevive a recargas y a nuevas visitas. Es propio de cada navegador y dispositivo: no se comparte entre ellos.
- **Varias pestañas.** Si la misma web está abierta en varias pestañas del mismo navegador, lo marcado en una aparece en las demás sin recargar, y las marcas hechas en distintas pestañas se suman sin pisarse. También se pone al día al volver a la web con Atrás/Adelante desde otro sitio.
- **Almacenamiento bloqueado.** Si el navegador no permite guardar, marcar funciona igual durante la vida de la pestaña, sin avisos ni errores, pero al recargar se pierde todo.
- **Fallo puntual al guardar.** Si una escritura falla (por ejemplo, almacenamiento lleno), la marca se mantiene en la pestaña y se guarda con la siguiente escritura que funcione. Caso límite: mientras tanto, esa marca se vuelve a imponer sobre lo que otras pestañas hayan cambiado después en la misma parte.
- **Datos guardados dañados.** Si lo guardado no se puede leer o tiene un formato inesperado, se ignora sin fallar (se descartan las entradas no válidas y se conservan las válidas) y la siguiente marca lo sobrescribe con un valor correcto.
- **Fichero no válido.** Una película cuyo fichero no es válido no muestra botones, barra ni resumen, aunque tenga progreso guardado.

- Origen: specs/watched-parts.md

## Límites conocidos
- El progreso se asocia a cada parte por su posición dentro de la película identificada por el nombre de su fichero, no por su tmdbId (varias ediciones de la misma película llevan progresos separados).
- Si se renombra el fichero de una película, su progreso se pierde.
- Si cambian los cortes de una película, el progreso guardado puede señalar partes distintas. Si la película pasa a tener menos partes, las marcas de las partes que ya no existen no cuentan para la barra, el resumen ni la parte siguiente, pero no se borran: vuelven a contar si la película recupera esas partes.

- Origen: specs/watched-parts.md
