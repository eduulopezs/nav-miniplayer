# Política de privacidad

Última revisión: versión 1.15.0 (se actualiza cuando cambian los permisos o el tratamiento de datos). Aplica a la extensión nav-miniplayer para Chrome y Edge (código en <https://github.com/eduulopezs/nav-miniplayer>).

## Resumen
- **No recopilamos, enviamos ni vendemos datos.** La extensión no tiene servidor propio, ni telemetría, ni analítica, ni publicidad, ni cuentas.
- Todo lo que guarda se queda en tu navegador (`chrome.storage.local` y `chrome.storage.session`; no se usa `chrome.storage.sync`).
- La extensión solo pide a la red imágenes que la propia página ya anuncia (carátulas, hojas de miniaturas de YouTube e iconos de sitio en la ventana aparte), sin datos tuyos. Como cualquier petición de imagen, el servidor que la aloja puede ver tu IP.

## Qué datos se tratan
| Dato | Para qué | Dónde se guarda |
|---|---|---|
| Metadatos del medio de la pestaña (título, artista, URL de la carátula, estado de reproducción) | Mostrarlos en el minirreproductor y en la ventana aparte | En memoria; con la ventana aparte abierta, en `chrome.storage.session` (se borra al cerrar el navegador o la ventana) |
| Ajustes: tema, preferencias, volumen por sitio, opciones de captura y de ventana | Recordar tu configuración | `chrome.storage.local`, en tu equipo |
| Audio de la pestaña (solo si activas la captura) | Alimentar el visualizador | Se procesa al momento en un documento interno de la extensión; no se graba, no se guarda y no se envía a ninguna parte |

La extensión no lee formularios, contraseñas ni cookies, ni el contenido de las páginas más allá de sus elementos de audio/vídeo y su Media Session.

## Permisos y para qué se usan
- `storage`: guardar tus ajustes y el volumen por sitio (local) y las sesiones de la ventana aparte (sesión).
- `contextMenus`: menú del icono (tema y captura de audio).
- `scripting`: registrar e inyectar el reproductor en las pestañas, y mostrarlo u ocultarlo.
- `activeTab`: inyectar el reproductor en la pestaña activa cuando haces clic en el icono o usas un atajo, sin permiso de sitios.
- `tabCapture`: captura de audio opcional, solo si la activas y haces clic en el icono o en la casilla del menú. El audio sigue sonando con normalidad y el navegador muestra su indicador de captura.
- `offscreen`: documento interno donde se analiza el audio capturado.
- Acceso a sitios (`<all_urls>`, **opcional**): no se pide al instalar. Solo se solicita si lo concedes en Ajustes («Acceso a los sitios»), para que el reproductor aparezca automáticamente en cualquier página. Puedes retirarlo cuando quieras; sin él la extensión funciona con `activeTab`. Con él, además, se pueden descargar carátulas de orígenes sin CORS.

## Red
El service worker descarga la carátula que la página anuncia en su Media Session, con estas restricciones (`src/background/net-guard.js` y `src/background/service-worker.js`): solo `http(s)` hacia hosts públicos y puertos 80/443, sin credenciales, IPs privadas, `localhost` ni literales IPv6; sin cookies (`credentials: 'omit'`), sin redirecciones, sin cabecera Referer, máximo 5 MB y 8 s; y solo se acepta si los bytes son PNG, JPEG, GIF, WebP o AVIF. Las hojas de storyboard solo se piden a `ytimg.com`. Con el permiso de sitios, estas descargas las hace el service worker aunque el origen no admita CORS; sin él, solo funcionan los orígenes que lo permiten. Los iconos de sitio (favicons) de la ventana aparte también los descarga el service worker con las mismas reglas (y además admiten `.ico`). Esas peticiones van al servidor de la imagen, igual que si la página la cargase; la extensión no envía nada propio a nadie.

## Terceros
No hay SDK, analítica ni servicios de terceros. Las fuentes van incluidas en la extensión.

## Tus derechos y control
Como no se envían datos a nadie, no hay datos tuyos en nuestro poder que acceder, rectificar o suprimir. Puedes borrar lo guardado localmente desinstalando la extensión o desde los ajustes del navegador, y retirar el permiso opcional en Ajustes o en `chrome://extensions`.

## Menores
La extensión no recoge datos de nadie, tampoco de menores.

## Cambios y contacto
Los cambios de esta política se publican en este repositorio, con historial público. Para preguntas, abre una [issue](https://github.com/eduulopezs/nav-miniplayer/issues); para temas de seguridad, sigue [SECURITY.md](SECURITY.md).
