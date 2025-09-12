import React, { useState, useEffect } from 'react';
import './dashboard.css';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok && data.success) setIsLoggedIn(true);
    else setError('Usuário ou senha incorretos.');
  };

  // Carregar logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/chat-logs');
        if (!response.ok) throw new Error('Falha ao carregar logs.');
        const data = await response.json();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      }
    };
    if (isLoggedIn) fetchLogs();
  }, [isLoggedIn]);

  // Upload do Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/api/upload-psd", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadStatus(`✅ ${data.message} (${data.total} produtos)`);
      } else {
        setUploadStatus(`❌ Erro: ${data.message}`);
      }
    } catch (err) {
      setUploadStatus("❌ Falha ao enviar arquivo.");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-container">
        <h2>Área de Administração</h2>
        <form onSubmit={handleLogin} className="admin-login-form">
          {error && <p className="admin-error">{error}</p>}
          <input type="text" placeholder="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h2>Painel Administrativo</h2>

      {/* Upload */}
      <div className="admin-upload">
        <h3>Upload PSD Intelbras</h3>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>

      {/* Logs */}
      <div className="admin-logs-table">
        <h3>Logs do Assistente</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Pergunta</th>
              <th>Resposta</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={index}>
                <td>{new Date(log.data).toLocaleString()}</td>
                <td>{log.pergunta}</td>
                <td>{log.resposta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
