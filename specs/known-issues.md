# Problemas conocidos

<!-- Managed by dev-workflows. One section per issue; ids are never reused. Status: open | fixed | wontfix -->

## KI-001 — Al volver atrás, la posición del catálogo se recorta si la página aún no tiene su altura final
- **Severity:** medium
- **Status:** open
- **Location:** `src/components/Layout.tsx:15`
- **Found:** 2026-10-25 by fix/catalogue-scroll-restore (review, hallazgo F-1)
- **GitHub:** -

El arreglo de R-1 deja de reiniciar el scroll en navegaciones POP y confía en la restauración nativa del navegador. Esa restauración se aplica antes de que el catálogo tenga su altura final: en Chromium contra el primer render (títulos en esqueleto, orden por slug, más bajo que el final) y en Safari/Firefox, según el orden del estándar, contra la ficha que aún está montada. La posición guardada se recorta a la altura disponible. Medido en Chromium: 559→498 px a 360×420, 340→193 px a 800×400; a 360×640 se conserva. Hoy, con 3 películas, la tarjeta abierta sigue a la vista en el caso habitual; empeorará cuando el catálogo crezca.

Arreglo sugerido: guardar `window.scrollY` por `location.key` (sessionStorage, en PUSH/REPLACE y en `pagehide`), poner `history.scrollRestoration = 'manual'` y reaplicar la posición en POP cuando el catálogo tenga su layout final (tras cargar `details`). Añadir un test e2e donde la ficha sea más corta que el desplazamiento guardado. Se descartó en el bugfix por decisión de alcance (arreglo mínimo).
