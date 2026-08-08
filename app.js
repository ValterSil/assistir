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
        let nomeArquivo = contador === 0 ? "filmes.json" : `filmes${contador}.json`;

        try {
            const resposta = await fetch(nomeArquivo);
            
            if (resposta.ok) {
                const dados = await resposta.json();
                const nomeLista = nomeArquivo.replace(".json", "");

                const filmesTratados = dados.filmes.map(f => {
                    f.origem = nomeLista;
                    f.idTratado = `${nomeLista}_${f.id}`;
                    return f;
                });

                todosOsFilmes = todosOsFilmes.concat(filmesTratados);
                contador++; 
                
            } else {
                buscando = false; 
            }
        } catch (e) {
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
        
        // ➡️ BOTÃO VLC (CONTINUAR ASSISTINDO)
        const btnExterno = document.getElementById("linkExterno");
        btnExterno.href = "#";
        btnExterno.onclick = (e) => {
            e.preventDefault();
            historico[midiaAtualKey].concluido = true;
            localStorage.setItem("historico", JSON.stringify(historico));
            
            if (window.AndroidTV) {
                window.AndroidTV.abrirVLC(dados.url);
            } else {
                window.open(dados.url, '_blank');
            }
            
            setTimeout(() => {
                fecharEPararPlayer();
            }, 500);
        };

        playerContainer.style.display = "flex";
        
        if (window.location.hash !== "#player") {
            window.history.pushState({ tela: "player" }, "", "#player");
        }
        
        videoPlayer.onloadedmetadata = () => {
            videoPlayer.currentTime = dados.tempo;
            videoPlayer.play().then(() => {
                resetarControlesPlayer(); 
            }).catch(e => console.log("Erro ao retomar: ", e.message));
        };
        
        setTimeout(() => { 
            if (videoPlayer) videoPlayer.focus(); 
            resetarControlesPlayer();
        }, 200);
    }
};

