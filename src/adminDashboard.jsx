import React, { useState, useEffect } from 'react';
import './dashboard.css';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);

export default function AdminDashboard({ username, isAdmin }) {
  const [logs, setLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const [analiseData, setAnaliseData] = useState(null);
  const [analiseStatus, setAnaliseStatus] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        console.error("Falha ao carregar usuários:", await response.json());
      }
    } catch (err) {
      console.error("Erro na requisição de usuários:", err);
    }
  };

  const fetchAnaliseData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/analise');
      if (response.ok) {
        const data = await response.json();
        setAnaliseData(data);
      } else {
        console.error("Falha ao carregar a análise:", await response.json());
        setAnaliseData(null);
      }
    } catch (err) {
      console.error("Erro na requisição da análise:", err);
      setAnaliseData(null);
    }
  };

  const handleExecutarAnalise = async () => {
    setAnaliseStatus("Executando análise, por favor aguarde...");
    try {
        const res = await fetch('http://localhost:5000/api/executar-analise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (data.success) {
            setAnaliseStatus(`✅ ${data.message} Atualizando dados...`);
            setTimeout(() => {
                fetchAnaliseData();
                setAnaliseStatus("Análise atualizada com sucesso!");
            }, 5000);
        } else {
            setAnaliseStatus(`❌ Erro: ${data.message}`);
        }
    } catch (err) {
        setAnaliseStatus('❌ Falha ao iniciar a análise.');
    }
  };

  useEffect(() => {
    const fetchLogsAndBackups = async () => {
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
    
    if (isAdmin) {
      fetchLogsAndBackups();
      fetchUsers();
    }
  }, [isAdmin, username]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", username);
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
        if (isAdmin) {
          fetchUsers();
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Falha ao criar o usuário.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Tem certeza que deseja deletar este usuário?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          fetchUsers();
        } else {
          alert(data.message);
        }
      } catch (err) {
        alert("Falha ao deletar o usuário.");
      }
    }
  };
  
  const renderAnalyticsDashboard = () => {
    if (!analiseData) {
      return <p>Carregando dados de análise...</p>;
    }
    const topPalavrasData = {
      labels: analiseData.top_palavras_geral.map(p => p.palavra).slice(0, 10),
      datasets: [{
        label: 'Frequência',
        data: analiseData.top_palavras_geral.map(p => p.contagem).slice(0, 10),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      }],
    };
    const sentimentosLabels = ['Positivo', 'Negativo', 'Neutro'];
    const sentimentosData = {
        labels: sentimentosLabels,
        datasets: [{
            data: sentimentosLabels.map(label => analiseData.analise_sentimento_geral[label.toLowerCase()]),
            backgroundColor: ['#2ecc71', '#e74c3c', '#bdc3c7'],
        }],
    };
    const temporalLabels = Object.keys(analiseData.analise_sentimento_temporal).map(key => key.split('-')[0]);
    const sentimentosTemporais = ['positivo', 'negativo', 'neutro'];
    const temporalDatasets = sentimentosTemporais.map(sentimento => ({
        label: sentimento.charAt(0).toUpperCase() + sentimento.slice(1),
        data: temporalLabels.map(dia => analiseData.analise_sentimento_temporal[`${dia}-${sentimento}`] || 0),
        borderColor: sentimento === 'positivo' ? '#2ecc71' : sentimento === 'negativo' ? '#e74c3c' : '#bdc3c7',
        backgroundColor: 'transparent',
        tension: 0.4,
    }));
    const topBigramasList = analiseData.top_bigramas_geral.slice(0, 10).map((item, index) => (
      <li key={index}>{item.bigrama}: {item.contagem}</li>
    ));
    const topTrigramasList = analiseData.top_trigramas_geral.slice(0, 10).map((item, index) => (
        <li key={index}>{item.trigrama}: {item.contagem}</li>
    ));
    return (
      <div className="analise-container">
        <h3>Dashboard de Análise</h3>
        <div className="analise-metrics">
          <div className="metric-card">
            <h4>Total de Mensagens</h4>
            <p>{analiseData.total_mensagens}</p>
          </div>
          <div className="metric-card">
            <h4>Palavras-Chave</h4>
            <p>Intelbras: {analiseData.palavras_chave.intelbras}</p>
            <p>Código: {analiseData.palavras_chave.codigo}</p>
          </div>
          <div className="metric-card">
              <h4>Total Positivo</h4><p>{analiseData.analise_sentimento_geral.positivo}</p>
          </div>
          <div className="metric-card">
              <h4>Total Negativo</h4><p>{analiseData.analise_sentimento_geral.negativo}</p>
          </div>
        </div>
        
        {isAdmin && (
            <div className="analise-actions">
                <button onClick={handleExecutarAnalise} className="btn-executar-analise">
                    Atualizar Análise (rodar script Python)
                </button>
                {analiseStatus && <p>{analiseStatus}</p>}
            </div>
        )}

        <div className="chart-wrapper">
          <h4>Top 10 Palavras</h4>
          <Bar
              data={topPalavrasData}
              options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }}
          />
        </div>
        <div className="chart-wrapper">
          <h4>Sentimento Geral</h4>
          <Doughnut data={sentimentosData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
        <div className="chart-wrapper">
            <h4>Sentimento ao Longo do Tempo</h4>
            <Line
                data={{
                    labels: temporalLabels,
                    datasets: temporalDatasets,
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
            />
        </div>
        <div className="text-analysis-container">
          <h4>Top 10 Bigramas</h4>
          <ul>{topBigramasList}</ul>
        </div>
        <div className="text-analysis-container">
          <h4>Top 10 Trigramas</h4>
          <ul>{topTrigramasList}</ul>
        </div>
      </div>
    );
  };
  
  return (
    <div className="admin-container">
      <h2>Painel Administrativo</h2>
      
      {isAdmin && (
        <div className="admin-upload">
          <h3>Upload PSD Intelbras</h3>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
          {uploadStatus && <p>{uploadStatus}</p>}
        </div>
      )}

      <hr />
      
      <div className="admin-nav-buttons">
          <button onClick={() => setShowAnalytics(false)} disabled={!showAnalytics}>
              Visualização Principal
          </button>
          <button onClick={() => {
              setShowAnalytics(true);
              fetchAnaliseData();
          }} disabled={showAnalytics}>
              Dashboard de Análise
          </button>
      </div>

      <hr />

      {showAnalytics ? (
          renderAnalyticsDashboard()
      ) : (
          <>
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

            {isAdmin && (
              <>
                <div className="admin-users-section">
                  <h3>Gerenciamento de Usuários</h3>
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
                  <div className="admin-users-table">
                    <h4>Usuários Cadastrados</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nome de Usuário</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.username}</td>
                            <td>
                              <button 
                                onClick={() => handleDeleteUser(user.id)} 
                                className="btn-delete-user"
                              >
                                Deletar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <hr />
              </>
            )}

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
          </>
      )}
    </div>
  );
}