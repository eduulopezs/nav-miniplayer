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

- **Captura de audio (opt-in).** Con la opción del menú del icono activada, el clic en el icono (gesto que da `activeTab`) pide un id de flujo con `tabCapture` y lo consume un documento offscreen, que analiza el audio. El audio vuelve a los altavoces sin tocarse y al content script solo llegan bandas de frecuencia y forma de onda por un puerto de la extensión (la página no lo ve). El offscreen solo atiende a la extensión, corta la captura si el reproductor no se muestra o se oculta, y el navegador muestra su indicador de captura de pestaña.

## Límites conocidos
- **El mundo MAIN es de la página.** El puente de Media Session (`media-session-bridge.js`) comparte contexto con los scripts del sitio, así que no se puede autenticar ningún mensaje que pase por ahí. Por diseño solo transporta datos de bajo impacto (qué botones existen y órdenes que el propio sitio ya registró como manejadores). Una página hostil puede, como mucho, desactivar o descolocar la interfaz, igual que ya puede con cualquier elemento de su DOM.
- **Detectabilidad.** La extensión sigue siendo detectable (el host del reproductor tiene un `id` que el puente necesita, y `MediaSession.prototype.setActionHandler` está envuelto). Ocultarlo del todo no es un objetivo.
- **Fuentes visibles.** Las fuentes de los diseños se registran en `document.fonts` (el shadow DOM no admite `@font-face`), así que una página puede ver, solo mientras el reproductor se muestra, que hay fuentes como Archivo Narrow o VT323 añadidas. Se piden al service worker (validando remitente y nombre de archivo) y no hay `web_accessible_resources`.
- **DNS rebinding.** Una URL pública cuyo DNS resuelva después a una IP privada no se puede detectar desde un service worker sin resolver. Mitigado por: sin cookies, sin redirecciones, solo imágenes por bytes, puertos 80/443 y que el resultado solo llega a un shadow DOM cerrado.
- **`host_permissions: <all_urls>`.** Decisión: se mantiene. Hace falta por cuatro motivos: (1) el puente de Media Session debe ejecutarse en `document_start` en el mundo MAIN para capturar los `setActionHandler` que registra la página, y con `activeTab` o permisos opcionales se inyectaría tarde y anterior/siguiente dejarían de funcionar en muchos sitios; (2) el reproductor debe estar listo en cualquier pestaña sin pedir permisos sitio por sitio; (3) el service worker descarga carátulas de otros orígenes, que sin el permiso quedarían sujetas a CORS; (4) quitar solo `host_permissions` no elimina el aviso de instalación, porque los `content_scripts` estáticos con `<all_urls>` dan el mismo. El riesgo se mitiga con el shadow DOM cerrado, el filtro de red privada del service worker y la validación del puente (ver arriba). Un modo de menos permisos (`activeTab` y `optional_host_permissions`) queda como posible trabajo futuro y exigiría rehacer la inyección, el puente y los tests e2e.

## Notificar un fallo
Abre una issue con la etiqueta `area: seguridad`, o escribe al autor si el fallo es explotable.

## Pruebas
`npm run security` comprueba las reglas de red y el aislamiento (también se ejecuta con `npm test`).