/* ---------------- RENDERIZAR CARDS ---------------- */
function renderizar(listaFilmes) {
    lista.innerHTML = "";

    const limite = modoFavoritos ? listaFilmes.length : 50;
    const filmesParaExibir = listaFilmes.slice(0, limite);

    const fragmento = document.createDocumentFragment();

    filmesParaExibir.forEach(f => {
        const ehFavorito = favoritos.includes(f.idTratado);

        const div = document.createElement("div");
        div.className = "filme";
        div.tabIndex = "0"; 

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
    
    let btnFavModal = document.getElementById("btnFavModal");
    if (!btnFavModal) {
        btnFavModal = document.createElement("button");
        btnFavModal.id = "btnFavModal";
        btnFavModal.className = "linkOpcao";
        btnFavModal.style.marginBottom = "15px";
        btnFavModal.style.backgroundColor = "#222";
        btnFavModal.style.border = "1px solid #44e22c";
        
        modalTitulo.parentNode.insertBefore(btnFavModal, modalTitulo.nextSibling);
    }
    
    const checarFavorito = () => favoritos.includes(midia.idTratado);
    btnFavModal.innerText = checarFavorito() ? "💔 Remover dos Favoritos" : "❤️ Adicionar aos Favoritos";
    
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
        atualizarTela(); 
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

        setTimeout(() => { btnPlay.focus(); }, 50);

    } else if (midia.tipo === "serie") {
        seletorContainer.style.display = "block";
        seletorTemporadas.style.display = "none"; 
        
        let painelBotoes = document.getElementById("painelTemporadasTV");
        if (!painelBotoes) {
            painelBotoes = document.createElement("div");
            painelBotoes.id = "painelTemporadasTV";
            seletorTemporadas.parentNode.insertBefore(painelBotoes, seletorTemporadas);
        }
        painelBotoes.innerHTML = "";

        const temporadasDisponiveis = Object.keys(midia.temporadas);

        temporadasDisponiveis.forEach(temp => {
            const btnTemp = document.createElement("button");
            btnTemp.className = "btn-temporada"; 
            btnTemp.innerText = temp;
            
            btnTemp.onclick = (e) => {
                e.preventDefault();
                Array.from(painelBotoes.children).forEach(b => b.classList.remove("ativa"));
                btnTemp.classList.add("ativa");
                
                carregarEpisodios(temp);
            };
            painelBotoes.appendChild(btnTemp);
        });

        const carregarEpisodios = (nomeTemporada) => {
            modalLinks.innerHTML = "";
            const eps = midia.temporadas[nomeTemporada];
            
            eps.forEach(ep => {
                const epKey = midia.idTratado + "_" + nomeTemporada + "_" + ep.titulo;
                
                const dadosHist = historico[epKey];
                const concluido = dadosHist && dadosHist.concluido;

                const btnEp = document.createElement("a");
                btnEp.className = "linkOpcao" + (concluido ? " ep-assistido" : "");
                btnEp.href = "#";
                btnEp.innerText = `▶ ${ep.titulo} ${concluido ? '✅' : ''}`;
                
                btnEp.onclick = (e) => {
                    e.preventDefault();
                    modal.style.display = "none";
                    iniciarPlayer(ep.url, `${midia.titulo} - ${nomeTemporada} - ${ep.titulo}`, epKey);
                };
                modalLinks.appendChild(btnEp);
            });
        };

        if (temporadasDisponiveis.length > 0) {
            painelBotoes.firstChild.click();
        }

        modal.style.display = "block";
        window.history.pushState({ tela: "modal" }, "", "#modal");

        setTimeout(() => { if (painelBotoes.firstChild) painelBotoes.firstChild.focus(); }, 50);
    }
}


/* ---------------- SISTEMA DO PLAYER EXCLUSIVO ---------------- */
function iniciarPlayer(url, titulo, key) {
    midiaAtualKey = key;
    videoPlayer.src = url;
    playerTitulo.innerText = titulo;
    
    // ➡️ BOTÃO VLC (FILMES INICIADOS DO ZERO)
    const btnExterno = document.getElementById("linkExterno");
    btnExterno.href = "#";
    btnExterno.onclick = (e) => {
        e.preventDefault();
        
        if (historico[midiaAtualKey]) {
            historico[midiaAtualKey].concluido = true;
            localStorage.setItem("historico", JSON.stringify(historico));
        }
        
        if (window.AndroidTV) {
            window.AndroidTV.abrirVLC(url);
        } else {
            window.open(url, '_blank');
        }
        
        setTimeout(() => {
            fecharEPararPlayer();
        }, 500);
    };
    
    videoPlayer.tabIndex = 0; 
    ultimoTempoSalvo = 0;

    videoPlayer.onloadedmetadata = () => {
        const dadosHist = historico[key]; 
        
        if (dadosHist && dadosHist.tempo > 0 && !dadosHist.concluido) {
            videoPlayer.currentTime = dadosHist.tempo;
        } else {
            videoPlayer.currentTime = 0; 
        }
        
        videoPlayer.play().then(() => {
            resetarControlesPlayer(); 
        }).catch(err => console.log("Aguardando carregamento: ", err.message));
    };

    videoPlayer.onerror = () => {
        console.log("Erro de conexão: O servidor do filme demorou a responder ou o link está quebrado.");
    };
    
    playerContainer.style.display = "flex";
    
    if (window.location.hash !== "#player") {
        window.history.pushState({ tela: "player" }, "", "#player");
    }
    
    setTimeout(() => { 
        if (videoPlayer) videoPlayer.focus(); 
        resetarControlesPlayer();
    }, 200);
}

videoPlayer.ontimeupdate = () => {
    if (!midiaAtualKey) return;
    
    if (!buscandoTempo) {
        atualizarBarra(videoPlayer.currentTime, videoPlayer.duration);
    }
    
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
    
    // ➡️ LIMPEZA PROFUNDA (Libera a Memória da TV)
    videoPlayer.removeAttribute('src'); 
    videoPlayer.load(); 
    
    midiaAtualKey = null;
    playerContainer.style.display = "none";
    
    const barra = document.getElementById('barraProgresso');
    const txtAtual = document.getElementById('tempoAtual');
    const txtTotal = document.getElementById('tempoTotal');
    
    if (barra) barra.style.width = "0%";
    if (txtAtual) txtAtual.innerText = "00:00";
    if (txtTotal) txtTotal.innerText = "00:00";
    
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
        document.getElementById("playerTitulo"),
        document.getElementById("controlesNativosTV") 
    ];
    
    itensUI.forEach(el => { if (el) el.style.opacity = "1"; });
    
    clearTimeout(timeoutOcultarPlayer);
    
    timeoutOcultarPlayer = setTimeout(() => {
        if (playerContainer.style.display === "flex") {
            const video = document.querySelector(".player-container video");
            
            if (video && !video.paused) {
                itensUI.forEach(el => { if (el) el.style.opacity = "0"; });
            }
        }
    }, 3500);
}

/* ---------------- BOTÃO VOLTAR DA TV E FECHAR (HISTÓRICO) ---------------- */
fecharModal.onclick = () => window.history.back();
fecharPlayer.onclick = () => window.history.back();

