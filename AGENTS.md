# Guía para agentes de IA

Extensión MV3 de Chrome/Edge: minirreproductor flotante para el audio/vídeo de la pestaña. JavaScript plano (módulos ES), sin bundler. Node >= 22.

## Estructura de `src/`
- `background/`: service worker (`service-worker.js`), inyección (`injection.js`), sesiones (`sessions.js`), migraciones (`migrate.js`) y la protección de red (`net-guard.js`).
- `content/`: content scripts del reproductor (`player.js`, `media.js`, `menu.js`, `storyboard.js`, `viz.js`, `styles.js`, `tokens.js`, ...) y `skins/` (crt, glass, metal, minimal, noir, ansi).
- `page/`: puente de Media Session en el mundo MAIN (`media-session-bridge.js`).
- `offscreen/`: documento offscreen que analiza el audio capturado.
- `window/`: ventana aparte del reproductor.
- `options/`: página de ajustes.
- `fonts/`: fuentes locales (licencias en `LICENSES.txt`).

Fuera de `src/`: `manifest.json`, `_locales/`, `design/tokens.json`, `scripts/` (comprobaciones), `tests/e2e/` (Playwright).

## Comandos
- `npm ci`: instala dependencias.
- `npm test`: `check` (tokens, estructura, contraste) + `security` + `smoke`. Debe pasar antes de abrir un PR.
- `npm run e2e`: tests end-to-end con Playwright (abren Chrome con la extensión cargada).
- `npm run zip`: empaqueta la extensión en `dist/nav-miniplayer-<versión>.zip`.
- `npm run tokens`: regenera `src/content/tokens.js` a partir de `design/tokens.json`.

## Convenciones
- Commits y PR en español, con mensajes claros.
- La versión vive solo en `manifest.json` y se sube en cada PR funcional (no en PR de solo documentación). No la dupliques en otros ficheros.
- i18n: toda cadena visible va en `_locales/en/messages.json` y `_locales/es/messages.json`, con las mismas claves en ambos.
- Los tokens de diseño se editan en `design/tokens.json`; ejecuta `npm run tokens` y no edites a mano `src/content/tokens.js`.
- Respeta `.editorconfig`.

## Seguridad
Lee `SECURITY.md` (modelo de amenazas) antes de tocar red, inyección o mensajería.
- Sin `eval`, `new Function` ni código remoto; todo el código va empaquetado.
- No añadas permisos ni permisos de host al manifest sin justificarlo en el PR.
- Toda petición de red pasa por `src/background/net-guard.js`.
- Trata como hostiles los datos de la página (Media Session, DOM) y valídalos en el service worker.
- `npm run security` comprueba parte de estas reglas.

## Qué no tocar ni commitear
- Secretos, credenciales, `.env` o claves.
- `.claude/` (configuración y worktrees locales de agentes) y cualquier otro estado local.
- `dist/`, `node_modules/`, `*.zip`, `tests/e2e/__shots__/` (ya ignorados en `.gitignore`).

## Flujo de PR
Issue -> rama propia desde `main` -> PR -> merge con squash. Un PR por cambio, con `npm test` en verde.
