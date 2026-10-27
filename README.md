# Nav Miniplayer (Edge y Chrome, Manifest V3)

## Instalar
Mismo código para ambos navegadores (requiere Chrome/Edge 111 o superior).

- **Edge:** abre `edge://extensions`, activa **Modo de desarrollador** y pulsa **Cargar desempaquetada**.
- **Chrome:** abre `chrome://extensions`, activa **Modo de desarrollador** (arriba a la derecha) y pulsa **Cargar descomprimida**.

Elige la carpeta del repositorio (la que contiene `manifest.json`) y recarga las pestañas ya abiertas. Al reproducir audio/vídeo aparece el minirreproductor.

## Uso
- Arrastra la tarjeta a cualquier punto de la pantalla (la posición se recuerda).
- Play/pausa, ±10 s, anterior/siguiente (usa Media Session del sitio; en YouTube/Spotify Web funcionan).
- El borde de la tarjeta es la barra de progreso: haz clic o arrastra sobre el borde para saltar.
- Tamaño: arrastra cualquiera de las cuatro esquinas (aparecen al pasar el ratón) para cambiar ancho y alto; el contenido se adapta en tiempo real. Si lo aplastas verticalmente (menos de ~84 px de alto) pasa a un modo fino de una sola fila, hasta ~44 px de alto. En la ventana flotante, redimensiona la propia ventana desde cualquier borde o esquina.
- Aparece solo al pulsar el icono de la extensión (clic izquierdo; otro clic lo oculta, sin cambiar de tipo). Clic derecho en el icono para elegir el tipo de ventana:
  - **Mini**: ventana flotante sin marco, siempre encima aunque minimices el navegador (Picture-in-Picture de vídeo, Chrome/Edge 116+). Se abre en el acto con el clic en el icono; si el navegador la bloquea, se abre con el siguiente clic o tecla en la página. Dibuja carátula, título, artista y barra de progreso; los controles son los nativos de esa ventana. Cerrarla con su X solo la oculta.
  - **Ventana**: ventana flotante con marco (barra de título nativa, no eliminable desde una extensión), con la tarjeta completa y sus botones, redimensionable.
  - **Tarjeta**: la tarjeta en la página, con esquinas muy redondeadas. El botón de la tarjeta pasa a Mini. La elección se recuerda.
  Si el navegador no permite el PiP de vídeo, usa una ventana flotante con marco como respaldo.
- Botón × (al pasar el ratón) o icono de la extensión en la barra: ocultar/mostrar.
- Teclado: con Tab se enfoca el reproductor; **Espacio** o **K** play/pausa, **←/→** ±10 s, **Esc** lo oculta. El progreso y la pista se anuncian a lectores de pantalla, y con "reducir movimiento" activado los títulos largos se truncan en vez de desplazarse.

## Diseños (desarrollo)
Clic derecho en el icono → **Diseño (desarrollo)** para cambiar el aspecto en caliente (se aplica a Tarjeta, Ventana y Mini):
- **Glass (original)**: cristal translúcido con carátula desenfocada y progreso en degradado.
- **Cyber Brutalismo / Micrographics**: lavanda sobre violeta casi negro, trama de puntos, tipografía mono y micrográficas.
- **Pixel art**: paleta de dos verdes y crema, esquinas escalonadas, carátula pixelada y barra por bloques.
- **Retro Cyber**: terminal de fósforo verde con efecto CRT, líneas de escaneo y brillo.

## Estructura
```
manifest.json
design/tokens.json              fuente única de tokens (primitivos y semánticos por diseño)
src/
  background/service-worker.js   clic en el icono, menú contextual y descarga de carátulas
  background/net-guard.js        reglas de red para carátulas (URL permitidas y detección de imagen por bytes)
  page/media-session-bridge.js   mundo de la página: captura los manejadores de Media Session
  content/
    config.js                    constantes y claves de almacenamiento
    util.js                      clamp y formato de tiempo
    icons.js                     iconos SVG
    tokens.js                    GENERADO desde design/tokens.json (variables CSS y colores del lienzo)
    styles.js                    CSS del reproductor; sólo usa var(--token)
    themes.js                    paletas del lienzo de Mini, una por diseño, leídas de los tokens
    renderer.js                  dibuja Mini en un canvas
    player.js                    DOM, estado, ventanas flotantes, arrastre, tamaño y teclado
scripts/                         build-tokens.mjs (genera tokens.js), contrast.mjs (auditoría WCAG), check.mjs (manifest y sintaxis), security.mjs (red y aislamiento) y smoke.mjs (carga con DOM falso)
```
Los módulos de `content/` se cargan en el orden del manifest y comparten el espacio `__NMP`.

## Tokens de diseño
Los colores viven en `design/tokens.json` en tres capas: **primitivos** (`lavender-300`), **semánticos por diseño** (`ac`, `fg`, `track`, `play-bg`…) y, en el CSS, los componentes que los consumen con `var(--token)`. Los valores aceptan `{primitivo}` o `{primitivo}@alfa`. Las claves `mini-*` sólo se usan en el lienzo de Mini.

- `npm run tokens` regenera `src/content/tokens.js` (no lo edites a mano; `npm test` falla si está desactualizado).
- `npm run contrast` audita el contraste WCAG de texto/fondo de cada diseño; `npm test` lo ejecuta con `--strict`, así que un token que baje de su mínimo rompe la verificación (Glass es aproximado: su fondo es translúcido).

## Seguridad
Ver [SECURITY.md](SECURITY.md): modelo de amenazas, controles y límites conocidos.

## Desarrollo
`npm test` comprueba que el manifest referencia archivos existentes, que todos los scripts compilan y que los módulos cargan y dibujan cada diseño. Sube el `version` del manifest en cada cambio.
