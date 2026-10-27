# Modelo de amenazas

La extensión se inyecta en todas las páginas (`<all_urls>`) y procesa datos que **controla la página**: metadatos de Media Session (título, artista, URL de la carátula) y el estado de sus `<audio>`/`<video>`. La página es el atacante; la extensión tiene permisos que la página no tiene.

## Qué se protege
1. **Red privilegiada.** El service worker puede descargar cualquier origen (`host_permissions`). La página no debe poder usarlo para leer recursos que ella no puede leer (red local, servicios en `localhost`, metadatos cloud, intranets).
2. **Contenido del reproductor.** Con la carátula pintada en el lienzo del modo Mini, un shadow DOM abierto permitiría a la página leer esos píxeles.
3. **Capacidades de la extensión.** La página no debe poder ordenar acciones de la extensión.

## Controles
| Amenaza | Control | Dónde |
|---|---|---|
| SSRF vía URL de carátula | Solo `http(s)` público, sin credenciales, solo puertos 80/443, sin `localhost`, IPv4 privadas o reservadas, literales IPv6 ni nombres sin dominio o `.local`/`.internal`/`.lan`/`.corp` | `src/background/net-guard.js` |
| Cookies y redirecciones | `credentials: 'omit'`, `redirect: 'error'`, `referrerPolicy: 'no-referrer'` | `service-worker.js` |
| Descargas abusivas | Tope de 5 MB leyendo en streaming, tiempo máximo de 8 s, una descarga a la vez por pestaña, mensaje solo desde una pestaña de la propia extensión | `service-worker.js` |
| Contenido que no es imagen | El tipo se decide por los bytes (PNG, JPEG, GIF, WebP, AVIF); SVG y HTML se rechazan | `net-guard.js` |
| Lectura del reproductor por la página | `attachShadow({ mode: 'closed' })` | `player.js` |
| Inyección en CSS | La carátula se limita a `http(s)`, `blob:` e imágenes `data:`, y se escapan comillas, barras y saltos de línea al ponerla en `url("...")` | `player.js` |
| Orden de mostrar/ocultar desde la página | Ya no es un evento del DOM: el service worker llama a una función del mundo aislado, inaccesible a la página | `service-worker.js`, `player.js` |
| Detección por variable global | Se eliminó `window.__glassMiniPlayerHooked` | `media-session-bridge.js` |
| Datos falsos desde el puente | Las acciones anunciadas se filtran contra una lista de nombres conocidos y los eventos PiP contra valores válidos | `player.js` |

## Límites conocidos
- **El mundo MAIN es de la página.** El puente de Media Session (`media-session-bridge.js`) comparte contexto con los scripts del sitio, así que no se puede autenticar ningún mensaje que pase por ahí. Por diseño solo transporta datos de bajo impacto (qué botones existen y órdenes que el propio sitio ya registró como manejadores). Una página hostil puede, como mucho, desactivar o descolocar la interfaz, igual que ya puede con cualquier elemento de su DOM.
- **Detectabilidad.** La extensión sigue siendo detectable (el host del reproductor tiene un `id` que el puente necesita, y `MediaSession.prototype.setActionHandler` está envuelto). Ocultarlo del todo no es un objetivo.
- **DNS rebinding.** Una URL pública cuyo DNS resuelva después a una IP privada no se puede detectar desde un service worker sin resolver. Mitigado por: sin cookies, sin redirecciones, solo imágenes por bytes, puertos 80/443 y que el resultado solo llega a un shadow DOM cerrado.
- **`host_permissions: <all_urls>`.** Se mantiene porque el content script debe cargarse en cualquier sitio con medios. Pasar a `optional_host_permissions` está pendiente de evaluar por su coste en la experiencia de uso.

## Notificar un fallo
Abre una issue con la etiqueta `area: seguridad`, o escribe al autor si el fallo es explotable.

## Pruebas
`npm run security` comprueba las reglas de red y el aislamiento (también se ejecuta con `npm test`).
