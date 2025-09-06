import React, { useState } from "react";

export default function ChatAssistente({ onClose }) {
  const [mensagem, setMensagem] = useState("");
  const [respostas, setRespostas] = useState([]);

  // URL do backend (pega do .env)
  const API_URL = import.meta.env.VITE_API_URL;

  const enviarMensagem = async () => {
    if (!mensagem.trim()) return;

    const novaConversa = [...respostas, { autor: "Você", texto: mensagem }];
    setRespostas(novaConversa);
    setMensagem("");

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: mensagem }),
      });

      const data = await res.json();
      setRespostas([...novaConversa, { autor: "Assistente", texto: data.reply }]);
    } catch (error) {
      setRespostas([...novaConversa, { autor: "Assistente", texto: "Erro ao conectar com servidor." }]);
    }
  };

  return (
    <div className="chat-popup">
      <div className="chat-popup-header">
        <h3>Assistente de Produtos 🤖</h3>
        <button onClick={onClose}>✖</button>
      </div>

      <div className="chat-body">
        {respostas.map((r, i) => (
          <p key={i} className={r.autor === "Você" ? "msg-user" : "msg-bot"}>
            <strong>{r.autor}:</strong> {r.texto}
          </p>
        ))}
      </div>

      <div className="chat-footer">
        <input
          type="text"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Digite sua dúvida..."
          onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
        />
        <button onClick={enviarMensagem}>Enviar</button>
      </div>
    </div>
  );
}
