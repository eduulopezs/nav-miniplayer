// Reglas de red para descargar carátulas desde el service worker (importScripts) y para los tests (scripts/security.mjs).
// La URL la decide la página, así que se trata como entrada hostil: solo http(s) público, sin credenciales ni puertos raros.
(function (g) {
  const MAX_URL = 2048;
  const BLOCKED_SUFFIX = /\.(localhost|local|internal|lan|home|home\.arpa|corp|intranet|test|invalid|example)$/;

  function isPrivateV4(h) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
    if (!m) return false;
    const a = +m[1], b = +m[2];
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }

  // Devuelve true si la URL es segura de descargar desde el service worker.
  function isAllowedArtworkUrl(input) {
    if (typeof input !== 'string' || input.length > MAX_URL) return false;
    let u;
    try { u = new URL(input); } catch (_) { return false; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (u.username || u.password) return false;
    if (u.port && u.port !== '80' && u.port !== '443') return false;
    const h = u.hostname.toLowerCase().replace(/\.$/, '');
    if (!h || h === 'localhost' || BLOCKED_SUFFIX.test(h)) return false;
    if (h.startsWith('[')) return false; // literales IPv6: no se admiten (loopback, ULA, link-local, IPv4 mapeada...)
    if (isPrivateV4(h)) return false;
    if (/^[\d.]+$/.test(h)) return false; // IPv4 incompleta o rara que el navegador no normalizó
    if (!h.includes('.')) return false; // nombres de intranet sin dominio (p. ej. "router", "nas")
    return true;
  }

  // Las hojas del storyboard de YouTube solo se piden a los servidores de miniaturas de YouTube, por https.
  function isStoryboardUrl(input) {
    return isAllowedArtworkUrl(input) && /^https:\/\/([\w-]+\.)*ytimg\.com[:/]/i.test(input);
  }

  // Identifica el formato por sus primeros bytes (no se fía del Content-Type). SVG queda fuera a propósito.
  // Con ico=true también admite .ico (solo para favicons; las carátulas no lo necesitan).
  function sniffImage(b, ico) {
    if (!b || b.length < 12) return null;
    const eq = (off, s) => [...s].every((c, i) => b[off + i] === c.charCodeAt(0));
    if (b[0] === 0x89 && eq(1, 'PNG')) return 'image/png';
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (eq(0, 'GIF8')) return 'image/gif';
    if (eq(0, 'RIFF') && eq(8, 'WEBP')) return 'image/webp';
    if (eq(4, 'ftyp') && (eq(8, 'avif') || eq(8, 'avis'))) return 'image/avif';
    if (ico && b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'image/x-icon';
    return null;
  }

  g.NMPNet = { isAllowedArtworkUrl, isStoryboardUrl, sniffImage, MAX_URL };
})(typeof self !== 'undefined' ? self : globalThis);
