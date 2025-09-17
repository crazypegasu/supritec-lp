// ChatAssistente.jsx
import React, { useState, useEffect } from "react";

// Adicione 'username' como uma prop
export default function ChatAssistente({ onClose, initialMessage, username }) { 
  const [mensagem, setMensagem] = useState("");
  const [respostas, setRespostas] = useState([]);

  // URL do backend pega do .env
  const API_URL = import.meta.env.VITE_API_URL;

  // Lógica para enviar a mensagem
  const enviarMensagem = async (msg) => {
    // Usa a mensagem passada como argumento ou a mensagem do estado
    const messageToSend = msg || mensagem;
    if (!messageToSend.trim()) return;

    // Adiciona a mensagem do usuário ao estado
    const novaConversa = [...respostas, { autor: "Você", texto: messageToSend }];
    setRespostas(novaConversa);
    // Limpa o input apenas se a mensagem veio do input (não do initialMessage)
    if (!msg) {
      setMensagem("");
    }

    try {
      // Inclua o 'username' no corpo da requisição
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend, username }),
      });

      const data = await res.json();
      setRespostas([...novaConversa, { autor: "Assistente", texto: data.reply }]);
    } catch (error) {
      console.error("Erro ao conectar com servidor.", error);
      setRespostas([...novaConversa, { autor: "Assistente", texto: "Erro ao conectar com servidor." }]);
    }
  };

  // Efeito para buscar o histórico de chat e enviar uma mensagem inicial
  useEffect(() => {
    // Função para buscar o histórico
    const carregarHistorico = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/history`);
        const data = await res.json();
        setRespostas(data.history || []);
      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
      }
    };
    
    carregarHistorico();

    if (initialMessage) {
      enviarMensagem(initialMessage);
    }
  }, [initialMessage, API_URL]); // O efeito roda quando a mensagem inicial ou a URL da API mudam

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
        <button onClick={() => enviarMensagem()}>Enviar</button>
      </div>
    </div>
  );
}