# api_datasheet.py
from flask import Flask, request, jsonify
import os

# Importa as funções que criamos no nosso script principal de análise
# O 'analisador' se refere ao arquivo 'analisador.py'
try:
    from analisador import analisar_datasheet, extrair_texto_do_pdf
except ImportError:
    # Se der erro na importação, dá uma mensagem de ajuda
    print("ERRO: Verifique se o arquivo 'analisador.py' está na mesma pasta que 'api_datasheet.py'")
    exit()

# Inicializa a aplicação Flask
app = Flask(__name__)

# Define uma pasta para salvar os PDFs que chegam pela API temporariamente
UPLOAD_FOLDER = 'temp_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/processar-datasheets', methods=['POST'])
def processar_datasheets():
    """
    Esta é a rota da nossa API. Ela vai receber os dois PDFs,
    processá-los com nosso script e devolver o JSON com os dados.
    """
    # 1. Verifica se os arquivos foram enviados corretamente na requisição
    if 'datasheet1' not in request.files or 'datasheet2' not in request.files:
        return jsonify({"erro": "Dois arquivos com os nomes 'datasheet1' e 'datasheet2' são necessários."}), 400

    datasheet1 = request.files['datasheet1']
    datasheet2 = request.files['datasheet2']

    # Garante que os arquivos têm nome
    if datasheet1.filename == '' or datasheet2.filename == '':
        return jsonify({"erro": "Um ou mais arquivos não foram selecionados."}), 400

    try:
        # 2. Salva os arquivos em uma pasta temporária para poderem ser lidos
        path1 = os.path.join(app.config['UPLOAD_FOLDER'], datasheet1.filename)
        path2 = os.path.join(app.config['UPLOAD_FOLDER'], datasheet2.filename)
        datasheet1.save(path1)
        datasheet2.save(path2)

        # 3. Usa nossas funções importadas para fazer a extração e análise
        texto1 = extrair_texto_do_pdf(path1)
        texto2 = extrair_texto_do_pdf(path2)

        # Analisa cada texto e prepara a resposta
        dados1 = analisar_datasheet(texto1) if texto1 else {"erro": f"Não foi possível ler o arquivo {datasheet1.filename}"}
        dados2 = analisar_datasheet(texto2) if texto2 else {"erro": f"Não foi possível ler o arquivo {datasheet2.filename}"}

        # 4. Limpa os arquivos temporários após o uso
        os.remove(path1)
        os.remove(path2)

        # 5. Retorna o resultado final em formato JSON para o seu backend Node.js
        return jsonify({
            "camera1": dados1,
            "camera2": dados2
        })

    except Exception as e:
        # Em caso de qualquer outro erro, retorna uma mensagem de erro genérica
        return jsonify({"erro": f"Ocorreu um erro no servidor Python: {str(e)}"}), 500


if __name__ == '__main__':
    # Roda o servidor Flask na porta 5001 em modo de desenvolvimento (debug=True)
    # O seu serverAi.js vai se comunicar com ele através de http://localhost:5000
    app.run(host='0.0.0.0', port=5001, debug=True)