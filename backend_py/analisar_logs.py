import json
import os
import re
import time
import logging
from collections import Counter, defaultdict
from datetime import datetime
from nltk.stem import RSLPStemmer

# ===== Caminhos =====
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAT_LOG_PATH = os.path.join(ROOT_DIR, "chat_logs.json")
OUTPUT_PATH = os.path.join(ROOT_DIR, "backend_py", "analise_logs.json")
RESUMO_DIARIO_PATH = os.path.join(ROOT_DIR, "backend_py", "resumo_diario.json")
LOG_FILE_PATH = os.path.join(ROOT_DIR, "backend_py", "analise_logs.log")

# ===== Logging =====
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE_PATH, encoding="utf-8"),
        logging.StreamHandler()
    ]
)

# ===== Configs =====
st = RSLPStemmer()

STOPWORDS = {
    "a", "o", "e", "de", "da", "do", "que", "em", "um", "uma", "para",
    "com", "os", "as", "na", "no", "se", "é", "foi", "ser", "ao", "à",
    "n", "mais", "marca", "linha", "unidade", "família", "status", 
    "indicação", "segmento", "undefined", "qual", "melhor", "boa", "bem",
    "muito", "algum", "haver", "ter", "saber", "como", "ppa", "favor"
}

PALAVRAS_POSITIVAS = {"bom", "ótimo", "excelente", "perfeito", "ajudou", "obrigado", "sucesso", "solução", "rápido"}
PALAVRAS_NEGATIVAS = {"ruim", "péssimo", "erro", "problema", "lento", "demora", "não", "impossível", "horrível"}

# ===== Segmentos e palavras-chave =====
SEGMENTOS = {
    "COMUNICACAO": ["telefone", "ip", "ramal"],
    "CONSUMO": ["lâmpada", "tomada", "energia"],
    "CONTROLE DE ACESSOS": ["porteiro", "facial", "acesso"],
    "ENERGIA": ["nobreak", "bateria"],
    "ENERGIA SOLAR": ["painel solar", "sol", "energia solar"],
    "REDES": ["roteador", "switch", "cabo", "wifi"],
    "SEGURANCA ELETRONICA": ["cftv", "camera", "alarme", "sensor"]
}

def limpar_texto(texto):
    texto = texto.lower().replace('\n', ' ').replace('\r', ' ')
    texto = re.sub(r"[^a-zà-ú0-9\s]", " ", texto)
    return texto

def get_sentimento(texto):
    palavras = set(limpar_texto(texto).split())
    
    positivos = len(palavras.intersection(PALAVRAS_POSITIVAS))
    negativos = len(palavras.intersection(PALAVRAS_NEGATIVAS))
    
    if positivos > negativos: return "positivo"
    if negativos > positivos: return "negativo"
    return "neutro"

def classificar_segmento(texto):
    texto = limpar_texto(texto)
    for segmento, keywords in SEGMENTOS.items():
        for kw in keywords:
            if kw in texto:
                return segmento
    return "OUTRO"

def carregar_chat_logs():
    dados = []
    try:
        with open(CHAT_LOG_PATH, "r", encoding="utf-8") as f:
            for linha in f:
                linha = linha.strip()
                if not linha: continue
                try:
                    dados.append(json.loads(linha))
                except json.JSONDecodeError as e:
                    logging.warning(f"Erro JSON: {linha[:50]}... -> {e}")
        return dados
    except FileNotFoundError:
        logging.error(f"Arquivo {CHAT_LOG_PATH} não encontrado.")
        return []

def gerar_ngrams(palavras, n):
    return [tuple(palavras[i:i+n]) for i in range(len(palavras)-n+1)]

def formatar_contagem(counter, stem_to_original, tipo="palavra"):
    if tipo == "palavra":
        return [{"palavra": stem_to_original.get(p, p), "contagem": c} for p, c in counter]
    elif tipo == "bigrama":
        return [{"bigrama": " ".join(stem_to_original.get(s, s) for s in p), "contagem": c} for p, c in counter]
    elif tipo == "trigrama":
        return [{"trigrama": " ".join(stem_to_original.get(s, s) for s in p), "contagem": c} for p, c in counter]

