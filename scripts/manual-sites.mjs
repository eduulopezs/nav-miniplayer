// Prueba manual asistida: abre sitios reales con la extensión cargada y comprueba que aparece la tarjeta y que los controles actúan.
// Uso: npm run manual [-- filtro]. Termina con código 1 si algún sitio no muestra la tarjeta o falla (útil antes de una release).
// Depende de sitios reales (cookies, bloqueos por región o por navegador sin interfaz): un fallo aislado puede no ser de la extensión.
import { launch, sleep } from '../tests/e2e/helpers.mjs';

const SITES = [
  ['YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  ['YouTube Music', 'https://music.youtube.com/watch?v=dQw4w9WgXcQ'],
  ['Spotify Web', 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'],
  ['SoundCloud', 'https://soundcloud.com/forss/flickermood'],
  ['Twitch', 'https://www.twitch.tv/lofigirl'],
  ['Vimeo (incrustado)', 'data:embed'],
];
const filter = process.argv[2];
const failed = [];
const env = await launch();
const { ctx, sw } = env;
await sw.evaluate(() => chrome.storage.local.set({ mp_mode: 'card' }));

const findNode = (n, pred, out = []) => { if (pred(n)) out.push(n); for (const c of [...(n.children || []), ...(n.shadowRoots || [])]) findNode(c, pred, out); return out; };
const attr = (n, k) => { const a = n.attributes || []; const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const hasClass = (n, c) => (attr(n, 'class') || '').split(/\s+/).includes(c);
// Los botones se buscan por data-act (desde 1.5.0 no llevan clase) y se usa el primero visible: cada diseño repite algunos según el formato.
const visible = async (cdp, n) => { try { const q = (await cdp.send('DOM.getBoxModel', { backendNodeId: n.backendNodeId })).model.border; return Math.abs(q[2] - q[0]) > 0 && Math.abs(q[5] - q[1]) > 0 ? q : null; } catch (_) { return null; } };
const byAct = async (cdp, root, act) => { for (const n of findNode(root, (x) => attr(x, 'data-act') === act)) if (await visible(cdp, n)) return n; return null; };

async function probe(name, url) {
  const r = { name, url, notes: [] };
  const page = await ctx.newPage();
  try {
    if (url === 'data:embed') {
      await page.route('https://embed.test/', (rt) => rt.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Embed</title><iframe src="https://player.vimeo.com/video/76979871" width=640 height=360 allow="autoplay"></iframe>' }));
      await page.goto('https://embed.test/', { timeout: 30000 });
    } else await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(6000);
    // Intenta cerrar avisos de cookies habituales y arrancar la reproducción.
    for (const t of ['Accept all', 'Aceptar todo', 'Accept', 'Aceptar', 'Reject all', 'I agree', 'Acepto']) {
      const b = page.getByRole('button', { name: t, exact: false }).first();
      if (await b.count().catch(() => 0)) { await b.click({ timeout: 1500 }).catch(() => {}); break; }
    }
    await sleep(1500);
    const frames = page.frames();
    r.frames = frames.length;
    let played = false;
    for (const f of frames) {
      const ok = await f.evaluate(async () => {
        const m = [...document.querySelectorAll('video,audio')].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
        if (!m) return false;
        try { m.muted = false; await m.play(); } catch (e) { return false; }
        return !m.paused;
      }).catch(() => false);
      if (ok) { played = true; r.playedIn = f === page.mainFrame() ? 'top' : 'iframe'; break; }
    }
    if (!played) {
      // Último recurso: botón de reproducir visible.
      for (const sel of ['button[aria-label*="Play" i]', 'button[title*="Play" i]', '[data-a-target="player-play-pause-button"]', 'button.ytp-large-play-button', '.playButton', 'button[aria-label*="Reproducir" i]']) {
        const b = page.locator(sel).first();
        if (await b.count().catch(() => 0)) { await b.click({ timeout: 2000 }).catch(() => {}); await sleep(2500); break; }
      }
    }
    await sleep(2000);
    const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ active: true }))[0]?.id);
    const cdp = await ctx.newCDPSession(page);
    const state = async () => {
      const root = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })).root;
      const card = findNode(root, (n) => hasClass(n, 'card'))[0], play = await byAct(cdp, root, 'play');
      return { shown: !!card && hasClass(card, 'show'), label: play ? attr(play, 'aria-label') : null };
    };
    const cur = page.url();
    const mineId = await sw.evaluate(async (u) => (await chrome.tabs.query({})).find((t) => t.url === u)?.id, cur);
    await sw.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, func: () => globalThis.__NMP?.toggle?.() }), mineId);
    for (let i = 0; i < 20; i++) { await sleep(400); r.card = await state(); if (r.card.shown) break; }
    if (r.card.shown) {
      const mediaState = async () => { for (const f of page.frames()) { const v = await f.evaluate(() => { const m = [...document.querySelectorAll('video,audio')].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0]; return m ? [m.paused, m.currentTime] : null; }).catch(() => null); if (v) return v; } return null; };
      const click = async (cls) => { const root = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })).root; const n = await byAct(cdp, root, cls); const q = await visible(cdp, n); await page.mouse.click((q[0] + q[4]) / 2, (q[1] + q[5]) / 2); await sleep(1200); };
      const a = await mediaState(); await click('play'); const b = await mediaState(); await click('play'); const c = await mediaState();
      r.controls = { antes: a, trasPulsar: b, trasOtraVez: c, pausa: !!a && !!b && a[0] !== b[0], reanuda: !!b && !!c && b[0] !== c[0] };
      const t0 = c ? c[1] : 0; await click('fwd'); const d = await mediaState(); r.controls.adelante10 = !!d && d[1] >= t0 + 8;
    }
    r.shot = `tests/e2e/__shots__/site-${name.replace(/\W+/g, '_')}.png`;
    await page.screenshot({ path: r.shot }).catch(() => {});
    r.title = await page.title();
  } catch (e) { r.notes.push('error: ' + e.message.split('\n')[0]); }
  finally { await page.close().catch(() => {}); }
  return r;
}

for (const [name, url] of SITES) {
  if (filter && !name.toLowerCase().includes(filter.toLowerCase())) continue;
  // Un sitio que se cuelga no debe bloquear el resto.
  const r = await Promise.race([probe(name, url), sleep(90000).then(() => ({ name, url, notes: ['tiempo agotado (90 s)'] }))]);
  console.log(JSON.stringify(r));
  if (!r.card || !r.card.shown || r.notes.length) failed.push(name);
}
await env.close();
if (failed.length) { console.error('Sin tarjeta o con error: ' + failed.join(', ')); process.exitCode = 1; }
