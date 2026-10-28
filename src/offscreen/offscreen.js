// Documento offscreen: recibe el audio de una pestaña (tabCapture), lo analiza y manda solo el espectro al reproductor de esa pestaña.
// El audio no sale de aquí: se devuelve a los altavoces tal cual (la captura silencia la pestaña si no se reconecta) y a la página
// solo llegan números (bandas de frecuencia y forma de onda), por un puerto que solo existe entre la extensión y su content script.
const caps = new Map(); // tabId -> { stream, ctx, an, ports:Set, timer }
const FFT = 2048, FPS = 30; // 2048 da bandas de ~23 Hz: separa bien los graves, que con 512 caían todos en los primeros contenedores

async function start(tabId, streamId) {
  if (caps.has(tabId)) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }, video: false });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser();
  an.fftSize = FFT; an.smoothingTimeConstant = 0.3; // el suavizado fino lo hace el motor del visualizador; aquí se deja reaccionar rápido
  src.connect(an); src.connect(ctx.destination);
  const cap = { stream, ctx, an, ports: new Set(), timer: 0 };
  const f = new Uint8Array(an.frequencyBinCount), t = new Uint8Array(an.fftSize);
  cap.timer = setInterval(() => {
    if (!cap.ports.size) return;
    an.getByteFrequencyData(f); an.getByteTimeDomainData(t);
    const msg = { f: Array.from(f), t: Array.from(t.subarray(0, 128)), r: ctx.sampleRate };
    for (const p of cap.ports) { try { p.postMessage(msg); } catch (_) { /* puerto cerrado */ } }
  }, 1000 / FPS);
  stream.getAudioTracks().forEach((tr) => tr.addEventListener('ended', () => stop(tabId)));
  caps.set(tabId, cap);
  setTimeout(() => { if (caps.get(tabId) === cap && !cap.ports.size) stop(tabId); }, 4000); // si el reproductor no está visible para recibirla, no se captura
}

function stop(tabId) {
  const cap = caps.get(tabId);
  if (!cap) return;
  caps.delete(tabId);
  clearInterval(cap.timer);
  cap.stream.getTracks().forEach((tr) => tr.stop());
  cap.ctx.close().catch(() => {});
  for (const p of cap.ports) { try { p.disconnect(); } catch (_) { /* ya cerrado */ } }
  if (!caps.size) chrome.runtime.sendMessage({ type: 'cap-idle' }).catch(() => {});
}

chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.tab || !m || m.target !== 'offscreen' || !Number.isInteger(m.tabId)) return;
  if (m.type === 'cap-start' && typeof m.streamId === 'string') { start(m.tabId, m.streamId).then(() => reply({ ok: true }), () => reply({ ok: false })); return true; }
  if (m.type === 'cap-stop') { stop(m.tabId); reply({ ok: true }); }
});

// El content script de la pestaña se conecta cuando se muestra y se desconecta al ocultarse; sin puertos, se corta la captura.
chrome.runtime.onConnect.addListener((port) => {
  const tabId = port.sender && port.sender.tab && port.sender.tab.id;
  const cap = caps.get(tabId);
  if (port.name !== 'viz' || port.sender.id !== chrome.runtime.id || !cap) { port.disconnect(); return; }
  cap.ports.add(port);
  port.onDisconnect.addListener(() => { cap.ports.delete(port); if (!cap.ports.size) setTimeout(() => { if (caps.get(tabId) === cap && !cap.ports.size) stop(tabId); }, 1500); });
});
