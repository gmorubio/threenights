# Cortes asistidos con Claude Code

Herramienta para el propietario del catálogo, no para quien ve las películas en la app. Dentro de Claude Code, el propietario adjunta el archivo de subtítulos de su copia de una película y el asistente le propone cómo dividirla en noches, como si fuera una miniserie, sin hacerle spoilers. Cuando el propietario da el visto bueno, la película queda añadida al catálogo con un commit local.

## Activación
- Se activa al adjuntar un archivo de subtítulos o al pedirlo con frases como «divide esta película», «hazme los cortes de», «nueva película», «añade esta peli» o «slice», aunque no se diga casi nada más.
- También sirve para retocar una película ya dividida («mueve el corte 2», «explícame el corte 2 con spoilers»).
- No sirve para editar a mano el archivo de una película por otros motivos ni para trabajar en la app.

- Origen: documentación inicial (2026-10-25)

## Lectura de los subtítulos
- Formatos admitidos: `.srt` y `.vtt`. Acepta archivos en UTF-8, UTF-16 little-endian con BOM (el habitual de Windows) y codificaciones antiguas (Latin-1). Otras variantes de UTF-16 hay que convertirlas antes a UTF-8.
- Los subtítulos nunca se copian al proyecto: se trabaja con una copia resumida temporal fuera del repositorio, que se borra después del commit. Si el proceso no llega al commit, puede quedarse en la carpeta temporal.
- Descarta automáticamente las líneas de propaganda del subtitulador (webs, créditos de sincronización o traducción) y revisa la lista por si se ha descartado diálogo real.
- Lee la transcripción completa antes de proponer nada.
- Se detiene con un error claro si el archivo está vacío, es ilegible, es `.ass`/`.ssa` (hay que convertirlo antes a `.srt`), no contiene subtítulos o todo parece basura.
- Si hay líneas con caracteres rotos, no usa su texto en títulos ni pistas.

- Origen: documentación inicial (2026-10-25)

## Identificación de la película
- Usa el ID de TMDB si el propietario lo da; si no, deduce título y año del nombre del archivo o de los diálogos y busca el ID en la web.
- Nombre del archivo: título original en inglés, en minúsculas con guiones, más el año (`heat-1995`), y la edición si la hay (`heat-1995-extended`).
- La edición solo se anota si el propietario la indica o el nombre del archivo la deja clara. La duración exacta solo se anota si el propietario da la de su copia; la de TMDB se usa únicamente para estimar y nunca se guarda.
- Se para y pregunta antes de seguir cuando:
  - hay ambigüedad (remakes, títulos homónimos, nombre de archivo ilegible);
  - ya existe una película con ese nombre (¿otra edición o sobrescribir?);
  - los tiempos no cuadran con la duración de TMDB (el último subtítulo cae después de ella o más de unos 20 minutos antes, o el primer diálogo llega muy tarde), lo que suele indicar otra edición o un archivo desincronizado; muestra los datos y espera;
  - el archivo no es una película (un episodio de serie, varias películas).

- Origen: documentación inicial (2026-10-25)

## Criterio de corte
- Cada corte cae siempre en un cambio de escena lo bastante importante para cerrar una noche, nunca de forma brusca.
- Cuando es posible, el corte deja un momento de suspense que invite a seguir.
- Cuando la historia lo permite, cada noche dura entre 30 y 60 minutos; el criterio narrativo manda sobre la duración. Si una zona no admite ningún corte digno, prefiere una noche larga a un corte brusco.
- El número de partes es libre: no hay preferencia por tres ni por ningún otro número. Una película sin ningún corte digno puede quedar en una sola parte.
- Se respetan las restricciones del propietario («en 2 partes», «máximo 45 min»); si obligan a un corte malo, se avisa con confianza baja.
- El tiempo de cada corte es el final de la última frase de la escena que acaba, redondeado al segundo siguiente, para no entrar nunca en la escena nueva.
- Si tras un corte hay una escena brevísima que remata la anterior, el corte se pone después de ella y se avisa.

- Origen: documentación inicial (2026-10-25)

## Sin spoilers
- Nada de trama llega al chat, a los títulos, a las pistas ni al mensaje del commit: ni qué pasa, ni quién muere o gana, ni sinopsis.
- Las justificaciones son solo estructurales («cambio de localización y salto temporal», «hueco limpio de 40 s»).
- Solo si el propietario lo pide expresamente explica la trama de un corte concreto, precedida de un aviso de spoilers, y solo de ese corte. El asistente nunca lo ofrece.

- Origen: documentación inicial (2026-10-25)

## Propuesta
Antes de escribir nada, el asistente presenta en el idioma del propietario:
- Película, año, ID de TMDB, nombre del archivo, duración usada para estimar y número de partes.
- Por cada parte: título en español e inglés con 1–2 alternativas, hora de fin y duración. Además, en todas menos la última: motivo estructural del corte, ventana sin diálogo tras el corte y grado de confianza (alta, media o baja). La última parte aparece como «hasta el final», con una duración aproximada (con y sin créditos).
- La pista en español e inglés para todas las partes menos la última: describe lo que se ve y se oye en el corte y cuándo parar (por ejemplo, «si oyes un “Good morning, everyone”, te has pasado»).
- Los candidatos descartados de calidad pareja, si los hubo.
- Una división alternativa con otro número de partes, solo si existe una de calidad realmente cercana.
- Avisos: ventanas sin diálogo muy cortas (menos de unos 6 s), escenas coletilla, tramos largos sin diálogo, partes fuera de 30–60 minutos, líneas descartadas como propaganda del subtitulador que podrían ser diálogo real («basura dudosa») y, si falta la duración exacta de la copia, que la última parte será aproximada.

Los títulos tienen 1–5 palabras, no describen ni adelantan nada y deben encajar después de ver la parte. El propietario puede pedir cambios (otro título, ver la alternativa, otro número de partes) y el asistente vuelve a presentar lo que cambie. Su «ok» confirma también el ID y el nombre del archivo.

- Origen: documentación inicial (2026-10-25)

## Guardado y commit
Solo tras el «ok»:
1. Escribe el archivo de la película; la última parte termina en el final de la película y no lleva pista.
2. Lo valida. Si la validación sigue fallando tras corregir, no hace commit y explica qué falla.
3. Actualiza localmente los datos de TMDB de todo el catálogo (incluida la película nueva) para que la app los muestre. Esos datos no se incluyen en el commit. Si falla (sin token o sin conexión), avisa y continúa: la publicación vuelve a descargarlos.
4. Hace commit en `main` solo de ese archivo, con el mensaje en inglés `Add <Título> (<Año>)`, sin spoilers y con la línea de coautoría del asistente.
5. Nunca hace push.

El asistente nunca lee las credenciales de TMDB.

- Origen: documentación inicial (2026-10-25)

## Ajustes posteriores
Tras ver la película, el propietario puede pedir mover un corte o añadir la duración exacta de su copia. El asistente edita, valida y hace un commit pequeño aparte (`Adjust <Título> (<Año>) cut N`), sin push.

- Origen: documentación inicial (2026-10-25)