window.onclick = e => {
    if (e.target === modal) window.history.back();
};

window.addEventListener("popstate", (e) => {
    if (e.state && e.state.tela === "modal") {
        fecharEPararPlayer();
        modal.style.display = "block";
    } 
    else if (!e.state) {
        fecharEPararPlayer();
        modal.style.display = "none";
        document.body.focus(); 
    }
});

/* ---------------- SISTEMA DE PROGRESSO E DEBOUNCE ---------------- */
let tempoAlvoSeek = 0;
let timeoutSeek;
let buscandoTempo = false;

function formatarTempo(segundos) {
    if (isNaN(segundos)) return "00:00";
    let h = Math.floor(segundos / 3600);
    let m = Math.floor((segundos % 3600) / 60);
    let s = Math.floor(segundos % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function atualizarBarra(atual, total) {
    if (!total || isNaN(total)) return;
    const porcentagem = (atual / total) * 100;
    
    const barra = document.getElementById('barraProgresso');
    const txtAtual = document.getElementById('tempoAtual');
    const txtTotal = document.getElementById('tempoTotal');
    
    if (barra) barra.style.width = porcentagem + "%";
    if (txtAtual) txtAtual.innerText = formatarTempo(atual);
    if (txtTotal) txtTotal.innerText = formatarTempo(total);
}

/* ---------------- NAVEGAÇÃO TV (CONTROLE REMOTO) ---------------- */
window.addEventListener('keydown', (e) => {
    const teclas = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
    if (!teclas.includes(e.key)) return;

    const elementoAtual = document.activeElement;
    
    if (elementoAtual.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return; 
    }

    e.preventDefault(); 

    const modalAberto = (modal && modal.style.display === "block");
    const playerAberto = (playerContainer && playerContainer.style.display === "flex");

    if (playerAberto) {
        
        resetarControlesPlayer(); 

        const btnExt = document.getElementById("linkExterno");
        const btnFechar = document.getElementById("fecharPlayer");
        const video = document.querySelector(".player-container video"); 

        if (btnFechar) btnFechar.tabIndex = 0;
        if (btnExt) btnExt.tabIndex = 0;

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

        if (document.activeElement === btnExt || document.activeElement === btnFechar) {
            if (e.key === 'ArrowLeft' && btnExt) {
                btnExt.focus();
            } else if (e.key === 'ArrowRight' && btnFechar) {
                btnFechar.focus();
            } else if (e.key === 'ArrowDown') {
                const itensUI = [
                    btnExt, 
                    btnFechar, 
                    document.getElementById("playerTitulo"),
                    document.getElementById("controlesNativosTV") 
                ];
                itensUI.forEach(el => { if (el) el.style.opacity = "0"; });
                
                document.activeElement.blur(); 
            } else if (e.key === 'Enter') {
                document.activeElement.click();
            }
            return;
        }

        if (e.key === 'Enter') {
            resetarControlesPlayer();
            if (video.paused) video.play(); else video.pause();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            
            if (!buscandoTempo) {
                tempoAlvoSeek = video.currentTime;
                buscandoTempo = true;
            }

            if (e.key === 'ArrowRight') tempoAlvoSeek += 10;
            else tempoAlvoSeek -= 10;

            if (tempoAlvoSeek < 0) tempoAlvoSeek = 0;
            if (tempoAlvoSeek > video.duration) tempoAlvoSeek = video.duration;

            atualizarBarra(tempoAlvoSeek, video.duration);

            clearTimeout(timeoutSeek);
            timeoutSeek = setTimeout(() => {
                video.currentTime = tempoAlvoSeek; 
                buscandoTempo = false;
            }, 800); 

        } else if (e.key === 'ArrowUp') {
            if (btnFechar) btnFechar.focus(); 
        }
        
        return; 
    }
    
    let elementosFocaveis = [];

    if (modalAberto) {
        elementosFocaveis = Array.from(modal.querySelectorAll('.linkOpcao, button, select, input, a, #painelTemporadasTV button'));
    } else {
        elementosFocaveis = Array.from(document.querySelectorAll('.filme, .card-continuar, button, select, input'))
            .filter(el => !modal.contains(el) && !playerContainer.contains(el));
    }

    elementosFocaveis = elementosFocaveis.filter(el => el.offsetParent !== null && window.getComputedStyle(el).display !== 'none');

    if (elementosFocaveis.length === 0) return;

    if (!elementosFocaveis.includes(elementoAtual)) {
        elementosFocaveis[0].focus();
        return;
    }

    if (e.key === 'Enter') {
        elementoAtual.click();
        return;
    }

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
        melhorElemento.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
});