# ===== Função principal =====
def analisar_chat():
    inicio = time.time()
    logging.info("Iniciando análise do chat...")

    logs = carregar_chat_logs()
    if not logs:
        logging.info("Nenhum log encontrado. Encerrando.")
        return

    stem_to_original = {}
    resultado = {
        "total_mensagens": len(logs),
        "palavras_chave": {"intelbras": 0, "codigo": 0},
        "analise_sentimento_geral": {"positivo": 0, "negativo": 0, "neutro": 0},
        "analise_sentimento_temporal": Counter(),
        "palavras": {"geral": [], "usuario": [], "gpt": []},
        "bigramas": {"geral": [], "usuario": [], "gpt": []},
        "trigramas": {"geral": [], "usuario": [], "gpt": []},
        "por_segmento": defaultdict(lambda: {
            "analise_sentimento": {"positivo":0, "negativo":0, "neutro":0},
            "palavras": {"geral": [], "usuario": [], "gpt": []},
            "bigramas": {"geral": [], "usuario": [], "gpt": []},
            "trigramas": {"geral": [], "usuario": [], "gpt": []}
        })
    }

    for entry in logs:
        texto = " ".join(filter(None, [entry.get("pergunta"), entry.get("resposta")]))
        sentimento = get_sentimento(texto)
        resultado["analise_sentimento_geral"][sentimento] += 1

        timestamp = entry.get("data")
        if timestamp:
            try:
                dia = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).date()
                resultado["analise_sentimento_temporal"][f"{dia}-{sentimento}"] += 1
            except (ValueError, TypeError):
                logging.warning(f"Erro ao processar data: {timestamp}")

        segmento = classificar_segmento(entry.get("pergunta", ""))

        texto_limpo = limpar_texto(texto)
        palavras_originais = [p for p in texto_limpo.split() if p not in STOPWORDS and len(p) > 1]
        palavras_stemmed = [st.stem(p) for p in palavras_originais]

        for o, s in zip(palavras_originais, palavras_stemmed):
            if s not in stem_to_original: stem_to_original[s] = o
        
        # Filtra 'intelbras' e 'codigo' das listas principais
        palavras_filtro_principais = [p for p in palavras_stemmed if p not in [st.stem("intelbras"), st.stem("codigo")]]

        if st.stem("intelbras") in palavras_stemmed:
            resultado["palavras_chave"]["intelbras"] += 1
        if st.stem("código") in palavras_stemmed:
            resultado["palavras_chave"]["codigo"] += 1

        bigramas = gerar_ngrams(palavras_stemmed, 2)
        trigramas = gerar_ngrams(palavras_stemmed, 3)

        origem = entry.get("origem", "usuario").lower()
        for cat, ngram in zip(["palavras", "bigramas", "trigramas"], [palavras_stemmed, bigramas, trigramas]):
            resultado[cat]["geral"].extend(ngram)
            if origem == "gpt":
                resultado[cat]["gpt"].extend(ngram)
            else:
                resultado[cat]["usuario"].extend(ngram)

            resultado["por_segmento"][segmento][cat]["geral"].extend(ngram)
            if origem == "gpt":
                resultado["por_segmento"][segmento][cat]["gpt"].extend(ngram)
            else:
                resultado["por_segmento"][segmento][cat]["usuario"].extend(ngram)

        resultado["por_segmento"][segmento]["analise_sentimento"][sentimento] += 1

    def formatar_contagem(contador, stem_to_original, tipo="palavra"):
        return [{"palavra": stem_to_original.get(p, p), "contagem": c} for p, c in counter]
    
    def formatar_bigramas(contador):
        return [{"bigrama": " ".join([stem_to_original.get(s, s) for s in p]), "contagem": c} for p, c in contador]
        
    def formatar_trigramas(contador):
        return [{"trigrama": " ".join([stem_to_original.get(s, s) for s in p]), "contagem": c} for p, c in contador]

    output = {
        "total_mensagens": resultado["total_mensagens"],
        "palavras_chave": resultado["palavras_chave"],
        "analise_sentimento_geral": resultado["analise_sentimento_geral"],
        "analise_sentimento_temporal": dict(resultado["analise_sentimento_temporal"]),
        "top_palavras_geral": formatar_contagem(Counter(resultado["palavras"]["geral"]).most_common(20), stem_to_original, "palavra"),
        "top_bigramas_geral": formatar_bigramas(Counter(resultado["bigramas"]["geral"]).most_common(20), stem_to_original),
        "top_trigramas_geral": formatar_trigramas(Counter(resultado["trigramas"]["geral"]).most_common(20), stem_to_original),
        "top_palavras_usuario": formatar_contagem(Counter(resultado["palavras"]["usuario"]).most_common(20), stem_to_original, "palavra"),
        "top_bigramas_usuario": formatar_bigramas(Counter(resultado["bigramas"]["usuario"]).most_common(20), stem_to_original),
        "top_trigramas_usuario": formatar_trigramas(Counter(resultado["trigramas"]["usuario"]).most_common(20), stem_to_original),
        "top_palavras_gpt": formatar_contagem(Counter(resultado["palavras"]["gpt"]).most_common(20), stem_to_original, "palavra"),
        "top_bigramas_gpt": formatar_bigramas(Counter(resultado["bigramas"]["gpt"]).most_common(20), stem_to_original),
        "top_trigramas_gpt": formatar_trigramas(Counter(resultado["trigramas"]["gpt"]).most_common(20), stem_to_original),
        "por_segmento": {}
    }

    for segmento, data in resultado["por_segmento"].items():
        output["por_segmento"][segmento] = {
            "analise_sentimento": data["analise_sentimento"],
            "top_palavras_geral": formatar_contagem(Counter(data["palavras"]["geral"]).most_common(20), stem_to_original, "palavra"),
            "top_bigramas_geral": formatar_bigramas(Counter(data["bigramas"]["geral"]).most_common(20), stem_to_original),
            "top_trigramas_geral": formatar_trigramas(Counter(data["trigramas"]["geral"]).most_common(20), stem_to_original),
            "top_palavras_usuario": formatar_contagem(Counter(data["palavras"]["usuario"]).most_common(20), stem_to_original, "palavra"),
            "top_bigramas_usuario": formatar_bigramas(Counter(data["bigramas"]["usuario"]).most_common(20), stem_to_original),
            "top_trigramas_usuario": formatar_trigramas(Counter(data["trigramas"]["usuario"]).most_common(20), stem_to_original),
            "top_palavras_gpt": formatar_contagem(Counter(data["palavras"]["gpt"]).most_common(20), stem_to_original, "palavra"),
            "top_bigramas_gpt": formatar_bigramas(Counter(data["bigramas"]["gpt"]).most_common(20), stem_to_original),
            "top_trigramas_gpt": formatar_trigramas(Counter(data["trigramas"]["gpt"]).most_common(20), stem_to_original)
        }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=4, ensure_ascii=False)

    resumo_diario = defaultdict(lambda: {"positivo":0, "negativo":0, "neutro":0})
    for key, count in resultado["analise_sentimento_temporal"].items():
        dia, sentimento = key.rsplit("-", 1)
        resumo_diario[dia][sentimento] += count

    with open(RESUMO_DIARIO_PATH, "w", encoding="utf-8") as f:
        json.dump(resumo_diario, f, indent=4, ensure_ascii=False)

    fim = time.time()
    logging.info(f"✅ Análise concluída em {fim - inicio:.2f} segundos. Resultado salvo em {OUTPUT_PATH}")
    logging.info(f"Resumo diário salvo em {RESUMO_DIARIO_PATH}")

# ===== Execução =====
if __name__ == "__main__":
    analisar_chat()