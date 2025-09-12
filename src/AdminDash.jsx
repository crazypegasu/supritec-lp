// src/AdminDash.jsx
import React, { useState, useEffect } from "react";

export default function AdminDash() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [backups, setBackups] = useState([]);

  // Carregar lista de backups ao abrir
  useEffect(() => {
    fetch("http://localhost:5000/backups")
      .then((res) => res.json())
      .then((data) => setBackups(data))
      .catch((err) => console.error("Erro ao carregar backups:", err));
  }, []);

  // Upload da planilha
  const handleUpload = async () => {
    if (!file) {
      setMessage("Selecione um arquivo primeiro!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message || "Upload realizado com sucesso!");
    } catch (err) {
      console.error("Erro no upload:", err);
      setMessage("Erro ao enviar arquivo.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📊 Painel Administrativo</h2>

      {/* Upload */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-100">
        <h3 className="text-lg font-semibold mb-2">Enviar nova planilha</h3>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2"
        />
        <button
          onClick={handleUpload}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Enviar
        </button>
        {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
      </div>

      {/* Lista de backups */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">📂 Backups</h3>
        {backups.length > 0 ? (
          <ul className="list-disc pl-6">
            {backups.map((file, idx) => (
              <li key={idx} className="mb-1">
                {file}
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum backup encontrado.</p>
        )}
      </div>
    </div>
  );
}
