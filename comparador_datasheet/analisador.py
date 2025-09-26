# analisador.py (Versão Refinada com Pós-Processadores)
import os
import fitz
import re
import json
import sys

# =========================
# Utilidades
# =========================
def extrair_texto_do_pdf(pdf_path):
    try:
        with fitz.open(pdf_path) as doc:
            return "".join(page.get_text() for page in doc)
    except Exception as e:
        print(f"[ERRO] Não foi possível ler {pdf_path}: {e}")
        return None

def clean_value(text):
    if not text:
        return ""
    text = re.sub(r'[»¹²³⁴⁵⁶⁷⁸⁹®™©]', '', text)
    text = text.replace("", " ").replace("•", " ")
    lixo = [
        "intelbras.com", "www.hikvision.com", "avigilon.com", "Material do case",
        "Inteligência Artificial", "L × A × P", "As VIPs Intelbras",
        "Informações sujeitas a alterações", "Incorpora produto homologado pela Anatel sob os",
        "fornece imagem de"
    ]
    # ✨ REFINAMENTO: Usando replace em vez de split para não cortar dados válidos
    for l in lixo:
        text = text.replace(l, '')
    
    # ✨ REFINAMENTO: Strip menos agressivo para não remover parênteses ou vírgulas úteis
    return re.sub(r'\s+', ' ', text).strip(" :–;.")

# =========================
# Funções de busca (sem alteração)
# =========================
def buscar_valor(texto, padrao):
    valor_encontrado = ""
    match = re.search(rf"{padrao}\s*[:\-]?\s*([^\n\r]{{3,}})", texto, re.IGNORECASE)
    if match:
        candidato = clean_value(match.group(1))
        if not re.search(padrao, candidato, re.IGNORECASE):
            valor_encontrado = candidato
    if not valor_encontrado:
        match = re.search(rf"{padrao}(?:\s*\n)+\s*([^\n]+)", texto, re.IGNORECASE)
        if match:
            candidato = clean_value(match.group(1))
            if not re.search(padrao, candidato, re.IGNORECASE):
                valor_encontrado = candidato
    return valor_encontrado

def buscar_temperatura(texto):
    padrao = r"(?:Temperatura de operação|Operating Conditions|Environment)[\s\S]{{0,50}}((?:[-–—−]\s*|\(\-\)\s*)?\d+\s*°[CF]\s*(?:a|to|~)\s*(?:[-–—−]\s*)?\d+\s*°[CF])"
    match = re.search(padrao, texto, re.IGNORECASE)
    if match:
        return match.group(1)
    return buscar_valor(texto, r"(?:Temperatura de operação|Operating Conditions|Environment)")

# =========================
# ✨ NOVO: Pós-Processadores "Especialistas" em Limpeza ✨
# =========================
def limpar_wdr(valor):
    # Pega apenas o primeiro valor numérico seguido de "dB"
    match = re.search(r'(\d+\s*dB)', valor, re.IGNORECASE)
    return match.group(1) if match else valor

def limpar_consumo(valor):
    # Pega a primeira ocorrência de um número com "W"
    match = re.search(r'([<>]?\s*\d[\d,.]*\s*W)', valor, re.IGNORECASE)
    return match.group(1).replace(',', '.') if match else valor

def limpar_compressao(valor):
    # Remove textos entre parênteses e pega os 4 primeiros codecs
    limpo = re.sub(r'\(.*?\)', '', valor)
    codecs = [c.strip() for c in re.split(r'[;/|]', limpo) if c.strip()]
    return ' / '.join(codecs[:4])

POST_PROCESSORS = {
    "wdr": limpar_wdr,
    "consumo_potencia": limpar_consumo,
    "compressao_video": limpar_compressao
}
# =========================

# =========================
# Normalizadores e Formatadores (sem alteração)
# =========================
def formatar_resolucao(valor):
    if not valor: return None
    match = re.search(r"(\d{3,4})\s*[xX×\n\s]*\s*(\d{3,4})", valor)
    if match:
        w, h = map(int, match.groups())
        if w < 640 or h < 480: return None
        mp = round((w * h) / 1_000_000, 1)
        return f"{mp} MP ({w}x{h})"
    return None

