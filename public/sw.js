// Service worker: permite instalar o sistema como aplicativo e ABRIR SEM INTERNET.
// - Guarda no aparelho a página, o código, os estilos, as fontes, o logo e os ícones.
// - Os dados (pontos, membros, tesouraria…) ficam no cache do próprio Firebase,
//   que também funciona offline e sincroniza quando a conexão volta.
const CACHE = 'pinheiros-app-v4';
const MATCH = { ignoreVary: true, ignoreSearch: false };
const FONTS = 'pinheiros-fonts-v1';

const STATIC = [
  './',
  './logo.png',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './manifest.webmanifest',
  './unidades/pau-brasil.png',
  './unidades/cedro.png',
  './unidades/chorao.png',
  './unidades/ipe.png',
];

// Lê a página inicial e descobre os arquivos do app (JS e CSS com nome versionado)
async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(STATIC.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
  try {
    const html = await (await fetch('./', { cache: 'reload' })).text();
    const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
    await Promise.allSettled(assets.map((u) => cache.add(u)));
  } catch {
    /* sem internet na instalação: os arquivos serão guardados no próximo acesso */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Página: busca a versão mais nova; sem internet, abre a última guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          // guarda também os arquivos da versão nova
          res
            .clone()
            .text()
            .then((html) => {
              const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
              caches.open(CACHE).then((c) => Promise.allSettled(assets.map((u) => c.add(new URL(u, url).href))));
            })
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match('./', MATCH)),
    );
    return;
  }

  // Fontes do Google: usa a guardada e atualiza em segundo plano
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req, MATCH);
        const net = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // Firebase e outros: direto pela rede

  // Arquivos do app com nome versionado: nunca mudam, então usa o guardado
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req.url, MATCH).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Demais arquivos (ícones, logos): rede primeiro, guardado se estiver offline
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      })
      .catch(() => caches.match(req.url, MATCH)),
  );
});
