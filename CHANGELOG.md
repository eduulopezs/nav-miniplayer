# Registro de cambios

Todos los cambios relevantes de Nav Miniplayer se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/). La versión vive únicamente en `manifest.json`. Para publicar una versión, consulta [docs/RELEASING.md](docs/RELEASING.md).

## [Sin publicar]

### Eliminado

- El diseño Dynamic. Quien lo tenía elegido pasa a Glass (migración del esquema a la versión 3) (#125).

## [2.0.9] - 2026-11-13

### Cambiado

- La descripción de la extensión en español se acorta a 132 caracteres, el máximo de la Chrome Web Store (#120).

### Interno

- Los nombres antiguos de diseño (`LEGACY`) pasan a `NMP.cfg` y `npm test` comprueba que apuntan a diseños existentes (#116).
- El informe a la ventana aparte y sus órdenes salen de `player.js` a `src/content/remote.js`, sin cambios de comportamiento (#117).
- `remote.js` solo hace de transporte (`nowPlaying` y `run` son sus únicas dependencias del reproductor), comprueba esas dependencias al arrancar y envía los mensajes con un único `send`; `npm run security` valida también el remitente de las órdenes y el orden de inyección (#121).

## [2.0.5] - 2026-11-13

### Corregido

- Volver a mostrar el reproductor poco después de ocultarlo ya no deja la captura de audio a medias.
- Los medios en pausa dentro de iframes ya no envían un latido cada 2 s; el marco superior pide su estado al llegar. Los cambios de velocidad en un iframe se notifican.
- La ventana aparte no se abre dos veces con dos clics seguidos y no muestra sesiones antiguas al reabrirse.
- Arrastrar la barra de progreso de la ventana aparte envía como mucho una orden cada 150 ms.

- La captura de audio se reutiliza en lugar de reiniciarse, y el documento offscreen se cierra al quedar inactivo (`cap-idle`, con reintentos) (#102).
- La captura solo empieza cuando el clic en el icono abre el reproductor; `NMP.toggle` devuelve si lo muestra u oculta (#102).
- En pestañas abiertas antes de actualizar, el clic en el icono vuelve a iniciar la captura de audio sin recargar la pestaña (#108).
- La ventana flotante ya no sale en blanco si queda un reproductor huérfano de la versión anterior en la pestaña: el nuevo retira el host viejo al arrancar (#110).
- `bestArtwork` recibe el medio como parámetro en lugar de cambiar `media` a mano (#104).

### Interno

- Tests de validación de sesiones y órdenes de la ventana aparte; la ventana y Ajustes comparten la carga de fuentes.
- Prueba manual contra sitios reales (`npm run manual`, `scripts/manual-sites.mjs`) más robusta (#99).
- Configuración compartida `NMP.cfg` (`SKINS`, `CMD`, `themeKey`) y `scripts/config.mjs`; el volumen por sitio pasa a `src/content/volume.js` (#102).
- `npm run security` comprueba el comportamiento de `CMD` (#102).
- Checklist de prueba manual del clic en el icono en `CONTRIBUTING.md` (#112).


## [2.0.0] - 2026-11-06

Cierra la épica Nav Miniplayer 2.0 (#19): seguridad, rendimiento, tests e2e y CI, layout responsive, sistema de diseño v2 y diseños nuevos, detección de medios ampliada, volumen, velocidad y atajos, control entre pestañas y ventana aparte, ajustes e i18n, captura de audio de la pestaña y modo de menos permisos. El detalle está en las versiones 1.3.0 a 1.18.4.

### Añadido

- Test e2e de la actualización desde 1.14.0: comprueba que se conserva el permiso de host y que Ajustes solo se abre si falta (#50).

## [1.18.4] - 2026-11-06

### Corregido

- El zip de la release incluye `_locales/`: sin esa carpeta Chrome no cargaba la extensión. `npm run zip` falla si faltan los mensajes del idioma por defecto (#82).

### Seguridad

- Endurecimiento de la mensajería interna y de las descargas de la ventana aparte: más comprobaciones de origen, tope de descargas simultáneas y más nombres de red local bloqueados (#86).

## [1.18.2] - 2026-11-04

### Añadido

- Nuevo diseño Minimal: superficie plana, clara u oscura según `prefers-color-scheme`, con contraste AA comprobado en los dos esquemas (#14).
- Nuevo diseño Terminal ANSI: texto monoespaciado, los 16 colores ANSI, barra de progreso en bloques y botones entre corchetes (#14).
- Nuevo diseño Dynamic: el fondo y el acento toman el color de la carátula y cambian con cada pista, con contraste AA comprobado con tintas extremas (#14).
- Sin permiso de host, el reproductor avisa de recargar la página cuando el puente de Media Session se inyecta tarde (#30).
- La ventana aparte aclara que solo lista las pestañas con el reproductor activo (#30).
- `ACCESSIBILITY.md` con la declaración de accesibilidad (objetivo WCAG 2.2 AA), sus limitaciones conocidas y cómo informar de un problema (#73).
- Ficheros de comunidad: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` y este registro de cambios.

### Corregido

- La paleta de la carátula ya no se queda en la de por defecto al saltar de pista mientras se descarga la anterior, y el volumen que cambia otra pestaña ya no se pierde con la siguiente escritura (#79).
- El volumen por sitio se guarda en una clave por sitio (`mp_vol:<sitio>`): dos pestañas que cambian el volumen a la vez ya no se pisan. La migración convierte el formato anterior (#80).
- La paleta de la carátula reintenta con espera creciente y un límite mientras el service worker descarga la anterior (#80).
- El botón «Abrir ventana» de Ajustes no depende de que la página se abra en una pestaña (#80).

## [1.15.1] - 2026-10-30

### Seguridad

- Los iconos de sitio (favicons) de la ventana aparte los descarga el service worker con las reglas de `net-guard` (sin cookies ni redirecciones, solo bytes de imagen, 5 MB y 8 s) en lugar de cargarse directamente (#64).

## [1.15.0] - 2026-10-30

### Cambiado

- El permiso de host pasa a ser opcional y los scripts de contenido se registran de forma dinámica (#49).

### Seguridad

- Menor superficie de permisos: el acceso a sitios ya no se concede por defecto (#49). Consulta [SECURITY.md](SECURITY.md).

## [1.14.0] - 2026-10-29

### Añadido

- Página de ajustes e internacionalización de la extensión, con `_locales/es` y `_locales/en` (#47).

### Cambiado

- Los tests e2e obtienen el id de la extensión en Windows para la captura real (#48, sin cambio de versión).

## [1.13.0] - 2026-10-28

### Añadido

- Miniatura del storyboard al pasar el ratón por la barra de progreso (#44).

### Corregido

- La miniatura del storyboard acota `sbFailed`, evita reescrituras del fondo, usa una clave de pintado completa y escribe menos estilos (#45, #46; sin cambio de versión).

## [1.12.0] - 2026-10-28

### Añadido

- Carátula difuminable y regulador de volumen (#43).

## [1.11.0] - 2026-10-28

### Cambiado

- Se eliminan los modos Mini y Tarjeta (#42).

## [1.10.0] - 2026-10-28

### Cambiado

- Sistema de diseño v2: escalas, estados, color dinámico, iconos y microinteracciones (#41).

## [1.9.0] - 2026-10-28

### Añadido

- Ventana aparte con todas las pestañas (#37).

## [1.8.5] - 2026-10-28

### Corregido

- Captura de audio de la pestaña y mayor sensibilidad del visualizador (#38).

## [1.8.2] - 2026-10-28

### Corregido

- Se retira el medio de un marco ausente cuando falla una orden (#36).

## [1.8.1] - 2026-10-28

### Corregido

- Fallos detectados en la revisión de #27: expulsión, seek y caducidad de iframes (#35). Un test e2e del volumen con una carrera se corrige en #34 (sin cambio de versión).

## [1.8.0] - 2026-10-28

### Añadido

- Volumen, velocidad, atajos de teclado, menú y mostrar u ocultar automáticamente el reproductor (#17, #33).

## [1.7.1] - 2026-10-27

### Añadido

- Soporte de medios sin insertar en el documento, en shadow DOM y en iframes, y política de selección del medio (#15, #27).

## [1.6.0] - 2026-10-27

### Añadido

- Captura de audio de la pestaña para el visualizador (#29, #31).

## [1.5.0] - 2026-10-27

### Añadido

- Los 4 diseños y layouts adaptativos en la extensión (#28).

## [1.4.2] - 2026-10-27

### Corregido

- Cambio de modo más fiable, guiado por eventos de cierre y con una pista más fiable, y aviso de ventana pendiente (#24).

## [1.4.1] - 2026-10-27

### Añadido

- Tests e2e con Playwright, CI en GitHub Actions y empaquetado (#22).

## [1.4.0] - 2026-10-27

### Cambiado

- Rendimiento: sin trabajo ni temporizadores con el reproductor oculto (#21).

## [1.3.0] - 2026-10-27

### Seguridad

- Shadow DOM cerrado, descarga de carátulas endurecida y puente sin huella (#20).

## [1.2.9] - 2026-10-27

### Cambiado

- Tema Brutal: artista a opacidad .7 (contraste 4,76:1) y contraste estricto en `npm test` (#8).

## [1.2.8] - 2026-10-27

### Cambiado

- El título de la tarjeta usa el color del tema (#7).

## [1.2.7] - 2026-10-27

### Cambiado

- Tokens de diseño con fuente única (#6).

## [1.2.6] - 2026-10-27

### Añadido

- Estados de pausa y carga, e imán a los márgenes al arrastrar (Alt lo desactiva) (#5).
- En el modo Mini: estado de pausa sobre la carátula, nota si no hay carátula, etiqueta EN DIRECTO y título recortado con reducir movimiento (#5).

## [1.2.5] - 2026-10-27

### Cambiado

- README con la ruta de instalación, los diseños corregidos, atajos de teclado, estructura y desarrollo (#4).

## [1.2.4] - 2026-10-27

### Cambiado

- La extensión pasa a llamarse Nav Miniplayer.

### Añadido

- Licencia MIT.

## [1.2.3] - 2026-10-27

### Añadido

- Documentación inicial.

## [1.2.0] - 2026-10-27

### Añadido

- Reproductor de cristal con modos Mini, Ventana y Tarjeta, barra de progreso en el borde y temas.

## [1.1.0] - 2026-10-27

### Añadido

- Control de multimedia de otras pestañas y clic en el icono para mostrar el reproductor.

## [1.0.0] - 2026-10-27

### Añadido

- Esqueleto de la extensión: manifest MV3, iconos y service worker.

Entre 1.2.4 y 1.4.2 (#1 a #24) se hicieron también cambios internos sin versión propia: arquitectura por contexto (background, page y content), content script dividido en módulos, accesibilidad de teclado y lectores de pantalla, y estilos con tokens de diseño (#1, #2). En el service worker se limitó la descarga de carátulas a imágenes http(s) de hasta 5 MB y se validó el remitente (#3). Los tests e2e de persistencia de posición y tamaño y de `prefers-reduced-motion` llegaron en #25, y la decisión de mantener `host_permissions` `<all_urls>` se documentó en `SECURITY.md` en #26; ambas sin cambio de versión.

