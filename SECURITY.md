# Política de seguridad

Este documento describe cómo notificar vulnerabilidades de nav-miniplayer y el modelo de amenazas en el que se basa su diseño. La política de datos está en [PRIVACY.md](PRIVACY.md).

## Versiones soportadas
| Versión | Soporte |
|---|---|
| Última publicada (rama `main`) | Sí |
| Anteriores | No: actualiza a la última |

## Notificar un fallo
**No abras una issue pública** para una vulnerabilidad. Si el enlace no está disponible, abre una issue sin detalles técnicos pidiendo un canal privado. Usa el aviso privado de GitHub (Private Vulnerability Reporting):

**<https://github.com/eduulopezs/nav-miniplayer/security/advisories/new>**

Incluye la versión, los pasos para reproducirlo, el impacto que ves y, si puedes, una prueba de concepto mínima. Los fallos que no sean explotables (endurecimiento, dudas) pueden ir como issue normal.

### Plazos orientativos
Es un proyecto mantenido por una persona, así que son plazos de buena fe, no garantías:
- Acuse de recibo: en unos 7 días.
- Valoración inicial (si se confirma y gravedad): en unos 14 días.
- Corrección o mitigación: lo antes posible según la gravedad, normalmente en 90 días como máximo.

### Divulgación coordinada
Pedimos no divulgar públicamente el fallo hasta que haya una versión corregida o hayan pasado 90 días desde el aviso, lo que ocurra antes (se puede acordar un plazo distinto si hay motivo). Cuando se publique la corrección se acreditará a quien lo notificó, salvo que prefiera el anonimato.

### Safe harbor
Si investigas de buena fe y dentro de esta política (sin acceder a datos de terceros, sin degradar servicios ajenos, sin divulgar antes de tiempo), no emprenderemos acciones legales contra ti ni te las reclamaremos y colaboraremos para resolverlo.

### Alcance
- Dentro: el código de este repositorio (extensión MV3: service worker, content scripts, puente de Media Session, página de ajustes, ventana aparte, documento offscreen) y los scripts de `scripts/`.
- Fuera: fallos del navegador o de las APIs de Chrome/Edge, vulnerabilidades de los sitios web donde se usa, ingeniería social, ataques que exijan ya tener control del perfil del navegador o de la extensión, informes automáticos sin impacto demostrable, y las limitaciones de «Límites conocidos» tal como están descritas (un impacto mayor que el descrito sí está dentro de alcance).

# Modelo de amenazas

La extensión se inyecta en las páginas a las que el usuario da acceso (permiso opcional `<all_urls>`, ver abajo) y procesa datos que **controla la página**: metadatos de Media Session (título, artista, URL de la carátula) y el estado de sus `<audio>`/`<video>`. La página es el atacante; la extensión tiene permisos que la página no tiene.

## Qué se protege
1. **Red privilegiada.** El service worker puede descargar cualquier origen (permiso de host). La página no debe poder usarlo para leer recursos que ella no puede leer (red local, servicios en `localhost`, metadatos cloud, intranets).
2. **Contenido del reproductor.** Con la carátula y los datos de la pista dentro de un shadow DOM abierto, la página podría leerlos.
3. **Capacidades de la extensión.** La página no debe poder ordenar acciones de la extensión.

## Controles
| Amenaza | Control | Dónde |
|---|---|---|
| SSRF vía URL de carátula | Solo `http(s)` público, sin credenciales, solo puertos 80/443, sin `localhost`, IPv4 privadas o reservadas, literales IPv6 ni nombres sin dominio o `.local`/`.internal`/`.lan`/`.corp` | `src/background/net-guard.js` |
| Cookies y redirecciones | `credentials: 'omit'`, `redirect: 'error'`, `referrerPolicy: 'no-referrer'` | `src/background/service-worker.js` |
| Descargas abusivas | Tope de 5 MB leyendo en streaming, tiempo máximo de 8 s, una descarga a la vez por pestaña, solo se atienden mensajes de los scripts de la propia extensión (`sender.id`) | `src/background/service-worker.js` |
| Hojas del storyboard de YouTube | Además de las reglas anteriores, solo `https` hacia `ytimg.com` y sus subdominios | `net-guard.js` (`isStoryboardUrl`) |
| Contenido que no es imagen | El tipo se decide por los bytes (PNG, JPEG, GIF, WebP, AVIF; `.ico` solo para favicons); SVG y HTML se rechazan | `net-guard.js` |
| Lectura del reproductor por la página | `attachShadow({ mode: 'closed' })` | `src/content/player.js` |
| Inyección en CSS | La carátula se limita a `http(s)`, `blob:` e imágenes `data:`, y se escapan comillas, barras y saltos de línea al ponerla en `url("...")` | `src/content/player.js` |
| Orden de mostrar/ocultar desde la página | Ya no es un evento del DOM: el service worker llama a una función del mundo aislado, inaccesible a la página | `src/background/service-worker.js`, `src/content/player.js` |
| Detección por variable global | Se eliminó `window.__glassMiniPlayerHooked` | `src/page/media-session-bridge.js` |
| Datos falsos desde el puente | Las acciones anunciadas se filtran contra una lista de nombres conocidos y los eventos PiP contra valores válidos | `src/content/player.js` |

