let catalogo = null;

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

// NOVAS VARIÁVEIS PARA O HISTÓRICO
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

/* ---------------- MENSAGEM INICIAL E CONTINUAR ---------------- */
function mostrarMensagemInicial() {
    // Pega o histórico, transforma em array e ordena do mais recente para o mais antigo
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

// Função para dar o Play direto pelo card da tela inicial
window.retomarUltimo = (key) => {
    const dados = historico[key];
    if (dados) {
        midiaAtualKey = key;
        playerTitulo.innerText = dados.titulo;
        videoPlayer.src = dados.url;
        playerContainer.style.display = "flex";
        
        // Aguarda o vídeo carregar para pular para o minuto certo
        videoPlayer.onloadedmetadata = () => {
            videoPlayer.currentTime = dados.tempo;
        };
        videoPlayer.play().catch(e => console.log(e));
    }
};
/* ---------------- CARREGAR DADOS ---------------- */
window.onload = async () => {
    try {
        const resposta = await fetch("filmes.json");
        catalogo = await resposta.json();
        
        // Em vez de renderizar tudo, mostra a mensagem inicial
        mostrarMensagemInicial();

    } catch (e) {
        alert("Erro ao carregar filmes.json. Certifique-se de rodar o script Python primeiro!");
        console.log(e);
    }
};

/* ---------------- RENDERIZAR CARDS (COM TRAVA DE SEGURANÇA) ---------------- */
function renderizar(listaFilmes) {
    // Limpa a lista atual
    lista.innerHTML = "";

    // Trava de limite máximo para não travar o celular (ex: 50 itens)
    // Se estivermos na tela de favoritos, permite mostrar todos (ou defina um limite maior)
    const limite = modoFavoritos ? listaFilmes.length : 50;
    const filmesParaExibir = listaFilmes.slice(0, limite);

    const fragmento = document.createDocumentFragment();

    filmesParaExibir.forEach(f => {
        const ehFavorito = favoritos.includes(f.id);

        const div = document.createElement("div");
        div.className = "filme";

        div.innerHTML = `
            <div class="filme-info">
                <span>${f.titulo}</span>
                ${f.tipo === 'serie' ? '<span class="badge-serie">SÉRIE</span>' : ''}
            </div>
            <span class="favorito">
                ${ehFavorito ? "❤️" : "🤍"}
            </span>
        `;

        div.onclick = () => abrirMidia(f);

        const coracao = div.querySelector(".favorito");
        coracao.onclick = (e) => {
            e.stopPropagation();
            if (favoritos.includes(f.id)) {
                favoritos = favoritos.filter(id => id !== f.id);
            } else {
                favoritos.push(f.id);
            }
            localStorage.setItem("favoritos", JSON.stringify(favoritos));
            atualizarTela();
        };

        fragmento.appendChild(div);
    });

    lista.appendChild(fragmento);

    // Aviso amigável caso existam mais itens ocultos pela trava de segurança
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
        let listaAtual = catalogo.filmes.filter(f => favoritos.includes(f.id));
        renderizar(listaAtual);
    } else {
        // Se desativou os favoritos, limpa a busca e volta para a tela inicial
        pesquisa.value = "";
        mostrarMensagemInicial();
    }
}

/* ---------------- BUSCA (COM DEBOUNCE) ---------------- */
/* ---------------- BUSCA (COM DEBOUNCE) ---------------- */
let timeoutBusca; 

pesquisa.oninput = () => {
    clearTimeout(timeoutBusca);

    timeoutBusca = setTimeout(() => {
        const txt = normalizar(pesquisa.value);

        // Se o texto estiver vazio e NÃO estiver nos favoritos, mostra a tela inicial
        if (txt === "" && !modoFavoritos) {
            mostrarMensagemInicial();
            return; // Para a execução da função aqui
        }

        let listaFiltrada = catalogo.filmes;

        if (modoFavoritos) {
            listaFiltrada = listaFiltrada.filter(f => favoritos.includes(f.id));
        }

        if (txt !== "") {
            listaFiltrada = listaFiltrada.filter(f => f.tituloBusca.includes(txt));
        }

        renderizar(listaFiltrada);
    }, 300); 
};

