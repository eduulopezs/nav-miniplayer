// Prueba manual asistida: abre sitios reales con la extensión cargada y comprueba que aparece la tarjeta y que los controles actúan.
// Uso: npm run manual [-- filtro]. Termina con código 1 si algún sitio no muestra la tarjeta, falla un control (pausa, reanuda, +10 s) o da error (útil antes de una release).
// Depende de sitios reales (cookies, bloqueos por región o por navegador sin interfaz): un fallo aislado puede no ser de la extensión.
import { launch, sleep, find, attr, hasClass } from '../tests/e2e/helpers.mjs';

const SITES = [
  ['YouTube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  ['YouTube Music', 'https://music.youtube.com/watch?v=dQw4w9WgXcQ'],
  ['Spotify Web', 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'],
  ['SoundCloud', 'https://soundcloud.com/forss/flickermood'],
  ['Twitch', 'https://www.twitch.tv/lofigirl'],
  ['Vimeo (incrustado)', 'data:embed'],
];
const filter = process.argv[2];
const sites = SITES.filter(([name]) => !filter || name.toLowerCase().includes(filter.toLowerCase()));
if (!sites.length) { console.error(`Ningún sitio coincide con "${filter}".`); process.exit(1); }

// Los botones se buscan por data-act (desde 1.5.0 no llevan clase) y se usa el primero visible: cada diseño repite algunos según el formato.
const visible = async (cdp, n) => { try { const q = (await cdp.send('DOM.getBoxModel', { backendNodeId: n.backendNodeId })).model.border; return Math.abs(q[2] - q[0]) > 0 && Math.abs(q[5] - q[1]) > 0 ? q : null; } catch (_) { return null; } };
const byAct = async (cdp, root, act) => { for (const n of find(root, (x) => attr(x, 'data-act') === act)) if (await visible(cdp, n)) return n; return null; };

// Medio principal de un marco: el de mayor duración. Devuelve [en pausa, tiempo, ¿duración finita? (falso en directos)].
const mainMedia = () => { const m = [...document.querySelectorAll('video,audio')].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0]; return m ? [m.paused, m.currentTime, Number.isFinite(m.duration)] : null; };

async function probe(env, page, tabId, name, url) {
  const { ctx, sw } = env;
  const r = { name, url, tabId, notes: [] };
  try {
    if (url === 'data:embed') {
      await page.route('https://embed.test/', (rt) => rt.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Embed</title><iframe src="https://player.vimeo.com/video/76979871" width=640 height=360 allow="autoplay"></iframe>' }));
      await page.goto('https://embed.test/', { timeout: 30000 });
    } else await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(6000);
    // Cierra el aviso de cookies habitual: solo botones cuyo nombre es exactamente uno de estos, para no pulsar otros ajenos.
    for (const t of ['Accept all', 'Aceptar todo', 'Accept', 'Aceptar', 'I agree', 'Acepto']) {
      const b = page.getByRole('button', { name: t, exact: true }).first();
      if (await b.count().catch(() => 0) && await b.click({ timeout: 1500 }).then(() => true, () => false)) break;
    }
    await sleep(1500);
    r.frames = page.frames().length;
    let played = false;
    for (const f of page.frames()) {
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
    const cdp = await ctx.newCDPSession(page);
    const state = async () => {
      const root = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })).root;
      // La tarjeta vive en un shadow root: se ignora cualquier .card que tenga la propia página.
      const card = find(root, (n) => (n.shadowRoots || []).length).flatMap((n) => n.shadowRoots.flatMap((s) => find(s, (x) => hasClass(x, 'card'))))[0], play = await byAct(cdp, root, 'play');
      return { shown: !!card && hasClass(card, 'show'), label: play ? attr(play, 'aria-label') : null };
    };
    // La tarjeta puede haberse mostrado sola al empezar a reproducir: alternar entonces la ocultaría.
    for (let i = 0; i < 8; i++) { r.card = await state(); if (r.card.shown) break; await sleep(400); }
    if (!r.card.shown) {
      await sw.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, func: () => globalThis.__NMP?.toggle?.() }), tabId);
      for (let i = 0; i < 20; i++) { await sleep(400); r.card = await state(); if (r.card.shown) break; }
    }
    if (r.card.shown) {
      const mediaState = async () => { for (const f of page.frames()) { const v = await f.evaluate(mainMedia).catch(() => null); if (v) return v; } return null; };
      const click = async (act) => {
        const root = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })).root;
        const q = await byAct(cdp, root, act).then((n) => n && visible(cdp, n));
        if (!q) throw new Error(`no hay botón visible "${act}"`);
        await page.mouse.click((q[0] + q[4]) / 2, (q[1] + q[5]) / 2); await sleep(1200);
      };
      const a = await mediaState(); await click('play'); const b = await mediaState(); await click('play'); const c = await mediaState();
      r.controls = { antes: a, trasPulsar: b, trasOtraVez: c, pausa: !!a && !!b && a[0] !== b[0], reanuda: !!b && !!c && b[0] !== c[0] };
      // En un directo no se puede avanzar: no cuenta como fallo.
      if (c && !c[2]) r.controls.adelante10 = null;
      else { const t0 = c ? c[1] : 0; await click('fwd'); const d = await mediaState(); r.controls.adelante10 = !!d && d[1] >= t0 + 8; }
    }
    r.shot = `tests/e2e/__shots__/site-${name.replace(/\W+/g, '_')}.png`;
    await page.screenshot({ path: r.shot }).catch(() => {});
    r.title = await page.title();
  } catch (e) { r.notes.push('error: ' + e.message.split('\n')[0]); }
  return r;
}

const failed = [];
const env = await launch();
try {
  await env.sw.evaluate(() => chrome.storage.local.set({ mp_inpage: true }));
  for (const [name, url] of sites) {
    const ids = async () => new Set(await env.sw.evaluate(async () => (await chrome.tabs.query({})).map((t) => t.id)));
    const before = await ids();
    const page = await env.ctx.newPage();
    // La pestaña nueva es la única cuyo id no estaba antes (la URL puede cambiar por redirecciones o hash).
    const tabId = [...await ids()].find((id) => !before.has(id));
    // Un sitio que se cuelga no debe bloquear el resto: al vencer el plazo se cierra la pestaña, lo que corta la sonda.
    const run = probe(env, page, tabId, name, url);
    let timer;
    const r = await Promise.race([run, new Promise((ok) => { timer = setTimeout(() => ok({ name, url, notes: ['tiempo agotado (90 s)'] }), 90000); })]);
    clearTimeout(timer);
    await page.close().catch(() => {});
    await run; // espera a que la sonda termine de verdad antes de pasar al sitio siguiente
    console.log(JSON.stringify(r));
    const c = r.controls || {};
    const why = [];
    if (!r.card || !r.card.shown) why.push('sin tarjeta');
    if (r.card && r.card.shown) for (const k of ['pausa', 'reanuda', 'adelante10']) if (c[k] === false) why.push('falla ' + k);
    if (r.notes.length) why.push(r.notes[0]);
    if (why.length) failed.push(`${name} (${why.join(', ')})`);
  }
} finally { await env.close(); }
if (failed.length) { console.error('Fallos:\n- ' + failed.join('\n- ')); process.exitCode = 1; }
