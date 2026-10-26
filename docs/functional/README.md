# Three Nights — documentación funcional

<!-- Current behaviour of the product as the code implements it today. Updated by /dev-workflows:ship. -->

Three Nights es una web estática, sin backend, que sirve de guía de cortes para ver películas como si fueran una miniserie. Cada película se divide en unas pocas «noches» (partes), cada una con un título, el momento exacto en que hay que parar y, opcionalmente, una pista sin spoilers que describe el último plano antes del corte. No reproduce vídeo: la película se ve en cualquier otro sitio y la guía queda abierta para saber cuándo pausar. Hay dos tipos de usuario: el **espectador**, que consulta el catálogo y la ficha de cada película en español o en inglés, y el **propietario** de su copia del repositorio, que mantiene el catálogo (añade un archivo por película, lo valida, sincroniza con TMDB pósteres, sinopsis, reparto y duración, y publica la web) y puede generar los cortes a partir de unos subtítulos con una skill de Claude Code.

## Áreas
| Área | Qué cubre |
|---|---|
| [Catálogo](catalogo.md) | Página de inicio: lema y cuadrícula de tarjetas (póster, título, año, número de partes, edición), orden alfabético por idioma sin artículos iniciales, esqueletos de carga, catálogo vacío, marcas de archivo no válido y de error de TMDB, aviso único si faltan todos los datos sincronizados, barra de progreso de partes vistas. |
| [Ficha de película y noches](ficha-de-pelicula.md) | Página de cada película: cabecera con datos de TMDB, sinopsis con respaldo en el otro idioma, lista de partes con duración, inicio y corte, última parte «hasta el final» o aproximada, pistas ocultas tras aviso de spoiler, botón «Vista» por parte, reparto (hasta 6), errores de archivo y de TMDB. |
| [Partes vistas y progreso](partes-vistas.md) | Botón «Vista» por parte, partes vistas atenuadas, parte «Siguiente», resumen en la ficha, barra de progreso y texto accesible en las tarjetas del catálogo, guardado en el navegador, sincronización entre pestañas, almacenamiento bloqueado o dañado y límites (renombrar ficheros o cambiar cortes). |
| [Archivos de película y validación](archivos-de-pelicula.md) | Un archivo JSON por película cuyo nombre (minúsculas, dígitos y guiones) es su identificador en la dirección; reglas del formato (tmdbId, edición, duración, partes, títulos y pistas bilingües, marcas de tiempo, END), regla de tmdbId repetido entre archivos, comportamiento ante archivos no válidos y validación por línea de comandos antes de cada build. |
| [Datos de TMDB y publicación](datos-tmdb.md) | Qué datos llegan de TMDB en español e inglés, sincronización previa (suave al desarrollar, obligatoria en el build; peticiones limitadas, con tiempo máximo y reintentos), estados de error visibles, comprobación de que el token no se publica y atribución a TMDB. |
| [Navegación, idioma y avisos](navegacion-e-idioma.md) | Cabecera con marca y selector ES/EN, pie con atribución, vuelta arriba al cambiar de página y posición conservada con Atrás/Adelante o al recargar, elección y recuerdo del idioma, título de la pestaña, página de no encontrada y formato de los avisos de error. |
| [Cortes asistidos con Claude Code](cortes-asistidos.md) | Skill para el propietario que, a partir de subtítulos .srt o .vtt, propone las noches sin spoilers (cortes en cambio de escena, 30–60 min cuando se puede), admite cambios y, tras el «ok», escribe, valida, sincroniza y hace commit del archivo, sin push. |

## Glosario
- **Noche / parte** — Cada uno de los tramos en que se divide una película para verla en sesiones distintas. En inglés, «night».
- **Corte** — Momento exacto (H:MM:SS) en que termina una parte y empieza la siguiente.
- **END** — Marca que usa la última parte en lugar de un tiempo: dura hasta el final de la película.
- **Pista** — Texto opcional sin spoilers que describe el último plano antes del corte, para reconocerlo al verlo.
- **Parte vista** — Parte que el espectador ha marcado con el botón «Vista»; se recuerda en su navegador.
- **Parte siguiente** — Primera parte sin ver de una película que ya tiene alguna vista; la ficha la destaca con «Siguiente».
- **Edición** — Versión concreta de una película (por ejemplo, montaje extendido); permite tener varios archivos con el mismo tmdbId.
- **Duración de la copia** — Duración total de la copia usada para marcar los cortes; si falta, se usa la de TMDB como valor aproximado.
- **Archivo de película** — Archivo JSON con los cortes de una película; su nombre es el identificador que aparece en la dirección.
- **tmdbId** — Identificador de la película en TMDB, del que salen póster, sinopsis, reparto y demás datos.
- **Sincronización** — Paso previo que descarga de TMDB los datos de todas las películas con el token del propietario; la web solo lee su resultado.
- **Propietario** — Quien mantiene su propia copia del repositorio y su catálogo.
- **Espectador** — Quien consulta la web publicada.