def normalizar_temperatura(valor):
    if not valor: return {"min": None, "max": None, "unidade": "°C"}
    temp_part = valor.split('/')[0]
    temp_part = temp_part.replace("–", "-").replace("—", "-").replace("−", "-")
    temp_part = temp_part.replace("(-)", "-")
    nums_str = re.findall(r'-\s*\d+|\d+', temp_part)
    if not nums_str: return {"min": None, "max": None, "unidade": "°C"}
    nums = [int(n.replace(" ", "")) for n in nums_str]
    min_temp, max_temp = (min(nums), max(nums)) if len(nums) > 1 else (nums[0], nums[0])
    if '°F' in valor or 'Fahrenheit' in valor:
        min_temp = int((min_temp - 32) * 5/9)
        max_temp = int((max_temp - 32) * 5/9)
    return {"min": min_temp, "max": max_temp, "unidade": "°C"}

# ... (outros normalizadores sem alteração) ...
def normalizar_peso(valor):
    if not valor: return "Não encontrado"
    num_search = re.search(r"(\d[\d,.]*)", valor)
    if not num_search: return "Não encontrado"
    num_str = num_search.group(1).replace(",", ".")
    try:
        parts = num_str.split('.')
        if len(parts) > 2: num_str = "".join(parts[:-1]) + "." + parts[-1]
        num = float(num_str)
        if "kg" in valor.lower(): return f"{int(num * 1000)} g"
        if "lb" in valor.lower(): return f"{int(num * 453.6)} g"
        if "g" in valor.lower(): return f"{int(num)} g"
    except ValueError: return "Não encontrado"
    return "Não encontrado"

def normalizar_lente(valor):
    if not valor: return "Não encontrado"
    v = valor.replace(",", ".").lower().strip()
    m_range = re.search(r"(\d+\.?\d*)\s*(?:mm)?\s*(?:to|-|~|até)\s*(\d+\.?\d*)\s*mm", v)
    if m_range: return f"{m_range.group(1)} mm - {m_range.group(2)} mm (Varifocal)"
    m_fixed = re.search(r"(\d+\.?\d*)\s*mm", v)
    if m_fixed: return f"{m_fixed.group(1)} mm (Fixa)"
    return valor

def normalizar_protocolos(valor):
    if not valor: return []
    candidatos = re.split(r'[;,/]', valor)
    return sorted(set([clean_value(v) for v in candidatos if v.strip() and len(v) > 2]))

def normalizar_navegadores(valor):
    if not valor: return []
    candidatos = re.split(r"[,;/]", valor)
    return [v.strip() for v in candidatos if v.strip()]

# =========================
# Tags e Padrões (sem alteração)
# =========================
TAGS_POR_SIGLA = { "LPR": "Leitura de Placas","SD": "Speed Dome","SC": "Super Color","FC": "Full Color","FC+": "Full Color+","IA": "Inteligência Artificial","D": "Dome","B": "Bullet","PAN": "Panorâmica","PTZ": "Motorizada","STARVIS": "Sensor STARVIS" }
def extrair_tags_por_nome(modelo, texto):
    tags = []
    for sigla, significado in TAGS_POR_SIGLA.items():
        if re.search(rf"(?:\b|[-_+]){sigla}(?:\b|[-_+])", modelo, re.IGNORECASE): tags.append(significado)
    extras = {"PoE": "PoE", "SMD": "Smart Motion Detection", "Face Detection": "Detecção Facial", "People Counting": "Contagem de Pessoas"}
    for termo, significado in extras.items():
        if termo.lower() in texto.lower(): tags.append(significado)
    return sorted(set(tags))

