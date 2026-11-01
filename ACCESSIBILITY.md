# Declaración de accesibilidad

nav-miniplayer quiere ser usable con teclado, con lector de pantalla y por personas sensibles al movimiento o con poca visión. El objetivo es el nivel **WCAG 2.2 AA**. No lo damos por cumplido: este documento dice qué existe, qué se comprueba de forma automática y qué falta por verificar.

## Alcance
- Reproductor flotante (tarjeta) y sus cuatro diseños: Glass, Noir, CRT y Metal.
- Menú contextual del reproductor.
- Ventana aparte del reproductor.
- Página de Ajustes.

No cubre las páginas web donde se inyecta el reproductor ni los controles propios de cada sitio.

## Qué hay hoy
- **Teclado.** La tarjeta recibe el foco (`tabindex="0"`) y responde a `Espacio` o `K` (reproducir/pausar), `←`/`→` (retroceder/avanzar) y `Esc` (ocultar). Con el foco en un botón, `Espacio` y `Intro` activan ese botón. Con el menú abierto, `Esc` lo cierra y devuelve el foco a la tarjeta. La tarjeta declara sus atajos con `aria-keyshortcuts`.
- **Atajos globales.** Los comandos del navegador (reproducir/pausar, saltos, mostrar u ocultar, abrir la ventana aparte, pista anterior y siguiente) se reasignan en `chrome://extensions/shortcuts`. Valen aunque el foco esté fuera de la tarjeta.
- **Roles y etiquetas.** La tarjeta es una región con nombre. Los botones llevan `aria-label` y `title` traducidos. El botón de carátula usa `aria-pressed`. Las barras de progreso son `role="slider"` con `aria-valuemin`, `aria-valuemax`, `aria-valuenow` y `aria-valuetext`. Los iconos decorativos van con `aria-hidden`. Los avisos (toast) usan `role="status"` con `aria-live="polite"`. En Ajustes hay grupos con `role="radiogroup"` y `aria-labelledby`.
- **Foco visible.** Hay anillo de foco en el reproductor, el menú, la ventana aparte y Ajustes.
- **Movimiento reducido.** Con `prefers-reduced-motion: reduce` se quitan las transiciones y el desplazamiento de la tarjeta, y se limita la frecuencia de refresco del visualizador. Los cuatro diseños, la ventana aparte y Ajustes tienen su regla.
- **Idioma.** Toda cadena visible existe en español e inglés.
- **Contraste.** `npm run check` ejecuta `scripts/contrast.mjs`, que calcula la relación de contraste de los tokens de `design/tokens.json`.

## Limitaciones conocidas
- **La comprobación de contraste es parcial.** Hoy el script solo cubre el anillo de foco (3:1) y el texto del toast (4,5:1) en los cuatro diseños. El resto de textos y controles de cada diseño, la carátula y la paleta que se obtiene de ella **no** se miden automáticamente. Algunos diseños (CRT, Metal) pueden quedarse por debajo de AA en elementos secundarios.
- **Las barras de progreso no responden a las flechas por sí mismas.** Son enfocables y anuncian su valor, pero `←`/`→` saltan una cantidad fija desde la tarjeta, no mueven la barra por pasos. Tampoco hay `Inicio`/`Fin`.
- **El visualizador es solo visual.** No tiene alternativa textual; es decorativo. Se controla desde Ajustes (visualizador con el audio real).
- **Lector de pantalla.** No hemos hecho una prueba sistemática con NVDA, JAWS, VoiceOver ni Orca. Lo anterior sale de revisar el código, no de pruebas con usuarios.
- **Zoom y texto grande.** No hemos probado a fondo el reproductor con zoom del 200 % ni con tamaño de texto aumentado.
- **Sitios ajenos.** El reproductor se inyecta en páginas con estilos y atajos propios; pueden chocar con los nuestros.

## Cómo se prueba
- Automático: `npm test` (`check` incluye el contraste de los tokens) y `npm run e2e`.
- Manual (pendiente de hacerse de forma sistemática): navegación solo con teclado por la tarjeta, el menú, la ventana aparte y Ajustes; contraste forzado y movimiento reducido del sistema operativo.

## Informar de un problema
Abre una issue con la plantilla [Informe de error](https://github.com/eduulopezs/nav-miniplayer/issues/new?template=bug_report.yml) e indica «accesibilidad» en el título, qué tecnología de apoyo usas (lector de pantalla, ampliador, solo teclado…), navegador y versión. No incluyas datos personales.

Es un proyecto mantenido por una persona: contestamos en unos 7 días laborables y priorizamos los fallos que impiden usar el reproductor. No es un compromiso contractual.

Las contribuciones que mejoren la accesibilidad son bienvenidas; mira [CONTRIBUTING.md](CONTRIBUTING.md).
