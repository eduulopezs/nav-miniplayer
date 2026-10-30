# Nav Miniplayer (Edge y Chrome, Manifest V3)

## Instalar
Mismo código para ambos navegadores (requiere Chrome/Edge 116 o superior).

- **Edge:** abre `edge://extensions`, activa **Modo de desarrollador** y pulsa **Cargar desempaquetada**.
- **Chrome:** abre `chrome://extensions`, activa **Modo de desarrollador** (arriba a la derecha) y pulsa **Cargar descomprimida**.

Elige la carpeta del repositorio (la que contiene `manifest.json`). La primera vez se abre **Ajustes**: activa **Acceso a los sitios** para que el reproductor se cargue solo en todas las páginas (permiso opcional; las pestañas abiertas lo reciben al concederlo). Sin ese acceso, el clic en el icono o un atajo lo cargan en la pestaña activa, pero anterior/siguiente pueden no funcionar en sitios que registran sus controles antes. Al reproducir audio/vídeo, pulsa el icono de la extensión para abrir el minirreproductor.

## Uso
- Play/pausa, ±10 s, anterior/siguiente (usa Media Session del sitio; en YouTube/Spotify Web funcionan).
- Detecta `<audio>`/`<video>` de la página, `new Audio()` sin insertar y medios dentro de shadow DOM (abierto o cerrado), tanto si se llama a `play()` como si arrancan solos con `autoplay`. Si suenan varios elige el que tiene sonido, después el último que sonó y después el más largo; ignora los vídeos de fondo silenciados y en bucle. También los de iframes (incluidos los sin insertar), con un agente sin interfaz en cada subframe. Fuera de alcance: Media Session dentro de un iframe, y medios creados en un documento ajeno (`createElement` de otro `document`).
- La barra de progreso de cada diseño busca al pulsar o arrastrar y muestra el tiempo bajo el puntero.
- **Clic derecho en la tarjeta**: menú con volumen, velocidad (0.5x a 3x), salto (5, 10, 15 o 30 s), diseño y copiar el enlace en el minuto actual (con tiempo en YouTube y Vimeo; en el resto, el enlace de la página). La **rueda** sobre la tarjeta cambia el volumen en pasos de 5 % y el volumen se recuerda por sitio. Volumen y velocidad solo actúan sobre medios del DOM (no sobre los de iframes ni los sin insertar). En la ventana flotante con marco no hay menú.
- **Carátula difuminada**: un clic en la carátula la difumina (otro clic la devuelve; también con Intro o Espacio) y la preferencia se recuerda. En los layouts medianos y grandes hay además un **regulador de volumen** junto al botón de silencio, que usa el mismo volumen recordado por sitio.
- **Miniatura al pasar por la barra** (YouTube): sobre la barra de progreso aparece la miniatura del storyboard del vídeo con su tiempo, si la tarjeta tiene hueco. Las hojas las descarga el service worker, solo desde ytimg.com.
- **Atajos** (se pueden cambiar en `chrome://extensions/shortcuts`): Alt+Shift+M mostrar/ocultar, Alt+Shift+P play/pausa, Alt+Shift+, y Alt+Shift+. retroceder y avanzar; pista anterior y siguiente sin tecla por defecto.
- Tamaño: redimensiona la ventana desde cualquier borde o esquina; el contenido se adapta en tiempo real (pastilla, fila, compacto, portada o panorámico según el espacio).
- Aparece solo al pulsar el icono de la extensión (clic izquierdo; otro clic la cierra): una ventana flotante con marco (Document Picture-in-Picture, Chrome/Edge 116+; la barra de título nativa no es eliminable desde una extensión), siempre encima aunque minimices el navegador, con la tarjeta completa y sus botones. Si el navegador no permite el PiP de documento, se abre la ventana aparte como respaldo.
- Teclado: con Tab se enfoca el reproductor; **Espacio** o **K** play/pausa, **←/→** ±10 s, **Esc** lo oculta. El progreso y la pista se anuncian a lectores de pantalla, y con "reducir movimiento" activado los títulos largos se truncan en vez de desplazarse.

## Compatibilidad

✅ probado a mano (aparece la tarjeta, play/pausa y ±10 s actúan sobre el medio) · ☑️ asumido, sin probar todavía.

| Sitio | Estado | Notas |
|---|---|---|
| YouTube | ✅ | Con un anuncio delante, la tarjeta sigue al medio que suena en ese momento. |
| YouTube Music | ☑️ | Rechaza Chromium automatizado, hay que probarlo en un Chrome normal. |
| Spotify Web | ☑️ | Necesita sesión y DRM. |
| SoundCloud | ☑️ | |
| Twitch | ☑️ | |
| Vimeo incrustado | ☑️ | Iframe; cubierto por los tests e2e con iframes locales. |
| Vídeo de noticias | ☑️ | |