- **Permisos del manifiesto.** `storage`, `contextMenus`, `scripting`, `tabCapture`, `offscreen` y `activeTab`; el acceso a sitios es opcional (`optional_host_permissions`) y no hay `host_permissions`, `content_scripts` estáticos ni `web_accessible_resources`. Detalle en [PRIVACY.md](PRIVACY.md).

- **Captura de audio (opt-in).** Con la opción del menú del icono activada, el clic en el icono o en la casilla del menú (gestos que dan `activeTab`) pide un id de flujo con `tabCapture` y lo consume un documento offscreen, que analiza el audio. El audio vuelve a los altavoces sin tocarse y al content script solo llegan bandas de frecuencia y forma de onda por un puerto de la extensión (la página no lo ve). El offscreen solo atiende a la extensión, corta la captura si el reproductor no se muestra o se oculta, y el navegador muestra su indicador de captura de pestaña.

- **Atajos y menú.** Los atajos (`chrome.commands`) los ejecuta el service worker con un script en el mundo aislado y solo aceptan cinco nombres conocidos. El menú se construye con nodos creados por la extensión (nunca con `innerHTML` de datos de la página) y vive en el shadow DOM cerrado. Los ajustes y el volumen por sitio se guardan en `chrome.storage.local`, que la página no ve.

- **Ventana aparte y sesiones.** Las pestañas solo informan de su medio mientras la ventana está abierta (`mp_remote`). El service worker valida cada campo (longitudes, números acotados, solo URL http(s)), guarda las sesiones en `chrome.storage.session` (no accesible desde las páginas) y solo acepta órdenes (`play`, `pause`, `toggle`, `back`, `fwd`, `prev`, `next`, `mute`, `seek:<s>`) de la página de la extensión, reconocida por su URL, y para pestañas que ya hayan informado. Las carátulas y los iconos de sitio (favicons) de la ventana los descarga el service worker con las mismas reglas de red que las de la tarjeta (`net-guard.js`: http(s) público, sin cookies ni redirecciones, solo bytes de imagen, 5 MB y 8 s); la ventana solo pinta el data URL resultante. Para los favicons se admite además el formato `.ico`.

## Límites conocidos
- **El mundo MAIN es de la página.** El puente de Media Session (`src/page/media-session-bridge.js`) comparte contexto con los scripts del sitio, así que no se puede autenticar ningún mensaje que pase por ahí. Por diseño solo transporta datos de bajo impacto (qué botones existen y órdenes que el propio sitio ya registró como manejadores). Una página hostil puede, como mucho, desactivar o descolocar la interfaz, igual que ya puede con cualquier elemento de su DOM.
- **Detectabilidad.** La extensión sigue siendo detectable (el host del reproductor tiene un `id` que el puente necesita, y `MediaSession.prototype.setActionHandler` está envuelto). Ocultarlo del todo no es un objetivo.
- **Fuentes visibles.** Las fuentes de los diseños se registran en `document.fonts` (el shadow DOM no admite `@font-face`), así que una página puede ver, solo mientras el reproductor se muestra, que hay fuentes como Archivo Narrow o VT323 añadidas. Se piden al service worker (validando remitente y nombre de archivo) y no hay `web_accessible_resources`.
- **DNS rebinding.** Una URL pública cuyo DNS resuelva después a una IP privada no se puede detectar desde un service worker sin resolver. Mitigado por: sin cookies, sin redirecciones, solo imágenes por bytes, puertos 80/443 y que el resultado solo llega a un shadow DOM cerrado.
- **Permiso de host opcional (`optional_host_permissions: <all_urls>`).** Decisión: el manifiesto ya no declara hosts ni `content_scripts`, así que la instalación no muestra el aviso de "leer y cambiar todos tus datos". El acceso se concede desde Ajustes ("Acceso a los sitios"); al concederlo, el service worker registra los scripts con `scripting.registerContentScripts` (el puente de Media Session sigue en `document_start` y mundo MAIN, de modo que anterior/siguiente funcionan igual que antes) y los retira al revocarlo. Las pestañas ya abiertas reciben los scripts en el momento de concederlo. Sin el permiso, el clic en el icono o un atajo inyectan el reproductor en esa pestaña con `activeTab`: el puente llega entonces tarde y anterior/siguiente pueden no estar disponibles en sitios que registran sus manejadores antes. Las carátulas de otros orígenes sin CORS solo se descargan con el permiso. El riesgo se mitiga con el shadow DOM cerrado, el filtro de red privada del service worker y la validación del puente (ver arriba).

## Pruebas
`npm run security` comprueba las reglas de red y el aislamiento (también se ejecuta con `npm test`).
