let catalogo = { filmes: [] }; 

// 👇 ADICIONE AQUI OS NOMES DOS SEUS ARQUIVOS JSON 👇
const arquivosDeListas = ["filmes.json", "filmes1.json", "filmes2.json"];

const lista = document.getElementById("listaFilmes");
const pesquisa = document.getElementById("pesquisa");
const btnFavoritos = document.getElementById("btnFavoritos");

// Modal
const modal = document.getElementById("modal");
const modalTitulo = document.getElementById("modalTitulo");
const modalLinks = document.getElementById("modalLinks");
const fecharModal = document.getElementById("fecharModal");
const seletorTemporadas = document.getElementById("seletorTemporadas");
const seletorContainer = document.getElementById("seletorTemporadas Container");

// Player Integrado
const playerContainer = document.getElementById("playerContainer");
const videoPlayer = document.getElementById("videoPlayer");
const playerTitulo = document.getElementById("playerTitulo");
const fecharPlayer = document.getElementById("fecharPlayer");

let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
let modoFavoritos = false;

// Variáveis de Histórico
let historico = JSON.parse(localStorage.getItem("historico")) || {};
let midiaAtualKey = null; 
let ultimoTempoSalvo = 0;

/* ---------------- UTIL ---------------- */
function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/* ---------------- CARREGAR DADOS (BUSCA AUTOMÁTICA) ---------------- */
window.onload = async () => {
    let todosOsFilmes = [];
    let contador = 0;
    let buscando = true;

    // O "Radar": Vai testar os arquivos em sequência até não achar mais nenhum
    while (buscando) {
        // Regra de nomenclatura: o primeiro é 'filmes.json', os próximos são 'filmes1.json', 'filmes2.json', etc.
        let nomeArquivo = contador === 0 ? "filmes.json" : `filmes${contador}.json`;

        try {
            const resposta = await fetch(nomeArquivo);
            
            if (resposta.ok) {
                // O arquivo existe! Baixa e processa.
                const dados = await resposta.json();
                const nomeLista = nomeArquivo.replace(".json", "");

                const filmesTratados = dados.filmes.map(f => {
                    f.origem = nomeLista;
                    f.idTratado = `${nomeLista}_${f.id}`;
                    return f;
                });

                todosOsFilmes = todosOsFilmes.concat(filmesTratados);
                contador++; // Prepara para buscar o próximo número
                
            } else {
                // Erro 404: Bateu na parede. Não achou o arquivo, então as listas acabaram.
                buscando = false; 
            }
        } catch (e) {
            // Falha de rede (ex: sem internet), encerra a busca para não travar o app
            console.warn(`Busca encerrada no arquivo ${nomeArquivo}`);
            buscando = false;
        }
    }

    catalogo.filmes = todosOsFilmes;
    mostrarMensagemInicial();
};

/* ---------------- MENSAGEM INICIAL E CONTINUAR ---------------- */
function mostrarMensagemInicial() {
    const ultimos = Object.entries(historico).sort((a, b) => b[1].data - a[1].data);
    const ultimo = ultimos.length > 0 ? ultimos[0] : null;

    let htmlContinuar = "";
    
    if (ultimo) {
        const idKey = ultimo[0];
        const dados = ultimo[1];
        const min = Math.floor(dados.tempo / 60);
        
        htmlContinuar = `
            <div class="card-continuar" onclick="retomarUltimo('${idKey}')">
                <h4 style="color: #e50914; margin-bottom: 8px;">▶ Continuar assistindo</h4>
                <p style="font-size: 16px; color: white;"><strong>${dados.titulo}</strong></p>
                <p style="font-size: 13px; color: #aaa; margin-top: 5px;">
                    Parou em ${min} min ${dados.concluido ? '(Finalizado ✅)' : ''}
                </p>
            </div>
        `;
    }

    lista.innerHTML = `
        <div style="text-align: center; margin-top: 60px; color: #666;">
            <h2 style="font-size: 50px; margin-bottom: 15px;">🍿</h2>
            <h3>O que vamos assistir hoje?</h3>
            <p style="margin-top: 10px; font-size: 16px;">Use a barra de pesquisa ou as letras acima para explorar o catálogo.</p>
            ${htmlContinuar}
        </div>
    `;
}

window.retomarUltimo = (key) => {
    const dados = historico[key];
    if (dados) {
        midiaAtualKey = key;
        playerTitulo.innerText = dados.titulo;
        videoPlayer.src = dados.url;
        
        const btnExterno = document.getElementById("linkExterno");
        btnExterno.href = dados.url;
        btnExterno.onclick = () => {
            historico[midiaAtualKey].concluido = true;
            localStorage.setItem("historico", JSON.stringify(historico));
            fecharEPararPlayer();
        };

        playerContainer.style.display = "flex";
        
        videoPlayer.onloadedmetadata = () => {
            videoPlayer.currentTime = dados.tempo;
        };
        videoPlayer.play().catch(e => console.log(e));
    }
};

