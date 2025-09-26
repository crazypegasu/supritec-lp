import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; // ✨ 1. Importação organizada
import './ComparadorDatasheet.css'; // Importando o CSS

function ComparadorDatasheet() {
  const [files, setFiles] = useState([]);
  const [resultado, setResultado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFiles(acceptedFiles);
      setError(''); // Limpa erros anteriores ao selecionar novos arquivos
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 2,
    onDropRejected: () => {
        setError("Por favor, envie exatamente 2 arquivos no formato PDF.");
    }
  });

  const handleCompare = async () => {
    if (files.length !== 2) {
      setError("É necessário selecionar 2 arquivos para comparar.");
      return;
    }

    setLoading(true);
    setResultado('');
    setError('');
    
    const formData = new FormData();
    formData.append('datasheet1', files[0]);
    formData.append('datasheet2', files[1]);

    try {
      // A rota que você criou no serverAi.js
      const response = await axios.post('http://localhost:5000/api/comparar-datasheets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResultado(response.data.comparison);
    } catch (err) {
      console.error("Erro ao comparar:", err);
      setError("Ocorreu um erro durante a comparação. Verifique o console do servidor e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comparador-container">
      <h2>Comparador de Datasheets de Câmeras IP</h2>
      <p>Arraste e solte dois arquivos PDF na área abaixo para comparar as especificações técnicas.</p>
      
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <p>
          {files.length === 0 
            ? "Arraste e solte 2 arquivos PDF aqui, ou clique para selecionar."
            : "Arquivos selecionados:"
          }
        </p>
        <ul className="file-list">
          {files.map(file => <li key={file.path}>- {file.path} ({Math.round(file.size / 1024)} KB)</li>)}
        </ul>
      </div>

      {error && <p className="error-message">{error}</p>}
      
      <button onClick={handleCompare} disabled={loading || files.length !== 2} className="compare-button">
        {loading ? 'Analisando e Comparando...' : 'Comparar Agora'}
      </button>
      
      {loading && <div className="loader"></div>}

      {resultado && (
        <div className="resultado-log">
          <h3>Resultado da Comparação:</h3>
          {/* ✨ 2. A MÁGICA ACONTECE AQUI! Trocamos <pre> por <ReactMarkdown> */}
          <ReactMarkdown>{resultado}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default ComparadorDatasheet;