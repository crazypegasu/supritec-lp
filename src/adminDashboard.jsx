import React, { useState, useEffect } from 'react';
import './dashboard.css'

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  // Lógica para o login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    // Altere a URL para a porta correta do seu servidor Node.js
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok && data.success) { // Verifica se a resposta foi bem-sucedida
      setIsLoggedIn(true);
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  // Lógica para carregar os logs após o login
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Altere a URL para a porta correta do seu servidor Node.js
        const response = await fetch('http://localhost:5000/api/chat-logs');
        
        if (!response.ok) {
          throw new Error('Falha ao carregar logs.');
        }
        const data = await response.json();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      }
    };

    if (isLoggedIn) {
      fetchLogs();
    }
  }, [isLoggedIn]);

  // Se não estiver logado, exibe o formulário de login
  if (!isLoggedIn) {
    return (
      <div className="admin-container">
        <h2>Área de Administração</h2>
        <form onSubmit={handleLogin} className="admin-login-form">
          {error && <p className="admin-error">{error}</p>}
          <input
            type="text"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  // Se estiver logado, exibe a tabela de logs
  return (
    <div className="admin-container">
      <h2>Logs do Assistente de Chat</h2>
      <div className="admin-logs-table">
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
