# Publicar una versión

Las releases las genera el workflow [`release.yml`](../.github/workflows/release.yml) al subir un tag `vX.Y.Z`.

## Pasos

1. Sube `version` en `manifest.json` (y `package.json` si procede) y actualiza el changelog. Integra el cambio en `main` mediante PR. Antes, opcionalmente, ejecuta `npm run manual` para comprobar que la tarjeta aparece en sitios reales (termina con código 1 si alguno falla).
2. Desde `main` actualizado, crea el tag con el prefijo `v` y la misma versión que el manifest:

   ```sh
   git switch main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. El workflow:
   - comprueba que el tag coincide con `version` de `manifest.json` (si no, falla);
   - ejecuta `npm ci`, `npm test` y `npm run zip`;
   - calcula el SHA256 y genera una attestation de procedencia;
   - crea la GitHub Release con notas autogeneradas y adjunta `nav-miniplayer-X.Y.Z.zip` y `nav-miniplayer-X.Y.Z.zip.sha256`.

## Verificación

- Revisa en la pestaña Actions que el workflow `Release` terminó en verde y en Releases que están los dos ficheros.
- Comprueba el checksum con el zip y el `.sha256` descargados en la misma carpeta:

  ```sh
  sha256sum -c nav-miniplayer-X.Y.Z.zip.sha256
  ```

- Opcional, verifica la procedencia: `gh attestation verify nav-miniplayer-X.Y.Z.zip --repo eduulopezs/nav-miniplayer`.

## Si algo falla

Si el tag no coincide con el manifest o fallan los tests, el workflow no publica nada. Borra el tag (`git push origin :refs/tags/vX.Y.Z` y `git tag -d vX.Y.Z`), corrige y vuelve a etiquetar.