/* ---------------- RENDERIZAR CARDS ---------------- */
function renderizar(listaFilmes) {
    lista.innerHTML = "";

    const limite = modoFavoritos ? listaFilmes.length : 50;
    const filmesParaExibir = listaFilmes.slice(0, limite);

    const fragmento = document.createDocumentFragment();

    filmesParaExibir.forEach(f => {
        // Agora verificamos se o ID tratado está nos favoritos
        const ehFavorito = favoritos.includes(f.idTratado);

        const div = document.createElement("div");
        div.className = "filme";

        // Aqui adicionamos a etiqueta indicando de qual arquivo JSON o filme veio
        div.innerHTML = `
            <div class="filme-info">
                <span>
                    ${f.titulo} 
                    <small style="color: #888; font-size: 12px; margin-left: 8px;">- ${f.origem}</small>
                </span>
                ${f.tipo === 'serie' ? '<span class="badge-serie">SÉRIE</span>' : ''}
                ${f.tipo === '24 horas' ? '<span class="badge-24h">24 HORAS</span>' : ''}
            </div>
            <span class="favorito">
                ${ehFavorito ? "❤️" : "🤍"}
            </span>
        `;

        div.onclick = () => abrirMidia(f);

        const coracao = div.querySelector(".favorito");
        coracao.onclick = (e) => {
            e.stopPropagation();
            if (favoritos.includes(f.idTratado)) {
                favoritos = favoritos.filter(id => id !== f.idTratado);
            } else {
                favoritos.push(f.idTratado);
            }
            localStorage.setItem("favoritos", JSON.stringify(favoritos));
            atualizarTela();
        };

        fragmento.appendChild(div);
    });

    lista.appendChild(fragmento);

    if (listaFilmes.length > limite) {
        const aviso = document.createElement("div");
        aviso.style.textAlign = "center";
        aviso.style.padding = "20px";
        aviso.style.color = "#888";
        aviso.style.fontSize = "14px";
        aviso.innerText = `+ ${listaFilmes.length - limite} resultados ocultos. Refine sua busca para encontrá-los.`;
        lista.appendChild(aviso);
    }
}

/* ---------------- CONTROLE DE TELA/FILTROS ---------------- */
function toggleFavoritos() {
    modoFavoritos = !modoFavoritos;
    btnFavoritos.innerText = modoFavoritos ? "🎬 Todos" : "❤ Favoritos";
    atualizarTela();
}

function atualizarTela() {
    if (modoFavoritos) {
        let listaAtual = catalogo.filmes.filter(f => favoritos.includes(f.idTratado));
        renderizar(listaAtual);
    } else {
        pesquisa.value = "";
        mostrarMensagemInicial();
    }
}

let timeoutBusca; 
pesquisa.oninput = () => {
    clearTimeout(timeoutBusca);

    timeoutBusca = setTimeout(() => {
        const txt = normalizar(pesquisa.value);

        if (txt === "" && !modoFavoritos) {
            mostrarMensagemInicial();
            return;
        }

        let listaFiltrada = catalogo.filmes;

        if (modoFavoritos) {
            listaFiltrada = listaFiltrada.filter(f => favoritos.includes(f.idTratado));
        }

        if (txt !== "") {
            listaFiltrada = listaFiltrada.filter(f => f.tituloBusca.includes(txt));
        }

        renderizar(listaFiltrada);
    }, 300); 
};

document.querySelectorAll("#letras button").forEach(btn => {
    btn.onclick = () => {
        pesquisa.value = "";
        const letra = btn.innerText;
        let listaFiltrada = catalogo.filmes;

        if (modoFavoritos) {
            listaFiltrada = listaFiltrada.filter(f => favoritos.includes(f.idTratado));
        }

        listaFiltrada = listaFiltrada.filter(f => f.grupo === letra);
        renderizar(listaFiltrada);
    };
});

btnFavoritos.onclick = toggleFavoritos;