PATTERNS = {
    "video": { "resolucao_maxima": r"(?:Resolução Máxima|Max\. Resolution|Resolution|Pixels Efetivos|Effective Pixels)", "sensor_imagem": r"(?:Sensor de imagem|Image Sensor|Image Device)", "wdr": r"(?:WDR|Wide Dynamic Range|DWDR)", "compressao_video": r"(?:Compressão de vídeo|Video Compression)", "taxa_de_bits": r"(?:Taxa de bits|Video Bit Rate|Bitrate|Data rate|Stream Rate)", },
    "audio": { "microfone_embutido": r"(?:Microfone embutido|Built-in Microphone)", "compressao_audio": r"(?:Compressão de áudio|Audio Compression)", },
    "rede": { "interface_rede": r"(?:Interface de rede|Ethernet Interface|Network Interface|\bLAN\b)", "throughput": r"(?:Throughput Máximo|Max\. Throughput|Throughput)", "protocolos": r"(?:Protocolos e serviços suportados|Protocols|Supported Protocols)", "onvif": r"\b(Onvif|Open Network Video Interface)\b", "navegador": r"(?:Navegador|Web Browser|Browser)", },
    "inteligencia": { "deteccao_movimento": r"(?:Detecção de movimento|Motion detection|Basic Event)", "regiao_interesse": r"(?:Região de interesse|Region of Interest|\bROI\b)", "protecao_perimetral": r"(?:Proteção Perimetral|Perimeter Protection|Intrusion|Line crossing)", },
    "energia": { "tensao_alimentacao": r"(?:Alimentação|Power Supply|Power Source)", "consumo_potencia": r"(?:Consumo|Power Consumption and Current|\bPower Consumption\b)", },
    "fisico": { "peso": r"\b(Peso|Weight)\b", "distancia_ir": r"(?:Distância IR|IR Range|IR Distance|Supplement Light Range)" }
}
PATTERNS_HIKVISION_CORRIGIDO = { "video": { "wdr": r"(?:WDR|Wide Dynamic Range)", } }

