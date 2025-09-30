import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import FormData from "form-data"; // Adicione esta linha se não tiver
import cors from "cors";
import fs from "fs";
import multer from "multer";
import xlsx from "xlsx";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { createRequire } from 'node:module';
import { exec, spawn } from "child_process"; 
const require = createRequire(import.meta.url);
const db = require('./database/database.cjs');

dotenv.config();

const upload = multer({ dest: "uploads/" });

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LÓGICA PARA INICIAR E GERENCIAR O SERVIDOR PYTHON AUTOMATICAMENTE
// =======================================================================
let pythonApiProcess = null;

function iniciarServidorPython() {
  console.log("🚀 Iniciando o servidor da API Python (Flask) na porta 5001...");

  const pythonExecutable = path.join(__dirname, "comparador_datasheet", "venv", "Scripts", "python.exe"); // Para Windows
  const pythonScriptPath = path.join(__dirname, "comparador_datasheet", "api_datasheet.py");
  
  if (!fs.existsSync(pythonScriptPath)) {
      console.error(`[ERRO CRÍTICO] O script da API Python não foi encontrado em: ${pythonScriptPath}`);
      return;
  }

  pythonApiProcess = spawn(pythonExecutable, [pythonScriptPath]);

  pythonApiProcess.stdout.on('data', (data) => console.log(`[Python API]: ${data.toString().trim()}`));
  pythonApiProcess.stderr.on('data', (data) => console.error(`[ERRO Python API]: ${data.toString().trim()}`));
  pythonApiProcess.on('close', (code) => console.log(`Serviço Python finalizado com código ${code}`));
}

function encerrarServidores() {
  console.log("\n🔌 Encerrando servidores...");
  if (pythonApiProcess) {
    console.log("➡️  Desligando a API Python...");
    pythonApiProcess.kill('SIGINT');
  }
  process.exit();
}

process.on('SIGINT', encerrarServidores);
process.on('SIGTERM', encerrarServidores);
// =======================================================================


let historico = [];

function carregarHistoricoDoArquivo() {
  const logFilePath = path.join(__dirname, "chat_logs.json");
  if (fs.existsSync(logFilePath)) {
    try {
      const fileContent = fs.readFileSync(logFilePath, "utf-8");
      const logs = fileContent
        .trim()
        .split("\n")
        .filter((line) => line)
        .map((line) => JSON.parse(line));
      historico = logs.filter((log) => log.pergunta && log.resposta);
      console.log("✅ Histórico de chat carregado do arquivo.");
    } catch (err) {
      console.error("Erro ao carregar histórico do arquivo:", err);
    }
  }
}
carregarHistoricoDoArquivo();

let encerrados = [];
function carregarEncerrados() {
  try {
    const csvData = fs.readFileSync("encerramentos_intelbras_convertido.csv", "utf8");
    encerrados = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ",",
    });
    console.log("✅ Encerramentos carregados:", encerrados.length);
  } catch (err) {
    console.error("Erro ao carregar CSV de encerramentos:", err);
  }
}
carregarEncerrados();

// ... (Todo o seu código de rotas continua exatamente igual) ...
// INÍCIO DO CÓDIGO INALTERADO
app.get("/api/encerrados", (req, res) => {
  res.json(encerrados);
});

async function buscarNoCatalogo(query) {
  try {
    const data = JSON.parse(fs.readFileSync("produtos_intelbras.json", "utf8"));
    const termo = query.toLowerCase();
    const resultados = data.filter(
      (p) =>
        p.descricao?.toLowerCase().includes(termo) ||
        String(p.codigo).includes(termo) ||
        p.segmento?.toLowerCase().includes(termo)
    );
    return resultados.slice(0, 3);
  } catch (err) {
    console.error("Erro ao buscar no catálogo:", err);
    return [];
  }
}