/* ---------------- FILTRO DE LETRAS ---------------- */
document.querySelectorAll("#letras button").forEach(btn => {
    btn.onclick = () => {
        pesquisa.value = ""; // Limpa a barra de pesquisa visualmente
        
        const letra = btn.innerText;
        let listaFiltrada = catalogo.filmes;

        if (modoFavoritos) {
            listaFiltrada = listaFiltrada.filter(f => favoritos.includes(f.id));
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

    if (midia.tipo === "filme") {
        seletorContainer.style.display = "none";
        
        // Verifica se o filme já foi assistido
        const dadosHist = historico[midia.id];
        const concluido = dadosHist && dadosHist.concluido;

        const btnPlay = document.createElement("a");
        btnPlay.className = "linkOpcao" + (concluido ? " ep-assistido" : "");
        btnPlay.href = "#";
        btnPlay.innerText = concluido ? "▶ Assistir Novamente ✅" : "▶ Assistir Filme";
        
        btnPlay.onclick = (e) => {
            e.preventDefault();
            modal.style.display = "none";
            iniciarPlayer(midia.url, midia.titulo, midia.id); // Passa o ID
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
                // Cria uma chave única: ID da série + Nome do Episódio
                const epKey = midia.id + "_" + ep.titulo;
                const dadosHist = historico[epKey];
                const concluido = dadosHist && dadosHist.concluido;

                const btnEp = document.createElement("a");
                btnEp.className = "linkOpcao" + (concluido ? " ep-assistido" : "");
                btnEp.href = "#";
                btnEp.innerText = `▶ ${ep.titulo} ${concluido ? '✅' : ''}`;
                
                btnEp.onclick = (e) => {
                    e.preventDefault();
                    modal.style.display = "none";
                    iniciarPlayer(ep.url, `${midia.titulo} - ${ep.titulo}`, epKey); // Passa a Chave
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
    playerContainer.style.display = "flex";
    
    // Pula para o minuto salvo assim que o vídeo carrega
    videoPlayer.onloadedmetadata = () => {
        if (historico[midiaAtualKey] && historico[midiaAtualKey].tempo) {
            videoPlayer.currentTime = historico[midiaAtualKey].tempo;
        }
    };
    
    videoPlayer.play().catch(err => console.log("Autoplay bloqueado."));
}

// Salva o progresso a cada 5 segundos para economizar CPU
videoPlayer.ontimeupdate = () => {
    if (!midiaAtualKey) return;
    
    const tempoAtual = Math.floor(videoPlayer.currentTime);
    
    // Só aciona o salvamento de 5 em 5 segundos
    if (tempoAtual > 0 && Math.abs(tempoAtual - ultimoTempoSalvo) >= 5) {
        ultimoTempoSalvo = tempoAtual;
        
        // Se passou de 90% do vídeo, considera como "Finalizado" para ficar verde
        const concluido = (videoPlayer.currentTime / videoPlayer.duration) > 0.9;
        
        historico[midiaAtualKey] = {
            titulo: playerTitulo.innerText,
            url: videoPlayer.src,
            tempo: videoPlayer.currentTime,
            concluido: concluido,
            data: Date.now() // Data para saber qual foi o último assistido
        };
        
        localStorage.setItem("historico", JSON.stringify(historico));
    }
};

function fecharEPararPlayer() {
    videoPlayer.pause();
    videoPlayer.src = ""; 
    midiaAtualKey = null;
    playerContainer.style.display = "none";
    
    // Força a atualização da tela inicial para mostrar o card novo
    if (pesquisa.value === "" && !modoFavoritos) {
        mostrarMensagemInicial();
    }
}

fecharModal.onclick = () => modal.style.display = "none";
fecharPlayer.onclick = fecharEPararPlayer;

window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
};