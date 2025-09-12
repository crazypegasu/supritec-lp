import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";
import multer from "multer";
import xlsx from "xlsx";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const db = require('./database/database.cjs');

dotenv.config();

// Configuração do upload de arquivo
const upload = multer({ dest: "uploads/" });

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Armazena histórico de chat em memória
let historico = [];

// 🔹 Função para carregar o histórico do arquivo JSON ao iniciar o servidor
function carregarHistoricoDoArquivo() {
  const logFilePath = path.join(__dirname, "chat_logs.json");
  if (fs.existsSync(logFilePath)) {
    try {
      const fileContent = fs.readFileSync(logFilePath, "utf-8");
      // Filtra linhas vazias e faz o parse de cada linha JSON
      const logs = fileContent
        .trim()
        .split("\n")
        .filter((line) => line)
        .map((line) => JSON.parse(line));

      // Filtra logs que contêm 'pergunta' e 'resposta' para o chat
      historico = logs.filter((log) => log.pergunta && log.resposta);

      console.log("✅ Histórico de chat carregado do arquivo.");
    } catch (err) {
      console.error("Erro ao carregar histórico do arquivo:", err);
    }
  }
}
carregarHistoricoDoArquivo();

// 🔹 Carregar produtos encerrados (CSV)
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

// 🔹 Endpoint para expor encerrados
app.get("/api/encerrados", (req, res) => {
  res.json(encerrados);
});

// 🔹 Busca no catálogo local
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

// 🔹 Consulta WolframAlpha API
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



// ## Rotas de Autenticação e Gerenciamento

// 🆕 Rota de autenticação para o painel de admin
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // Busca o usuário no banco de dados
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error." });
    }

    // Se o usuário não for encontrado
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Compara a senha fornecida com a senha criptografada do banco de dados
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error." });
      }

      if (result) {
        // Login bem-sucedido
        const isAdmin = user.username === 'admin';
        res.json({ success: true, message: "Login successful!", isAdmin });
      } else {
        // Senha incorreta
        res.status(401).json({ success: false, message: "Invalid credentials." });
      }
    });
  });
});

// 🆕 Rota para registrar novos usuários
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username e password são obrigatórios." });
  }

  // Criptografa a senha antes de salvar no banco de dados
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erro ao criptografar a senha." });
    }

    // Insere o novo usuário no banco de dados
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hash],
      function (err) {
        if (err) {
          // sqlite3 erro 19 é "UNIQUE constraint failed"
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

// 🆕 Rota para obter a lista de usuários (restrito a admin)
app.get("/api/users", (req, res) => {
  const { username } = req.query;

  // Verificação de acesso: somente o usuário 'admin' pode ver esta lista
  if (username !== 'admin') {
    return res.status(403).json({ success: false, message: "Acesso negado." });
  }

  // Busca todos os usuários, mas omite a senha por segurança
  db.all("SELECT id, username FROM users", (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erro ao buscar usuários." });
    }
    res.json({ success: true, users: rows });
  });
});



// ## Rotas de Painel Administrativo

// 🆕 Rota para obter os logs de chat
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

// 🆕 Rota para buscar o histórico de chat do dia atual
app.get("/api/chat/history", (req, res) => {
  const hoje = new Date().toISOString().split("T")[0]; // pega apenas a parte YYYY-MM-DD

  // Filtra apenas logs do dia atual
  const historicoHoje = historico.filter((log) => log.data.startsWith(hoje));

  // Converte para o formato esperado pelo front
  const historicoFormatado = historicoHoje.flatMap((log) => [
    { autor: "Você", texto: log.pergunta },
    { autor: "Assistente", texto: log.resposta },
  ]);

  res.json({ history: historicoFormatado });
});

// 🔹 Upload do Excel e conversão automática com backup
app.post("/api/upload-psd", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Nenhum arquivo enviado." });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Mapeia para o formato do produtos_intelbras.json
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

    // Salva no JSON substituindo o antigo
    fs.writeFileSync("produtos_intelbras.json", JSON.stringify(produtos, null, 2), "utf8");

    // Backup organizado com timestamp
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

// 📂 Listar backups disponíveis
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

    res.json(files.sort((a, b) => b.data - a.data)); // mais recentes primeiro
  } catch (err) {
    console.error("Erro ao listar backups:", err);
    res.status(500).json({ success: false, message: "Erro ao listar backups." });
  }
});

// 📥 Download de backup
app.get("/api/backups/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.resolve("uploads/backup", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Arquivo não encontrado." });
    }

    res.download(filePath); // força download
  } catch (err) {
    console.error("Erro ao baixar backup:", err);
    res.status(500).json({ success: false, message: "Erro ao baixar backup." });
  }
});


// ## Rota Principal do Chat

// 🔹 Rota principal do chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Mensagem vazia." });
    }

    let contexto = [];
    let fallbackText = "";
    let origem = "GPT";

    // 1️⃣ Catálogo
    const resultadosCatalogo = await buscarNoCatalogo(message);
    if (resultadosCatalogo.length > 0) {
      contexto = resultadosCatalogo.map(
        (p) =>
          `Produto: ${p.descricao}, Código: ${p.codigo}, Segmento: ${p.segmento}, PSD: ${p.psd}, PSCF: ${p.pscf}, Status: ${p.status}`
      );
      origem = "Catálogo";
    } else {
      // 2️⃣ Encerrados
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
        // 3️⃣ Wolfram
        const wolframResp = await buscarNoWolfram(message);
        if (wolframResp) {
          fallbackText = wolframResp;
          origem = "WolframAlpha";
        }
      }
    }

    // 4️⃣ GPT costura
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
              "Você é um assistente que ajuda vendedores a comparar e entender produtos Intelbras e PPA. Se o produto estiver encerrado, sempre mostre o substituto ou indicação. Responda claro e objetivo (até 6 linhas).",
          },
          {
            role: "system",
            content: `Contexto:\n${contexto.join("\n")}\n${fallbackText}`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const resposta = data.choices?.[0]?.message?.content || "Sem resposta.";

    // log
    const log = { pergunta: message, resposta, origem, data: new Date().toISOString() };
    fs.appendFileSync("chat_logs.json", JSON.stringify(log) + "\n");
    // 🆕 Adiciona a mensagem ao histórico em memória para respostas instantâneas
    historico.push(log);

    res.json({ reply: resposta, origem });
  } catch (error) {
    console.error("Erro na API:", error);
    res.status(500).json({ error: "Erro ao conectar com o OpenAI" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server AI rodando em http://localhost:${PORT}`);
});