/* ---------------- LÓGICA DE REPRODUÇÃO (MODAL & PLAYER) ---------------- */
function abrirMidia(midia) {
    modalTitulo.innerText = midia.titulo;
    modalLinks.innerHTML = "";

    // ➡️ Altere esta linha para aceitar "filme" OU "24 horas"
    if (midia.tipo === "filme" || midia.tipo === "24 horas") {
        seletorContainer.style.display = "none";
        
        const dadosHist = historico[midia.idTratado];
        const concluido = dadosHist && dadosHist.concluido;

        const btnPlay = document.createElement("a");
        btnPlay.className = "linkOpcao" + (concluido ? " ep-assistido" : "");
        btnPlay.href = "#";
        
        // Texto dinâmico baseado no tipo de conteúdo
        if (midia.tipo === "24 horas") {
            btnPlay.innerText = "▶ Emitir Canal ao Vivo";
        } else {
            btnPlay.innerText = concluido ? "▶ Assistir Novamente ✅" : "▶ Assistir Filme";
        }
        
        btnPlay.onclick = (e) => {
            e.preventDefault();
            modal.style.display = "none";
            iniciarPlayer(midia.url, midia.titulo, midia.idTratado);
        };
        modalLinks.appendChild(btnPlay);
        modal.style.display = "block";

    } else if (midia.tipo === "serie") {
        seletorContainer.style.display = "block";
        seletorTemporadas.innerHTML = "";

        const temporadasDisponiveis = Object.keys(midia.temporadas);

        temporadasDisponiveis.forEach(temp => {
            const opt = document.createElement("option");
            opt.value = temp;
            opt.innerText = temp;
            seletorTemporadas.appendChild(opt);
        });

        const carregarEpisodios = (nomeTemporada) => {
            modalLinks.innerHTML = "";
            const eps = midia.temporadas[nomeTemporada];
            
            eps.forEach(ep => {
                const epKey = midia.idTratado + "_" + ep.titulo;
                const dadosHist = historico[epKey];
                const concluido = dadosHist && dadosHist.concluido;

                const btnEp = document.createElement("a");
                btnEp.className = "linkOpcao" + (concluido ? " ep-assistido" : "");
                btnEp.href = "#";
                btnEp.innerText = `▶ ${ep.titulo} ${concluido ? '✅' : ''}`;
                
                btnEp.onclick = (e) => {
                    e.preventDefault();
                    modal.style.display = "none";
                    iniciarPlayer(ep.url, `${midia.titulo} - ${ep.titulo}`, epKey);
                };
                modalLinks.appendChild(btnEp);
            });
        };

        seletorTemporadas.onchange = () => carregarEpisodios(seletorTemporadas.value);

        if (temporadasDisponiveis.length > 0) {
            carregarEpisodios(temporadasDisponiveis[0]);
        }

        modal.style.display = "block";
    }
}

/* ---------------- SISTEMA DO PLAYER EXCLUSIVO ---------------- */
function iniciarPlayer(url, titulo, chaveMidia) {
    midiaAtualKey = chaveMidia;
    playerTitulo.innerText = titulo;
    videoPlayer.src = url;
    
    const btnExterno = document.getElementById("linkExterno");
    btnExterno.href = url;
    
    btnExterno.onclick = () => {
        historico[chaveMidia] = {
            titulo: titulo,
            url: url,
            tempo: 0,
            concluido: true,
            data: Date.now()
        };
        localStorage.setItem("historico", JSON.stringify(historico));
        fecharEPararPlayer();
    };

    playerContainer.style.display = "flex";
    
    videoPlayer.onloadedmetadata = () => {
        if (historico[midiaAtualKey] && historico[midiaAtualKey].tempo) {
            videoPlayer.currentTime = historico[midiaAtualKey].tempo;
        }
    };
    
    videoPlayer.play().catch(err => console.log("Autoplay bloqueado."));
}

videoPlayer.ontimeupdate = () => {
    if (!midiaAtualKey) return;
    
    const tempoAtual = Math.floor(videoPlayer.currentTime);
    
    if (tempoAtual > 0 && Math.abs(tempoAtual - ultimoTempoSalvo) >= 5) {
        ultimoTempoSalvo = tempoAtual;
        
        const concluido = (videoPlayer.currentTime / videoPlayer.duration) > 0.9;
        
        historico[midiaAtualKey] = {
            titulo: playerTitulo.innerText,
            url: videoPlayer.src,
            tempo: videoPlayer.currentTime,
            concluido: concluido,
            data: Date.now()
        };
        
        localStorage.setItem("historico", JSON.stringify(historico));
    }
};

function fecharEPararPlayer() {
    videoPlayer.pause();
    videoPlayer.src = ""; 
    midiaAtualKey = null;
    playerContainer.style.display = "none";
    
    if (pesquisa.value === "" && !modoFavoritos) {
        mostrarMensagemInicial();
    }
}

fecharModal.onclick = () => modal.style.display = "none";
fecharPlayer.onclick = fecharEPararPlayer;

window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
};