const CACHE = "replayout-v1";

const arquivos = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./filmes.json",
    "./icon-192.png",
    "./icon-512.png"
];

// Instalação e Cache
self.addEventListener("install", e => {
    // Força a atualização imediata do Service Worker
    self.skipWaiting(); 
    
    e.waitUntil(
        caches.open(CACHE)
        .then(cache => {
            return cache.addAll(arquivos);
        })
    );
});

// Ativação e Controle
self.addEventListener("activate", e => {
    // Assume o controle das abas abertas imediatamente
    e.waitUntil(self.clients.claim());
});

// Interceptação de Rede (Busca no cache primeiro)
self.addEventListener("fetch", e => {
    e.respondWith(
        caches.match(e.request)
        .then(resp => {
            return resp || fetch(e.request);
        })
    );
});