async function buscarNoWolfram(query) {
  const url = `https://api.wolframalpha.com/v1/result?i=${encodeURIComponent(
    query
  )}&appid=${process.env.WOLFRAM_APP_ID}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      return await res.text();
    } else {
      console.error("WolframAlpha sem resultado:", await res.text());
      return null;
    }
  } catch (err) {
    console.error("Erro ao buscar no Wolfram:", err);
    return null;
  }
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error." });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error." });
      }
      if (result) {
        const isAdmin = user.username === 'admin';
        res.json({ success: true, message: "Login successful!", isAdmin, username: user.username });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials." });
      }
    });
  });
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username e password são obrigatórios." });
  }
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erro ao criptografar a senha." });
    }
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hash],
      function (err) {
        if (err) {
          if (err.errno === 19) {
            return res.status(409).json({ success: false, message: "Usuário já existe." });
          }
          console.error(err);
          return res.status(500).json({ success: false, message: "Erro ao criar usuário." });
        }
        res.status(201).json({ success: true, message: "Usuário criado com sucesso!" });
      }
    );
  });
});

app.get("/api/users", (req, res) => {
  const { username } = req.query;
  if (username !== 'admin') {
    return res.status(403).json({ success: false, message: "Acesso negado." });
  }
  db.all("SELECT id, username FROM users", (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erro ao buscar usuários." });
    }
    res.json({ success: true, users: rows });
  });
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  if (username !== 'admin') {
    return res.status(403).json({ success: false, message: "Acesso negado. Apenas o admin pode deletar usuários." });
  }
  if (id == 1) {
    return res.status(403).json({ success: false, message: "Você não pode deletar a sua própria conta." });
  }
  db.run("DELETE FROM users WHERE id = ?", id, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erro ao deletar usuário." });
    }
    if (this.changes > 0) {
      res.json({ success: true, message: "Usuário deletado com sucesso!" });
    } else {
      res.status(404).json({ success: false, message: "Usuário não encontrado." });
    }
  });
});

app.get("/api/chat-logs", (req, res) => {
  const logFilePath = path.join(__dirname, "chat_logs.json");
  if (fs.existsSync(logFilePath)) {
    try {
      const fileContent = fs.readFileSync(logFilePath, "utf-8");
      const logs = fileContent
        .trim()
        .split("\n")
        .filter((line) => line)
        .map((line) => JSON.parse(line));
      res.json(logs);
    } catch (err) {
      console.error("Error reading or parsing chat logs:", err);
      res.status(500).json({ error: "Failed to read logs." });
    }
  } else {
    res.status(404).json({ error: "Log file not found." });
  }
});

app.get("/api/chat/history", (req, res) => {
  const hoje = new Date().toISOString().split("T")[0];
  const historicoHoje = historico.filter((log) => log.data.startsWith(hoje));
  const historicoFormatado = historicoHoje.flatMap((log) => [
    { autor: "Você", texto: log.pergunta },
    { autor: "Assistente", texto: log.resposta },
  ]);
  res.json({ history: historicoFormatado });
});

app.post("/api/upload-psd", upload.single("file"), (req, res) => {
  try {
    const { username } = req.body;
    if (username !== 'admin') {
      return res.status(403).json({ success: false, message: "Acesso negado. Apenas o admin pode fazer upload de arquivos." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Nenhum arquivo enviado." });
    }
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const produtos = sheetData.map((row, index) => ({
      tabela: row["Tabela"] || "",
      unidade: row["Unidade"] || "",
      segmento: row["Segmento"] || "",
      codigo: row["Código"] || 0,
      descricao: row["Descrição"] || "",
      psd: parseFloat(row["PSD"]) || 0,
      pscf: parseFloat(row["PSCF"]) || 0,
      id: index + 1,
      status: "em_linha",
    }));
    fs.writeFileSync("produtos_intelbras.json", JSON.stringify(produtos, null, 2), "utf8");
    const backupDir = path.resolve("uploads/backup");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup_${timestamp}_${req.file.originalname}`;
    const backupPath = path.join(backupDir, backupFileName);
    fs.renameSync(filePath, backupPath);
    res.json({
      success: true,
      message: "Arquivo PSD convertido e salvo com sucesso!",
      total: produtos.length,
      backup: backupFileName,
    });
  } catch (err) {
    console.error("Erro ao processar upload PSD:", err);
    res.status(500).json({ success: false, message: "Erro ao processar o arquivo." });
  }
});
app.get("/api/backups", (req, res) => {
  try {
    const backupDir = path.resolve("uploads/backup");
    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(backupDir).map((file) => ({
      nome: file,
      data: fs.statSync(path.join(backupDir, file)).mtime,
    }));
    res.json(files.sort((a, b) => b.data - a.data));
  } catch (err) {
    console.error("Erro ao listar backups:", err);
    res.status(500).json({ success: false, message: "Erro ao listar backups." });
  }
});

