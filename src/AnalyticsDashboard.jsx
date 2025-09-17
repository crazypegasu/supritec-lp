import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './dashboard.css';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);
export default function AnalyticsDashboard({ username }) {
  const [analiseData, setAnaliseData] = useState(null);
  const [analiseStatus, setAnaliseStatus] = useState('');
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
    fetchAnaliseData();
  }, []);
  const renderAnaliseDashboard = () => {
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
          {analiseData.usuario_mais_ativo && (
            <div className="metric-card">
              <h4>Usuário Mais Ativo</h4>
              <p><strong>{analiseData.usuario_mais_ativo.username}</strong></p>
              <p>({analiseData.usuario_mais_ativo.contagem} perguntas)</p>
            </div>
          )}
        </div>
        {username === 'admin' && (
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
  return renderAnaliseDashboard();
}