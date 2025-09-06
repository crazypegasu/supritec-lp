import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Mensagem vazia." });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um assistente que ajuda vendedores a comparar e entender produtos Intelbras e PPA. Responda de forma curta e objetiva, no máximo 2-3 linhas. Com um foco maior em produto Intelbras"
          },
          { role: "user", content: message },
        ],
        max_tokens: 80  // limite de palavras/resposta
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      res.json({ reply: data.choices[0].message.content });
    } else if (data.error) {
      console.error("Erro da OpenAI:", data.error);
      res.status(500).json({ error: data.error.message });
    } else {
      console.error("Resposta inesperada da OpenAI:", data);
      res.status(500).json({ error: "Resposta inesperada da OpenAI" });
    }

  } catch (error) {
    console.error("Erro na API:", error);
    res.status(500).json({ error: "Erro ao conectar com o OpenAI" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server AI rodando em http://localhost:${PORT}`);
});
