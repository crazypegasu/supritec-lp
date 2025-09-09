// Comparador.jsx
import React, { useState, useEffect } from "react";
import ChatAssistente from "./ChatAssistente";

export default function Comparador() {
  const [produtosIntelbras, setProdutosIntelbras] = useState([]);
  const [produtosPPA, setProdutosPPA] = useState([]);
  const [encerrados, setEncerrados] = useState([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);
  
  // **NOVOS ESTADOS PARA O CHAT**
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagemInicialChat, setMensagemInicialChat] = useState("");

  // Carregar produtos Intelbras
  useEffect(() => {
    fetch("produtos_intelbras.json")
      .then((res) => res.json())
      .then((data) => setProdutosIntelbras(data));
  }, []);

  // Carregar produtos PPA
  useEffect(() => {
    fetch("produtos_ppa.json")
      .then((res) => res.json())
      .then((data) => setProdutosPPA(data));
  }, []);

  // Carregar produtos encerrados Intelbras
  useEffect(() => {
    fetch("api/encerramentos_intelbras_convertido.json")
      .then((res) => res.json())
      .then((data) => setEncerrados(data));
  }, []);

  // Mesclar encerrados com Intelbras
  const produtosIntelbrasComEncerrados = produtosIntelbras.map((p) => {
    const enc = encerrados.find(
      (e) => String(e["Código Produto"]) === String(p.codigo)
    );
    return enc
      ? {
          ...p,
          status: "encerrado",
          substituto: enc["Substituto Direto"] || null,
          indicacao: enc["Indicação"] || null,
        }
      : p;
  });

  // Juntar todos os produtos (Intelbras + PPA)
  const todosProdutos = [
    ...produtosIntelbrasComEncerrados.map((p) => ({
      codigo: p.codigo,
      descricao: p.descricao,
      unidade: p.unidade || p.Unidade,
      segmento: p.segmento || p.Segmento,
      familia: p.familia || p.Família,
      status: p.status || "ativo",
      substituto: p.substituto || null,
      indicacao: p.indicacao || null,
      tipo: "Intelbras",
    })),
    ...produtosPPA.map((p) => ({
      codigo: p.Código,
      descricao: p.Descrição,
      unidade: p.Unidade || "PPA",
      segmento: p.Segmento || "-",
      familia: p.Família || "-",
      status: p.Status || "ativo",
      substituto: p.Substituto || null,
      indicacao: p.Indicação || null,
      tipo: "PPA",
    })),
  ];

  // Adicionar produto
  const adicionarProduto = (produto) => {
    if (produtosSelecionados.length >= 3) {
      alert("Máximo de 3 produtos na comparação!");
      return;
    }
    if (!produtosSelecionados.find((p) => p.codigo === produto.codigo)) {
      setProdutosSelecionados([...produtosSelecionados, produto]);
    }
  };

  // Remover produto
  const removerProduto = (codigo) => {
    setProdutosSelecionados(
      produtosSelecionados.filter((p) => p.codigo !== codigo)
    );
  };

  // Limpar comparação
  const limparComparacao = () => {
    setProdutosSelecionados([]);
    setChatAberto(false);
    setMensagemInicialChat("");
  };
  
  // **NOVA FUNÇÃO: Prepara o prompt e abre o chat**
    const iniciarComparacaoIA = () => {
    // Cria o texto mais objetivo para enviar ao chat
    const prompt = `
      Faça uma breve comparação técnica dos seguintes produtos, destacando as características e diferenciais mais importantes.

      Produtos para comparação:
      ${produtosSelecionados.map((p) => {
        return `
        - Produto: ${p.descricao}
        - Código: ${p.codigo}
        - Unidade: ${p.unidade}
        - Segmento: ${p.segmento}
        - Família: ${p.familia}
        - Status: ${p.status}
        - Substituto: ${p.substituto || 'N/A'}
        - Indicação: ${p.indicacao || 'N/A'}
        - Marca: ${p.tipo}
        `;
      }).join('\n')}
    `;
    
    setMensagemInicialChat(prompt); // Define a nova mensagem inicial
    setChatAberto(true); // Abre o chat
  };

  return (
    <div className="comparador-container">
      <h2>🔎 Comparador de Produtos</h2>

      {/* Tabela de comparação - AGORA NO INÍCIO */}
      {produtosSelecionados.length > 0 && (
        <>
          <div className="tabela-comparacao">
            <table border="1">
              <thead>
                <tr>
                  <th>Atributo</th>
                  {produtosSelecionados.map((p) => (
                    <th key={p.codigo}>
                      {p.descricao}
                      <button onClick={() => removerProduto(p.codigo)}>❌</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Código</td>
                  {produtosSelecionados.map((p) => (
                    <td key={p.codigo}>{p.codigo}</td>
                  ))}
                </tr>
                <tr>
                  <td>Marca</td>
                  {produtosSelecionados.map((p) => (
                    <td key={p.codigo}>{p.tipo}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button onClick={limparComparacao}>🧹 Limpar comparação</button>
            <button onClick={iniciarComparacaoIA}>✨ Gerar Comparação Técnica</button>
          </div>
        </>
      )}

      {/* Renderiza o componente de chat se o estado 'chatAberto' for true */}
      {chatAberto && (
        <ChatAssistente 
          onClose={() => setChatAberto(false)} 
          initialMessage={mensagemInicialChat}
        />
      )}

      {/* Mensagem quando não há produtos selecionados */}
      {produtosSelecionados.length === 0 && (
        <p>Nenhum produto selecionado para comparação.</p>
      )}

      {/* Lista de produtos disponíveis */}
      <div className="produtos-disponiveis">
        <h3>Selecione até 3 produtos:</h3>
        <div className="grid-container">
          {todosProdutos.map((p) => (
            <div key={p.codigo} className="card-produto">
              <h4>{p.descricao}</h4>
              <p>Código: {p.codigo}</p>
              <p>{p.tipo}</p>
              <button onClick={() => adicionarProduto(p)}>➕ Comparar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}