// App instalable de Sabores de mi País.
// No guarda copias de las páginas: siempre se ve la última versión publicada.
// Solo muestra un aviso si no hay internet.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f3f4f7;color:#1c2333;text-align:center;padding:24px">' +
    '<div><h2 style="color:#7b2d3e">Sin conexión</h2><p>Revisá el wifi o los datos del celular y volvé a intentar.</p>' +
    '<button onclick="location.reload()" style="font:inherit;padding:12px 20px;border:0;border-radius:8px;background:#7b2d3e;color:#fff">Reintentar</button></div>',
    { headers: { 'content-type': 'text/html; charset=utf-8' } })));
});
