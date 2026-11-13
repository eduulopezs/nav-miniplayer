# Publicación en la Chrome Web Store

Preparación de la ficha y decisiones para Chrome Web Store y Edge Add-ons. Resuelve la parte de estudio de la issue #120; se cierra al enviar la ficha.

## Decisiones

- **Publicación manual**, no desde `release.yml`. Motivo: el volumen de versiones es bajo, la API de la tienda exige guardar un refresh token como secreto en el repo y la revisión puede pedir explicaciones que conviene atender a mano. Se reevalúa si las versiones se vuelven frecuentes.
- **Orden**: Chrome Web Store primero; Edge Add-ons después, con el mismo zip (es MV3 compatible).
- **Cuenta**: cuenta de desarrollador de Chrome Web Store (cuota única de registro de 5 USD) a nombre del mantenedor del repo, con verificación en dos pasos. Pendiente de que el mantenedor la cree; sin ella no se puede enviar la ficha. Edge Add-ons es gratuita.
- **Paquete**: el zip de `npm run zip` (`dist/nav-miniplayer-<versión>.zip`), el mismo que adjunta la GitHub Release.
- **Versionado**: la tienda rechaza un envío con versión igual o menor a la ya publicada. Basta con seguir subiendo `version` en `manifest.json` en cada PR funcional.

## Ficha

- **Nombre**: Nav Miniplayer (`extName`).
- **Categoría**: Productivity (alternativa: Entertainment).
- **Descripción corta**: se toma de `extDesc` en cada idioma (máx. 132 caracteres: `en` mide 132 y `es` 123).
- **Descripción larga** (es / en): qué hace (control flotante del audio/vídeo de la pestaña, Media Session, ventana aparte, visualizador opcional, skins), que no recopila datos y que el acceso a todos los sitios es opcional.
- **Icono**: `icons/128.jpeg`.
- **Capturas**: hechas en `docs/store/es` y `docs/store/en` (1280×800, cinco diseños, sobre fondo opaco). Las de `docs/screenshots` (356×172) no valen: la tienda exige mínimo 640×400.
- **Teselas promocionales**: la pequeña (440×280) está en `docs/store/tile-440x280.png`; la grande es opcional.
- **Idioma por defecto**: es (`default_locale`); añadir la ficha en en.

## Justificación de permisos (para la revisión)

Texto base para el campo «justificación» de cada permiso; modelo de amenazas en [`SECURITY.md`](../SECURITY.md).

| Permiso | Justificación |
|---|---|
| `storage` | Guarda ajustes y volumen por sitio (local) y las sesiones de la ventana aparte (sesión). |
| `contextMenus` | Menú del icono: tema y captura de audio. |
| `scripting` | Inyecta el reproductor en la pestaña y lo muestra u oculta. |
| `activeTab` | Inyecta el reproductor en la pestaña activa al pulsar el icono o el atajo, sin pedir acceso a sitios. |
| `tabCapture` | Solo si el usuario activa la captura: alimenta el visualizador. El audio no se graba, no se guarda ni se envía; el navegador muestra su indicador. Esperar preguntas del revisor. |
| `offscreen` | Documento interno que analiza el audio capturado (el service worker no tiene `AudioContext`). Esperar preguntas del revisor. |
| `optional_host_permissions: <all_urls>` | Opcional, no se pide al instalar. El usuario lo concede en Ajustes para que el reproductor aparezca solo en cualquier página y para descargar carátulas sin CORS. Sin él funciona con `activeTab`. Las descargas pasan por `net-guard.js` (solo `http(s)` público, sin credenciales ni redirecciones, solo imágenes, 5 MB y 8 s). |

Puntos que la revisión suele observar: sin código remoto, `eval` ni `new Function` (lo comprueba `npm run security`), y que el aviso de acceso a sitios solo aparece al conceder el permiso opcional.

## Privacidad

- **Política pública**: [`PRIVACY.md`](../PRIVACY.md) publicado con URL estable: <https://github.com/eduulopezs/nav-miniplayer/blob/main/PRIVACY.md>. Esa URL va en el campo de política de privacidad de la ficha.
- **Declaración de uso de datos** (pestaña Privacidad del panel):
  - Un único propósito: controlar y mostrar el audio/vídeo de la pestaña en un minirreproductor flotante.
  - No se recopilan datos de usuario; no se marcan las categorías de datos recopilados.
  - Se marcan las tres certificaciones: no se venden datos, no se usan para fines ajenos al propósito único, no se usan para solvencia ni préstamos.

## Pasos para enviar

1. Crear la cuenta de desarrollador y pagar la cuota.
2. Generar el zip de la versión y subirlo en el panel («Nuevo elemento»).
3. Rellenar ficha, capturas, permisos y privacidad con lo de este documento.
4. Enviar a revisión (típicamente de unos días); responder al revisor si pregunta por `tabCapture` u `offscreen`.
5. Tras la aprobación, enlazar la ficha en `README.md`.
6. Repetir en Edge Add-ons (Partner Center) con el mismo zip.

## Pendiente (fuera de este PR)

- Crear la cuenta de desarrollador y pagar la cuota (acción del mantenedor).
