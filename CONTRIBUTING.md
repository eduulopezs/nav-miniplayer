# Guía de contribución

Gracias por tu interés en Nav Miniplayer. Esta guía resume cómo proponer cambios. Al participar aceptas el [Código de conducta](CODE_OF_CONDUCT.md).

## Flujo de trabajo

1. Abre (o elige) una **issue numerada** que describa el cambio o el fallo. Para dudas o ideas, empieza por ahí antes de escribir código.
2. Crea una **rama** desde `main` con un nombre descriptivo, por ejemplo `issue-123-volumen`.
3. Haz commits pequeños. Los mensajes van **en español**, en imperativo y sin prefijos de Conventional Commits (por ejemplo, `Corrige la expulsión de iframes caducados`).
4. Abre una **pull request** hacia `main` que referencie la issue (`Cierra #123`). Describe qué cambia y cómo lo has probado. La CI debe estar en verde.
5. Las PR se integran con **squash merge**: el título de la PR pasa a ser el mensaje del commit, así que cuídalo.

## Versionado

Seguimos [SemVer](https://semver.org/lang/es/). La versión vive **solo en `manifest.json`** (no la dupliques en otros ficheros). Se sube en cada PR funcional: parche para correcciones, menor para funciones nuevas compatibles, mayor para cambios incompatibles. Las PR que solo tocan documentación o CI no la suben. Anota el cambio en [CHANGELOG.md](CHANGELOG.md) y, para publicar, sigue [docs/RELEASING.md](docs/RELEASING.md).

## Entorno de desarrollo

Requisitos: Node.js 22 o superior y un navegador Chromium (Chrome o Edge).

```sh
npm ci          # instala las dependencias exactas del lockfile
npm test        # tokens, comprobaciones estáticas, contraste, seguridad y smoke
npm run e2e     # tests de extremo a extremo con Playwright
npm run zip     # empaqueta la extensión
npm run manual  # prueba manual contra sitios reales (YouTube, Spotify, SoundCloud, Twitch, Vimeo)
```

Ejecuta `npm test` antes de cada commit y `npm run e2e` cuando toques comportamiento visible. `npm run manual` abre sitios reales con la extensión cargada y no forma parte del CI: un fallo aislado puede deberse a cookies, regiones o bloqueos del sitio y no a la extensión.

### Cargar la extensión descomprimida

1. Abre `chrome://extensions` (o `edge://extensions`).
2. Activa el **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y elige la carpeta raíz del repositorio (donde está `manifest.json`).
4. Tras editar el código, pulsa el botón de recargar de la extensión.

## Internacionalización

- Todo texto visible para el usuario va en `_locales/en/messages.json` y `_locales/es/messages.json`.
- Cada clave debe existir en **ambos** idiomas, con el mismo nombre y los mismos marcadores de posición.
- No escribas cadenas literales en el código ni en el manifest: usa `chrome.i18n` o `__MSG_clave__`.

## Diseño

Los colores, escalas y demás valores de diseño tienen una única fuente en [`design/tokens.json`](design/tokens.json). No pongas valores sueltos en los estilos: añade o reutiliza un token y regenera con `npm run tokens`. `npm test` comprueba que los tokens existan, se usen y cumplan el contraste.

## Seguridad

- Nada de `eval`, `new Function` ni de cargar o ejecutar código remoto.
- No añadas permisos nuevos (ni amplíes `host_permissions`) sin justificarlo en la PR. Consulta [SECURITY.md](SECURITY.md) para las decisiones sobre permisos.
- No registres ni envíes datos del usuario; consulta [PRIVACY.md](PRIVACY.md).
- Si encuentras una vulnerabilidad, **no abras una issue pública**: sigue las instrucciones de [SECURITY.md](SECURITY.md).

## Antes de abrir la PR

- [ ] `npm test` pasa (y `npm run e2e` si procede).
- [ ] La versión de `manifest.json` está subida si el cambio es funcional.
- [ ] `CHANGELOG.md` actualizado en la sección «Sin publicar».
- [ ] Textos añadidos en `_locales/en` y `_locales/es`.
- [ ] Sin permisos nuevos injustificados.
