import re
import json
import unicodedata

def normalizar_letra_grupo(titulo):
    titulo_limpo = titulo.strip()
    
    # Se a string for vazia, jogamos para o grupo "#"
    if not titulo_limpo:
        return "#"
        
    # Pega a primeira letra maiúscula
    c = titulo_limpo[0].upper()
    
    # Se for número ou símbolo, agrupa no "#"
    if c.isdigit() or not c.isalpha():
        return "#"
        
    # Remove acentos para garantir que "Á" vire "A"
    return unicodedata.normalize('NFD', c).encode('ascii', 'ignore').decode('utf-8')

def converter_m3u_para_json(m3u_path, json_path):
    filmes_dict = {}
    series_dict = {}
    
    # Expressão regular para capturar Séries (ex: Nome da Serie S01 E02)
    # Captura o Nome, a Temporada (S) e o Episódio (E)
    serie_pattern = re.compile(r"^(.*?)\s+S(\d+)\s*E(\d+)", re.IGNORECASE)
    
    with open(m3u_path, 'r', encoding='utf-8', errors='ignore') as f:
        linhas = f.readlines()
        
    info_atual = None
    
    for linha in linhas:
        linha = linha.strip()
        if linha.startswith("#EXTINF:"):
            # Extrair metadados usando Regex
            logo_match = re.search(r'tvg-logo="([^"]*)"', linha)
            group_match = re.search(r'group-title="([^"]*)"', linha)
            
            # O título fica após a última vírgula
            partes_virgula = linha.split(',')
            titulo_bruto = partes_virgula[-1].strip() if partes_virgula else "Sem Título"
            
            logo = logo_match.group(1) if logo_match else ""
            grupo_m3u = group_match.group(1) if group_match else ""
            
            info_atual = {
                "titulo_bruto": titulo_bruto,
                "logo": logo,
                "grupo_m3u": grupo_m3u
            }
        elif linha.startswith("http") and info_atual:
            url = linha
            titulo = info_atual["titulo_bruto"]
            
            # Verifica se é uma série com temporadas/episódios
            match_serie = serie_pattern.match(titulo)
            
            if match_serie:
                nome_serie = match_serie.group(1).strip()
                temporada_num = int(match_serie.group(2))
                ep_num = int(match_serie.group(3))
                
                if nome_serie not in series_dict:
                    series_dict[nome_serie] = {
                        "titulo": nome_serie,
                        "tituloBusca": nome_serie.lower(),
                        "grupo": normalizar_letra_grupo(nome_serie),
                        "logo": info_atual["logo"],
                        "tipo": "serie",
                        "temporadas": {}
                    }
                
                temp_str = f"Temporada {temporada_num}"
                if temp_str not in series_dict[nome_serie]["temporadas"]:
                    series_dict[nome_serie]["temporadas"][temp_str] = []
                    
                series_dict[nome_serie]["temporadas"][temp_str].append({
                    "titulo": f"Episódio {ep_num:02d}",
                    "url": url
                })
            else:
                # É um filme independente
                if titulo not in filmes_dict:
                    filmes_dict[titulo] = {
                        "titulo": titulo,
                        "tituloBusca": titulo.lower(),
                        "grupo": normalizar_letra_grupo(titulo),
                        "logo": info_atual["logo"],
                        "tipo": "filme",
                        "url": url
                    }
            info_atual = None

    # Compilar os itens gerando IDs sequenciais únicos
    lista_final = []
    id_counter = 1
    
    # Adicionar Filmes
    for f in filmes_dict.values():
        f["id"] = id_counter
        lista_final.append(f)
        id_counter += 1
        
    # Adicionar Séries ordenando episódios
    for s in series_dict.values():
        s["id"] = id_counter
        # Ordenar episódios dentro de cada temporada
        for temp in s["temporadas"]:
            s["temporadas"][temp] = sorted(s["temporadas"][temp], key=lambda x: x["titulo"])
        lista_final.append(s)
        id_counter += 1

    # Salva no formato estruturado para o app.js ler
    with open(json_path, 'w', encoding='utf-8') as out:
        json.dump({"filmes": lista_final}, out, separators=(',', ':'), ensure_ascii=False)
        
    print(f"Sucesso! {id_counter - 1} mídias processadas e salvas em {json_path}")

# Execute o script apontando para seu arquivo .m3u local
converter_m3u_para_json("lista.m3u", "filmes.json")