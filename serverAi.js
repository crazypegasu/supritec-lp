import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";
import { parse } from "csv-parse/sync";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