## Ventana aparte (todas las pestañas)
Clic derecho en el icono → **Abrir ventana aparte (todas las pestañas)** (o el atajo "Abrir la ventana aparte", sin tecla por defecto). Es una ventana de la extensión, sin depender de un gesto en la página ni de Picture-in-Picture, con los mismos diseños y layouts: arriba hay una pastilla por pestaña con sonido (icono y título), el botón ↗ lleva a la pestaña elegida y los controles, la barra de progreso y el teclado (Espacio, ←/→) actúan sobre ella. Por defecto muestra la que suena. Recuerda su posición y tamaño. Mientras está cerrada, las pestañas no informan de nada.

## Diseños
Clic derecho en el icono → **Diseño** para cambiar el aspecto en caliente (se aplica a la ventana abierta):
- **Glassware**: cristal translúcido con cintas de color que siguen la música y paleta sacada de la carátula.
- **Noir**: negro y rojo señal, carátula en blanco y negro, código de barras y relieve de espectro.
- **Terminal CRT**: fósforo ámbar con curvatura de tubo, líneas de escaneo y ecualizador de texto.
- **Liquid Metal**: metal cromado con mercurio en movimiento y anillo de color.

Para que el visualizador siga el audio real de la pestaña, marca **Visualizador con el audio real de la pestaña** en el menú del icono; la captura empieza con el clic en el icono y el navegador muestra su indicador. Sin ella, el visualizador es simulado.

La tarjeta se adapta a su tamaño (pastilla, fila, compacto, portada, panorámico) con container queries. Las fuentes se cargan desde la propia extensión.

## Estructura
```
manifest.json
design/tokens.json              fuente única de tokens (primitivos y semánticos por diseño)
src/
  background/service-worker.js   clic en el icono, menú contextual, descarga de carátulas y relevo de mensajes de iframes
  background/sessions.js         sesiones de todas las pestañas, órdenes de la ventana aparte y su apertura
  background/net-guard.js        reglas de red para carátulas (URL permitidas y detección de imagen por bytes)
  page/media-session-bridge.js   mundo de la página: captura los manejadores de Media Session y vigila los medios sin insertar o en shadow DOM
  content/
    config.js                    constantes y claves de almacenamiento
    util.js                      clamp y formato de tiempo
    media.js                     medios remotos (del puente y de iframes) y política de selección
    frame-agent.js               agente sin interfaz en cada iframe: informa al marco superior y ejecuta sus órdenes
    tokens.js                    GENERADO desde design/tokens.json (variables CSS y colores de la paleta)
    styles.js                    CSS del reproductor; sólo usa var(--token)
    player.js                    DOM, estado, ventana con marco y teclado
tests/e2e/                       pruebas e2e con Playwright (helpers, reproductor, seguridad y diseños)
scripts/                         zip.mjs (empaquetado), build-tokens.mjs (genera tokens.js), contrast.mjs (auditoría WCAG), check.mjs (manifest y sintaxis), security.mjs (red y aislamiento) y smoke.mjs (carga con DOM falso)
```
Los módulos de `content/` se cargan en el orden del manifest y comparten el espacio `__NMP`.

## Tokens de diseño
Los colores viven en `design/tokens.json` en tres capas: **primitivos** (`lavender-300`), **semánticos por diseño** (`ac`, `fg`, `track`, `play-bg`…) y, en el CSS, los componentes que los consumen con `var(--token)`. Los valores aceptan `{primitivo}` o `{primitivo}@alfa`.

- `npm run tokens` regenera `src/content/tokens.js` (no lo edites a mano; `npm test` falla si está desactualizado).
- `npm run contrast` audita el contraste WCAG de texto/fondo de cada diseño; `npm test` lo ejecuta con `--strict`, así que un token que baje de su mínimo rompe la verificación (Glass es aproximado: su fondo es translúcido).

## Seguridad
Ver [SECURITY.md](SECURITY.md): modelo de amenazas, controles y límites conocidos.

## Desarrollo
- `npm test`: verificación rápida sin navegador (manifest, sintaxis, tokens, contraste, seguridad y humo).
- `npm run e2e`: pruebas en Chromium con la extensión cargada (Node 22+). La primera vez: `npm install` y `npx playwright install chromium`. Cubren mostrar/ocultar, play y pausa, ±10 s, progreso, scrub por el borde, teclado, redimensionado, aislamiento y los 4 diseños. Las capturas de los diseños quedan en `tests/e2e/__shots__/`.
- `npm run zip`: genera `dist/nav-miniplayer-<versión>.zip` listo para subir a la tienda.
- GitHub Actions ejecuta las tres cosas en cada PR (`.github/workflows/ci.yml`).

`npm test` comprueba que el manifest referencia archivos existentes, que todos los scripts compilan y que los módulos cargan y dibujan cada diseño. Sube el `version` del manifest en cada cambio.