# =========================
# Analisador principal
# =========================
def analisar_datasheet(texto_original):
    especificacoes = {"video": {}, "audio": {}, "rede": {}, "inteligencia": {}, "energia": {}, "fisico": {}}
    # ... (identificação de fabricante e modelo continua igual) ...
    if "intelbras" in texto_original.lower(): especificacoes["fabricante"] = "Intelbras"
    elif "hikvision" in texto_original.lower(): especificacoes["fabricante"] = "Hikvision"
    elif "avigilon" in texto_original.lower(): especificacoes["fabricante"] = "Avigilon"
    else: especificacoes["fabricante"] = "Desconhecido"
    stop_words = r"(?:Sensor|Pixels|Lente|Especificações|Câmera|Distância|Compressão|Resolução)"
    intelbras_pattern = rf"\b(VIP(?:\s|[C|M|W])*?\d{{3,5}}(?:[\s\-]+[A-Z\d\+\.\/]+(?!\s*{stop_words})){{0,4}})\b"
    hikvision_pattern = r"\b(DS-2[CD|DE][\w\d\-]+)\b"
    avigilon_pattern = r"\b(H4A-[\w\-]+)\b"
    modelos = re.findall(f"({intelbras_pattern}|{hikvision_pattern}|{avigilon_pattern})", texto_original, re.IGNORECASE)
    modelo_produto = ", ".join(sorted(set([m[0].strip() for m in modelos if m[0]]))) or "Não encontrado"
    especificacoes["modelo_produto"] = clean_value(modelo_produto)
    especificacoes["tags"] = extrair_tags_por_nome(modelo_produto, texto_original)
    lente_m = re.search(r"(\d+\.?\d*\s*(?:mm)?\s*(?:to|-)\s*\d+\.?\d*\s*mm|\b\d+\.?\d*\s*mm\b)", texto_original, re.IGNORECASE)
    especificacoes["distancia_focal"] = normalizar_lente(lente_m.group(1) if lente_m else "")
    ip_match = re.search(r"(IP\d{2})", texto_original, re.IGNORECASE)
    especificacoes["fisico"]["grau_protecao"] = ip_match.group(1).upper() if ip_match else "Não encontrado"
    dimensoes_m = re.search(r"(\d[\d\.]+\s*mm\s*[xX×]\s*\d[\d\.]+\s*mm\s*[xX×]\s*\d[\d\.]+\s*mm)", texto_original)
    especificacoes["fisico"]["dimensoes"] = clean_value(dimensoes_m.group(1) if dimensoes_m else "Não encontrado")

    padroes_esp = PATTERNS_HIKVISION_CORRIGIDO if especificacoes["fabricante"] == "Hikvision" else {}
    for categoria, campos in PATTERNS.items():
        for chave, padrao in campos.items():
            padrao_final = padroes_esp.get(categoria, {}).get(chave, padrao)
            valor_bruto = buscar_valor(texto_original, padrao_final)
            
            # Aplica normalizadores genéricos primeiro
            if chave == "peso": valor_final = normalizar_peso(valor_bruto)
            elif chave == "protocolos": valor_final = normalizar_protocolos(valor_bruto)
            elif chave == "navegador": valor_final = normalizar_navegadores(valor_bruto)
            else: valor_final = clean_value(valor_bruto)
            
            # ✨ REFINAMENTO: Aplica o pós-processador "especialista" se ele existir
            if chave in POST_PROCESSORS:
                valor_final = POST_PROCESSORS[chave](valor_final)

            especificacoes[categoria][chave] = valor_final if valor_final else "Não encontrado"
            
    # ... (Lógica híbrida de resolução e heurística de temperatura continuam iguais) ...
    resolucao_formatada = formatar_resolucao(especificacoes["video"]["resolucao_maxima"])
    placeholders_invalidos = ["h x v", "scaling", ""]
    if not resolucao_formatada or especificacoes["video"]["resolucao_maxima"].lower() in placeholders_invalidos:
        resolucao_m = re.search(r"(\d{3,4}\s*[xX×\n\s]*\s*\d{3,4})", texto_original)
        if resolucao_m:
            resolucao_formatada = formatar_resolucao(resolucao_m.group(0))
    especificacoes["video"]["resolucao_maxima"] = resolucao_formatada if resolucao_formatada else "Não encontrado"
    especificacoes["video"]["pixels_efetivos"] = especificacoes["video"]["resolucao_maxima"]
    
    valor_temp = buscar_temperatura(texto_original)
    especificacoes["fisico"]["temperatura_operacao"] = normalizar_temperatura(valor_temp)
    
    if especificacoes["fabricante"] == "Intelbras":
        temp_obj = especificacoes["fisico"].get("temperatura_operacao")
        if temp_obj and temp_obj.get("min") is not None:
            if temp_obj["min"] > 0:
                especificacoes["fisico"]["temperatura_operacao"]["min"] = -abs(temp_obj["min"])

    return especificacoes

# =========================
# Execução principal (para ser chamado pelo Node.js)
# =========================
if __name__ == '__main__':
    if len(sys.argv) != 3:
        erro = {"erro": "Uso: python analisador.py <caminho_pdf1> <caminho_pdf2>"}
        print(json.dumps(erro))
        sys.exit(1)

    caminho_pdf1 = sys.argv[1]
    caminho_pdf2 = sys.argv[2]

    try:
        texto1 = extrair_texto_do_pdf(caminho_pdf1)
        texto2 = extrair_texto_do_pdf(caminho_pdf2)
        dados1 = analisar_datasheet(texto1) if texto1 else {"erro": f"Não foi possível ler o primeiro arquivo"}
        dados2 = analisar_datasheet(texto2) if texto2 else {"erro": f"Não foi possível ler o segundo arquivo"}
        resultado_final = { "camera1": dados1, "camera2": dados2 }
        print(json.dumps(resultado_final, ensure_ascii=False))
    except Exception as e:
        erro = {"erro": str(e)}
        print(json.dumps(erro))
        sys.exit(1)