app.get("/api/backups/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.resolve("uploads/backup", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Arquivo não encontrado." });
    }
    res.download(filePath);
  } catch (err) {
    console.error("Erro ao baixar backup:", err);
    res.status(500).json({ success: false, message: "Erro ao baixar backup." });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, username } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Mensagem vazia." });
    }
    let contexto = [];
    let fallbackText = "";
    let origem = "GPT";
    const resultadosCatalogo = await buscarNoCatalogo(message);
    if (resultadosCatalogo.length > 0) {
      contexto = resultadosCatalogo.map(
        (p) =>
          `Produto: ${p.descricao}, Código: ${p.codigo}, Segmento: ${p.segmento}, PSD: ${p.psd}, PSCF: ${p.pscf}, Status: ${p.status}`
      );
      origem = "Catálogo";
    } else {
      const encerrado = encerrados.find(
        (p) =>
          String(p.codigo).trim() === String(message).trim() ||
          p.descricao?.toLowerCase().includes(message.toLowerCase())
      );
      if (encerrado) {
        contexto.push(
          `Produto ENCERRADO: ${encerrado.descricao} (código ${encerrado.codigo}).` +
            ` Substituto direto: ${encerrado.substituto || "nenhum"}.` +
            ` Indicação: ${encerrado.indicacao || "nenhuma"}.`
        );
        origem = "Encerrados CSV";
      } else {
        const wolframResp = await buscarNoWolfram(message);
        if (wolframResp) {
          fallbackText = wolframResp;
          origem = "WolframAlpha";
        }
      }
    }
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente especializado em produtos Intelbras e PPA. Sua função é ajudar vendedores a comparar e entender esses produtos. Se o produto estiver encerrado, apresente sempre o substituto ou uma indicação equivalente. Responda de forma clara, direta e objetiva, com até 6 linhas no máximo. Evite repetições e linguagem técnica desnecessária. Quando possível, destaque o benefício prático do produto para o cliente final. **Importante: Sempre finalize suas respostas com um breve aviso, como 'Lembre-se: sou uma IA. Confirme os detalhes técnicos com nossa equipe antes de fechar o pedido.'**).",
          },
          {
            role: "system",
            content: `Contexto:\n${contexto.join("\n")}\n${fallbackText}`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 300,
      }),
    });
    const data = await response.json();
    const resposta = data.choices?.[0]?.message?.content || "Sem resposta.";
    const log = { pergunta: message, resposta, origem, username, data: new Date().toISOString() };
    fs.appendFileSync("chat_logs.json", JSON.stringify(log) + "\n");
    historico.push(log);
    res.json({ reply: resposta, origem });
  } catch (error) {
    console.error("Erro na API:", error);
    res.status(500).json({ error: "Erro ao conectar com o OpenAI" });
  }
});

app.get('/api/analise', (req, res) => {
    const analiseFilePath = path.join(__dirname, 'backend_py', 'analise_logs.json');
    if (fs.existsSync(analiseFilePath)) {
        res.sendFile(analiseFilePath);
    } else {
        res.status(404).json({ error: 'Arquivo de análise não encontrado.' });
    }
});

