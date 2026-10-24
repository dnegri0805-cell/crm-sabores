// App instalable de Sabores de mi País.
// Arranque rápido: la app se abre al instante desde la copia guardada en el celular
// y en segundo plano se baja la última versión publicada. Si hay una versión nueva,
// la página la detecta (version.json) y se recarga sola con la nueva.
// Los datos (clientes, pedidos, precios) NUNCA se guardan acá: siempre vienen de la base.
const CACHE = 'sabores-v2';
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<body style="font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f3f4f7;color:#1c2333;text-align:center;padding:24px">' +
  '<div><h2 style="color:#7b2d3e">Sin conexión</h2><p>Revisá el wifi o los datos del celular y volvé a intentar.</p>' +
  '<button onclick="location.reload()" style="font:inherit;padding:12px 20px;border:0;border-radius:10px;background:#7b2d3e;color:#fff">Reintentar</button></div>';
const offline = () => new Response(OFFLINE, { headers: { 'content-type': 'text/html; charset=utf-8' } });

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

// Clave de la copia: la página sin parámetros (pedido.html?c=… usa la misma copia que pedido.html)
const clave = u => { let p = u.pathname; if (p.endsWith('/')) p += 'index.html'; return u.origin + p; };
const guardar = async (k, res) => { if (res && res.ok && res.type !== 'opaque') { const c = await caches.open(CACHE); await c.put(k, res.clone()); } return res; };
const ESTATICOS = /\.(png|jpg|jpeg|webp|svg|webmanifest|woff2?)$/i;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  // Librerías con versión fija y tipografías: se bajan una sola vez
  if (u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com') {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => guardar(req, res))));
    return;
  }
  if (u.origin !== location.origin) return; // Supabase y demás: siempre a la red

  const esPagina = req.mode === 'navigate' || /\.html$/.test(u.pathname) || u.pathname.endsWith('/');
  if (esPagina) {
    const k = clave(u);
    // Recarga pedida por una versión nueva (?v=…): primero la red
    if (u.searchParams.has('v') || u.searchParams.has('nc')) {
      e.respondWith(fetch(req).then(res => guardar(k, res)).catch(() => caches.match(k).then(r => r || offline())));
      return;
    }
    // Normal: abre al instante con la copia guardada y la actualiza en segundo plano
    e.respondWith((async () => {
      const copia = await caches.match(k);
      const red = fetch(req).then(res => guardar(k, res));
      if (copia) { e.waitUntil(red.catch(() => {})); return copia; }
      return red.catch(() => offline());
    })());
    return;
  }
  if (ESTATICOS.test(u.pathname) && !u.pathname.includes('/fotos/') && !u.pathname.includes('/folletos/')) {
    e.respondWith((async () => {
      const copia = await caches.match(req);
      const red = fetch(req).then(res => guardar(req, res));
      if (copia) { e.waitUntil(red.catch(() => {})); return copia; }
      return red;
    })());
  }
  if (/\.js$/.test(u.pathname)) { // familias.js: abre al instante con la copia y la actualiza en segundo plano
    e.respondWith((async () => {
      const copia = await caches.match(req);
      const red = fetch(req).then(res => guardar(req, res));
      if (copia) { e.waitUntil(red.catch(() => {})); return copia; }
      return red.catch(() => caches.match(req));
    })());
    return;
  }
  // version.json, manual.md, fotos: siempre a la red (el navegador usa su propia caché)
});
