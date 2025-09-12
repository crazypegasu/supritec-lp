import React, { useState, useEffect } from 'react';
import './dashboard.css';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // Novo estado para verificar se é admin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  const [users, setUsers] = useState([]); // Novo estado para a lista de usuários
  const [newUser, setNewUser] = useState({ username: '', password: '' }); // Novo estado para criar usuário
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
    if (response.ok && data.success) {
      setIsLoggedIn(true);
      setIsAdmin(data.isAdmin); // Armazena se é admin
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  // Carregar dados (logs, backups e, se for admin, usuários)
  useEffect(() => {
    const fetchLogsAndBackups = async () => {
      // ... (código para carregar logs e backups, sem alterações aqui)
      try {
        const logsResponse = await fetch('http://localhost:5000/api/chat-logs');
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          setLogs(logsData);
        } else {
          throw new Error('Falha ao carregar logs.');
        }

        const backupsResponse = await fetch('http://localhost:5000/api/backups');
        if (backupsResponse.ok) {
          const backupsData = await backupsResponse.json();
          setBackups(backupsData);
        } else {
          throw new Error('Falha ao carregar backups.');
        }
      } catch (err) {
        setError(err.message);
      }
    };
    
    const fetchUsers = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/users?username=${username}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        } else {
          // Acesso negado, ou erro
          console.error("Falha ao carregar usuários:", await response.json());
        }
      } catch (err) {
        console.error("Erro na requisição de usuários:", err);
      }
    };

    if (isLoggedIn) {
      fetchLogsAndBackups();
      // Carrega a lista de usuários somente se for admin
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [isLoggedIn, isAdmin, username]);

  // Upload do Excel
  const handleFileUpload = async (e) => {
    // ... (código existente, sem alterações)
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

  // Criar novo usuário
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();
      if (data.success) {
        setNewUser({ username: '', password: '' });
        alert(data.message);
        // Recarregar a lista de usuários após a criação
        if (isAdmin) {
          // Chama a função de busca novamente, ou atualiza o estado manualmente
          // Vamos fazer uma chamada simples para o exemplo:
          const usersResponse = await fetch(`http://localhost:5000/api/users?username=${username}`);
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setUsers(usersData.users);
          }
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Falha ao criar o usuário.");
    }
  };

  if (!isLoggedIn) {
    // ... (código de login, sem alterações)
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

      {/* Upload - Acesso a todos os usuários logados */}
      <div className="admin-upload">
        <h3>Upload PSD Intelbras</h3>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>

      <hr />

      {/* Backups - Acesso a todos os usuários logados */}
      <div className="admin-backups-table">
        <h3>Backups de Arquivos</h3>
        <table>
          <thead>
            <tr>
              <th>Nome do Arquivo</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup, index) => (
              <tr key={index}>
                <td>{backup.nome}</td>
                <td>{new Date(backup.data).toLocaleString()}</td>
                <td>
                  <a
                    href={`http://localhost:5000/api/backups/${backup.nome}`}
                    download
                    className="btn-download"
                  >
                    📥 Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr />

      {/* Seção de Gerenciamento de Usuários - VISÍVEL APENAS PARA ADMIN */}
      {isAdmin && (
        <>
          <div className="admin-users-section">
            <h3>Gerenciamento de Usuários</h3>
            
            {/* Formulário para criar novo usuário */}
            <div className="admin-create-user">
              <h4>Criar Novo Usuário</h4>
              <form onSubmit={handleCreateUser} className="admin-login-form">
                <input
                  type="text"
                  placeholder="Nome de Usuário"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
                <button type="submit">Criar Usuário</button>
              </form>
            </div>

            {/* Tabela de usuários cadastrados */}
            <div className="admin-users-table">
              <h4>Usuários Cadastrados</h4>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome de Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <hr />
        </>
      )}

      {/* Logs - Acesso a todos os usuários logados */}
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