const CACHE_NAME = 'assistir-dinamico-v1';

// Aqui ficam apenas os arquivos do "esqueleto" do site.
// NENHUM .json precisa ser colocado aqui!
const arquivosEstaticos = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./icon-192.png",
    "./icon-512.png"
];

// Instalação: Salva o esqueleto do site
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(arquivosEstaticos);
        })
    );
    self.skipWaiting();
});

// Ativação: Limpa os caches antigos se houver atualização
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Interceptação Dinâmica (A Mágica)
self.addEventListener('fetch', event => {
    event.respondWith(
        // Passo 1: Tenta pegar o arquivo da internet (Network First)
        fetch(event.request).then(respostaDaInternet => {
            
            // Passo 2: Se deu certo, ele abre o cache e guarda uma cópia atualizada
            // Isso salva automaticamente os filmes.json, filmes4.json, etc!
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, respostaDaInternet.clone());
                return respostaDaInternet;
            });

        }).catch(() => {
            // Passo 3: Se deu erro (Celular offline/Sem internet), ele procura a última cópia salva no cache
            return caches.match(event.request);
        })
    );
});