app.post('/api/executar-analise', (req, res) => {
    const { username } = req.body;
    if (username !== 'admin') {
        return res.status(403).json({ success: false, message: 'Apenas o admin pode executar a análise.' });
    }
    const pythonScriptPath = path.join(__dirname, 'backend_py', 'analisar_logs.py');
    exec(`python "${pythonScriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao executar script Python: ${error}`);
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Stdout: ${stdout}`);
    });
    res.json({ success: true, message: 'Análise iniciada com sucesso. O processo está rodando em segundo plano.' });
});
// FIM DO CÓDIGO INALTERADO


// ROTA PARA COMPARAR DATASHEETS DE CÂMERAS IP
app.post(
  "/api/comparar-datasheets",
  upload.fields([
    { name: "datasheet1", maxCount: 1 },
    { name: "datasheet2", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.datasheet1 || !req.files.datasheet2) {
        return res.status(400).json({ error: "Dois arquivos PDF são necessários." });
      }

      const file1 = req.files.datasheet1[0];
      const file2 = req.files.datasheet2[0];

      // ✨ ALTERAÇÃO: Apontamos para a porta 5001, onde a API Python está rodando
      const pythonApiUrl = 'http://localhost:5001/processar-datasheets';
      
      const formData = new FormData();
      formData.append('datasheet1', fs.createReadStream(file1.path), file1.originalname);
      formData.append('datasheet2', fs.createReadStream(file2.path), file2.originalname);
      
      const pythonResponse = await fetch(pythonApiUrl, {
          method: 'POST',
          body: formData,
      });

      if (!pythonResponse.ok) {
          const errorText = await pythonResponse.text();
          throw new Error(`API Python retornou um erro: ${pythonResponse.statusText}. Detalhes: ${errorText}`);
      }
      
      const extractedData = await pythonResponse.json();

      fs.unlinkSync(file1.path);
      fs.unlinkSync(file2.path);

      const promptParaIA = `
        Você é o especialista técnico de vendas da Supritec, uma distribuidora de elite da Intelbras. Sua comunicação é clara, técnica, objetiva e focada em ajudar o vendedor a fechar negócio.

        **Sua Missão:** Analisar os dados técnicos de duas câmeras IP e gerar um comparativo de alta qualidade.

        **Instruções OBRIGATÓRIAS:**

        1.  **Tabela Comparativa:**
            * Crie uma tabela em formato Markdown com 3 colunas: "Característica", "Câmera 1" e "Câmera 2".
            * **Selecione as 8 a 10 características MAIS IMPORTANTES** para a comparação. Não liste tudo.
            * Se um dado não for encontrado no JSON ("Não encontrado"), escreva "Não especificado" ou "-" na tabela.
            * Cada linha da tabela deve conter a característica e os dados das duas câmeras na mesma linha.

        2.  **Pontos Fortes e Fracos:**
            * Após a tabela, crie uma seção para cada câmera.
            * Liste objetivamente 2 ou 3 pontos fortes e 1 ou 2 pontos fracos para cada uma, com base nos dados.

        3.  **Veredito e Argumento de Venda (Recomendação da Supritec):**
            * Finalize com uma recomendação clara.
            **Importante: Sempre finalize suas respostas com um breve aviso, como 'Lembre-se: sou uma IA. Confirme os detalhes técnicos com nossa equipe antes de fechar o pedido.'**
            * **Leve em conta o nosso foco estratégico na Intelbras.** Se a performance for similar ou se a vantagem da concorrente for pequena, recomende fortemente a Intelbras. Use argumentos como: "Como especialistas Supritec, recomendamos a [Modelo Intelbras] pela sua excepcional confiabilidade e pelo ecossistema completo que oferecemos, incluindo garantia e suporte técnico facilitado no Brasil."
            * Se a outra câmera for claramente superior em um ponto crucial (ex: resolução muito maior), reconheça a vantagem técnica dela, mas imediatamente posicione a Intelbras como a escolha de melhor **custo-benefício e segurança no pós-venda**. Ex: "Apesar da [Câmera Concorrente] ter uma resolução superior, para a maioria dos projetos, a [Modelo Intelbras] oferece uma qualidade de imagem excelente com a vantagem incomparável do suporte e da garantia que só um parceiro como a Supritec pode oferecer."

        **Dados Técnicos para Análise:**

        **Câmera 1: ${extractedData.camera1.fabricante || ""} ${extractedData.camera1.modelo_produto || "Modelo Desconhecido"}**
        \`\`\`json
        ${JSON.stringify(extractedData.camera1, null, 2)}
        \`\`\`

        **Câmera 2: ${extractedData.camera2.fabricante || ""} ${extractedData.camera2.modelo_produto || "Modelo Desconhecido"}**
        \`\`\`json
        ${JSON.stringify(extractedData.camera2, null, 2)}
        \`\`\`
      `;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: promptParaIA }],
          max_tokens: 1024,
          temperature: 0.5
        }),
      });
      
      const data = await response.json();
      const comparisonResult = data.choices?.[0]?.message?.content || "Não foi possível obter uma comparação.";

      const log = { camera1: file1.originalname, camera2: file2.originalname, resultado: comparisonResult, data: new Date().toISOString() };
      fs.appendFileSync("comparison_logs.json", JSON.stringify(log) + "\n");
      
      res.json({ comparison: comparisonResult });

    } catch (error) {
      console.error("Erro no endpoint /api/comparar-datasheets:", error);
      res.status(500).send("Erro interno no servidor.");
    }
  }
);


// ✨ ALTERAÇÃO: O servidor principal Node.js fica na porta 5000
const PORT = process.env.PORT || 5000;

// Inicia o servidor Python (que vai rodar na porta 5001)
iniciarServidorPython();

// Inicia o servidor Node.js
app.listen(PORT, () => {
  console.log(`✅ Server AI (Node.js) rodando em http://localhost:${PORT}`);
});