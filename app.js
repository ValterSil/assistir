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
            <div class="card-continuar" tabindex="0" onclick="retomarUltimo('${idKey}')">
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
            <p style="margin-top: 10px; font-size: 16px;">Use a barra de pesquisa ou as letras acima para explorar o catálogo..</p>
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
        div.tabIndex = "0"; // ➡️ MÁGICA: Torna o card selecionável pela TV!

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
    // ➡️ CRIA O BOTÃO DE FAVORITO DENTRO DO MODAL
    let btnFavModal = document.getElementById("btnFavModal");
    if (!btnFavModal) {
        btnFavModal = document.createElement("button");
        btnFavModal.id = "btnFavModal";
        btnFavModal.className = "linkOpcao";
        btnFavModal.style.marginBottom = "15px";
        btnFavModal.style.backgroundColor = "#222";
        btnFavModal.style.border = "1px solid #44e22c";
        
        // Coloca o botão logo abaixo do título do Modal
        modalTitulo.parentNode.insertBefore(btnFavModal, modalTitulo.nextSibling);
    }
    
    // Atualiza o texto do botão baseado no status atual
    const checarFavorito = () => favoritos.includes(midia.idTratado);
    btnFavModal.innerText = checarFavorito() ? "💔 Remover dos Favoritos" : "❤️ Adicionar aos Favoritos";
    
    // Ação de favoritar clicando com o controle
    btnFavModal.onclick = (e) => {
        e.preventDefault();
        if (checarFavorito()) {
            favoritos = favoritos.filter(id => id !== midia.idTratado);
            btnFavModal.innerText = "❤️ Adicionar aos Favoritos";
        } else {
            favoritos.push(midia.idTratado);
            btnFavModal.innerText = "💔 Remover dos Favoritos";
        }
        localStorage.setItem("favoritos", JSON.stringify(favoritos));
        atualizarTela(); // Atualiza a lista lá no fundo
    };
    modalLinks.innerHTML = "";

    if (midia.tipo === "filme" || midia.tipo === "24 horas") {
        seletorContainer.style.display = "none";
        
        const dadosHist = historico[midia.idTratado];
        const concluido = dadosHist && dadosHist.concluido;

        const btnPlay = document.createElement("a");
        btnPlay.className = "linkOpcao" + (concluido ? " ep-assistido" : "");
        btnPlay.href = "#";
        
        if (midia.tipo === "24 horas") {
            btnPlay.innerText = "▶ Assistir";
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

        // ➡️ TELETRANSPORTE: Força o controle a focar no botão de Play do Filme
        setTimeout(() => { btnPlay.focus(); }, 50);

    } else if (midia.tipo === "serie") {
        seletorContainer.style.display = "block";
        
        // Esconde o dropdown original
        seletorTemporadas.style.display = "none"; 
        
        // Cria ou limpa o painel novo
        let painelBotoes = document.getElementById("painelTemporadasTV");
        if (!painelBotoes) {
            painelBotoes = document.createElement("div");
            painelBotoes.id = "painelTemporadasTV";
            seletorTemporadas.parentNode.insertBefore(painelBotoes, seletorTemporadas);
        }
        painelBotoes.innerHTML = "";

        const temporadasDisponiveis = Object.keys(midia.temporadas);

        // Transforma cada temporada em uma ABA
        temporadasDisponiveis.forEach(temp => {
            const btnTemp = document.createElement("button");
            btnTemp.className = "btn-temporada"; // ➡️ Usa o novo visual do CSS
            btnTemp.innerText = temp;
            
            btnTemp.onclick = (e) => {
                e.preventDefault();
                // Remove a classe 'ativa' de todos os botões
                Array.from(painelBotoes.children).forEach(b => b.classList.remove("ativa"));
                // Adiciona a classe 'ativa' só no que foi clicado
                btnTemp.classList.add("ativa");
                
                carregarEpisodios(temp);
            };
            painelBotoes.appendChild(btnTemp);
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

        if (temporadasDisponiveis.length > 0) {
            // Clica na primeira temporada automaticamente
            painelBotoes.firstChild.click();
        }

        modal.style.display = "block";

        // TELETRANSPORTE: Foca no primeiro botão
        setTimeout(() => { if (painelBotoes.firstChild) painelBotoes.firstChild.focus(); }, 50);
    }
}
/* ---------------- SISTEMA DO PLAYER EXCLUSIVO ---------------- */
function iniciarPlayer(url, titulo, chaveMidia) {
    midiaAtualKey = chaveMidia;
    playerTitulo.innerText = titulo;
    videoPlayer.src = url;
    
    const btnExterno = document.getElementById("linkExterno");
    
    // ➡️ PREPARA O BOTÃO DEPENDENDO DO TIPO DE ARQUIVO
    if (url.includes(".ts")) {
        btnExterno.href = "#";
        btnExterno.target = "_self";
        btnExterno.innerText = "📋 Copiar Link (Para VLC)";
    } else {
        btnExterno.href = url;
        btnExterno.target = "_blank";
        btnExterno.innerText = "🔗 Abrir no Navegador";
    }
    
    // ➡️ LÓGICA DO CLIQUE
    btnExterno.onclick = (e) => {
        // Se for um canal 24h (.ts), aciona a cópia para a Área de Transferência
        if (url.includes(".ts")) {
            e.preventDefault(); // Impede o site de rolar para o topo
            
            // Comando nativo do navegador para copiar texto
            navigator.clipboard.writeText(url).then(() => {
                alert("✅ Link copiado com sucesso!\n\nAgora é só abrir o aplicativo do VLC, ir em 'Fluxo de Rede' (ou 'Nova Transmissão') e colar o link.");
            }).catch(err => {
                alert("❌ Ocorreu um erro ao copiar o link. Tente novamente.");
                console.error(err);
            });
        }

        // Continua salvando no histórico normalmente
        historico[chaveMidia] = {
            titulo: titulo,
            url: url,
            tempo: 0,
            concluido: true,
            data: Date.now()
        };
        localStorage.setItem("historico", JSON.stringify(historico));
        
        // Fecha a tela do player
        fecharEPararPlayer();
    };

playerContainer.style.display = "flex";

    // ➡️ Tira o foco dos botões para o controle comandar o vídeo por padrão
    setTimeout(() => { 
        document.body.focus(); 
    }, 100);
    
    resetarControlesPlayer();
    
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
/* ---------------- OCULTAÇÃO AUTOMÁTICA DOS CONTROLES ---------------- */
let timeoutOcultarPlayer;

function resetarControlesPlayer() {
    const itensUI = [
        document.getElementById("linkExterno"), 
        document.getElementById("fecharPlayer"), 
        document.getElementById("playerTitulo")
    ];
    
    // 1. Acende todos os botões e o título instantaneamente
    itensUI.forEach(el => { if (el) el.style.opacity = "1"; });
    
    // 2. Cancela o cronômetro antigo
    clearTimeout(timeoutOcultarPlayer);
    
    // 3. Cria um novo cronômetro de 3,5 segundos
    timeoutOcultarPlayer = setTimeout(() => {
        // Se o player ainda estiver aberto, esconde tudo
        if (playerContainer.style.display === "flex") {
            itensUI.forEach(el => { if (el) el.style.opacity = "0"; });
        }
    }, 3500);
}

fecharModal.onclick = () => modal.style.display = "none";
fecharPlayer.onclick = fecharEPararPlayer;

window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
};

/* ---------------- NAVEGAÇÃO TV (CONTROLE REMOTO) ---------------- */
window.addEventListener('keydown', (e) => {
    const teclas = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
    if (!teclas.includes(e.key)) return;

    const elementoAtual = document.activeElement;
    
    // Se estiver no campo de pesquisa, permite usar as setas laterais para digitar
    if (elementoAtual.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return; 
    }

    e.preventDefault(); 

    
    // 🔒 DEFINE AS REGRAS DA PRISÃO DE FOCO (FOCUS TRAP)
    const modalAberto = (modal && modal.style.display === "block");
    const playerAberto = (playerContainer && playerContainer.style.display === "flex");

    // ➡️ LÓGICA EXCLUSIVA PARA O PLAYER (Simplificada)
// ➡️ LÓGICA EXCLUSIVA PARA O PLAYER (Controle de Mídia Inteligente)
    if (playerAberto) {
        
        resetarControlesPlayer(); // Acende a interface sempre que mexer no controle

        const btnExt = document.getElementById("linkExterno");
        const btnFechar = document.getElementById("fecharPlayer");
        const video = document.querySelector(".player-container video"); 

        if (btnFechar) btnFechar.tabIndex = 0;
        if (btnExt) btnExt.tabIndex = 0;

        // 1. Suporte a Botões Multimídia Nativos (Se o controle tiver)
        if (e.key === 'MediaPlayPause' || e.key === 'MediaPlay' || e.key === 'MediaPause') {
            if (video.paused) video.play(); else video.pause();
            return;
        }
        if (e.key === 'MediaFastForward' || e.key === 'MediaTrackNext') {
            video.currentTime += 10; return;
        }
        if (e.key === 'MediaRewind' || e.key === 'MediaTrackPrevious') {
            video.currentTime -= 10; return;
        }

        // 2. MODO MENU: Se o foco estiver lá em cima nos botões
        if (document.activeElement === btnExt || document.activeElement === btnFechar) {
            if (e.key === 'ArrowLeft' && btnExt) {
                btnExt.focus();
            } else if (e.key === 'ArrowRight' && btnFechar) {
                btnFechar.focus();
            } else if (e.key === 'ArrowDown') {
                document.body.focus(); // Desce o foco de volta pro vídeo
            } else if (e.key === 'Enter') {
                document.activeElement.click();
            }
            return;
        }

        // 3. MODO VÍDEO: Se o foco estiver no vídeo (Padrão)
        if (e.key === 'Enter') {
            // Play / Pause
            if (video.paused) video.play(); else video.pause();
        } else if (e.key === 'ArrowRight') {
            video.currentTime += 10; // Avança 10 segundos
        } else if (e.key === 'ArrowLeft') {
            video.currentTime -= 10; // Volta 10 segundos
        } else if (e.key === 'ArrowUp') {
            // Sobe o foco para o botão de Fechar Player
            if (btnFechar) btnFechar.focus(); 
        }
        
        return; // Interrompe para não rodar a navegação da tela de trás
    }
    
    let elementosFocaveis = [];

    // ➡️ LÓGICA PARA OS MODAIS E TELA PRINCIPAL (Usa a Geometria 2D)
    if (modalAberto) {
        // Se o menu de episódios está aberto, o controle SÓ mexe nos botões de dentro dele
        elementosFocaveis = Array.from(modal.querySelectorAll('.linkOpcao, button, select, input, a, #painelTemporadasTV button'));
    } else {
        // Se está na tela principal, pega os itens normais, IGNORANDO o que está nos modais ocultos
        elementosFocaveis = Array.from(document.querySelectorAll('.filme, .card-continuar, button, select, input'))
            .filter(el => !modal.contains(el) && !playerContainer.contains(el));
    }

    // Filtra apenas o que está realmente visível na tela
    elementosFocaveis = elementosFocaveis.filter(el => el.offsetParent !== null && window.getComputedStyle(el).display !== 'none');

    if (elementosFocaveis.length === 0) return;

    // Se o foco se perdeu ou veio da tela de fundo errada, joga para o primeiro item disponível da "prisão"
    if (!elementosFocaveis.includes(elementoAtual)) {
        elementosFocaveis[0].focus();
        return;
    }

    if (e.key === 'Enter') {
        elementoAtual.click();
        return;
    }

    // Motor Geométrico 2D
    const cRect = elementoAtual.getBoundingClientRect();
    const cx = cRect.left + cRect.width / 2;
    const cy = cRect.top + cRect.height / 2;

    let melhorElemento = null;
    let menorDistancia = Infinity;

    elementosFocaveis.forEach(el => {
        if (el === elementoAtual) return;
        
        const eRect = el.getBoundingClientRect();
        const ex = eRect.left + eRect.width / 2;
        const ey = eRect.top + eRect.height / 2;

        let ehValido = false;

        if (e.key === 'ArrowRight' && ex > cx + 5) ehValido = true;
        if (e.key === 'ArrowLeft' && ex < cx - 5) ehValido = true;
        if (e.key === 'ArrowDown' && ey > cy + 5) ehValido = true;
        if (e.key === 'ArrowUp' && ey < cy - 5) ehValido = true;

        if (ehValido) {
            const distX = Math.abs(ex - cx);
            const distY = Math.abs(ey - cy);
            
            const sobrepoeX = !(eRect.right < cRect.left || eRect.left > cRect.right);
            const sobrepoeY = !(eRect.bottom < cRect.top || eRect.top > cRect.bottom);

            let distanciaCalculada;
            
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                distanciaCalculada = distX + (sobrepoeY ? 0 : distY * 15);
            } else {
                distanciaCalculada = distY + (sobrepoeX ? 0 : distX * 15);
            }

            if (distanciaCalculada < menorDistancia) {
                menorDistancia = distanciaCalculada;
                melhorElemento = el;
            }
        }
    });

    if (melhorElemento) {
        melhorElemento.focus();
        melhorElemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});