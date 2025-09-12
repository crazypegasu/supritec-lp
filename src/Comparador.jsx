import React, { useState, useEffect } from "react";
import ChatAssistente from "./ChatAssistente";
import './comparador.css'

export default function Comparador() {
  const [produtosIntelbras, setProdutosIntelbras] = useState([]);
  const [produtosPPA, setProdutosPPA] = useState([]);
  const [encerrados, setEncerrados] = useState([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);

  // Estados para o Chat
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagemInicialChat, setMensagemInicialChat] = useState("");

  // Estado para o botão Voltar ao Topo
  const [showScrollButton, setShowScrollButton] = useState(false);

  // NOVO: Estado para a barra de pesquisa
  const [busca, setBusca] = useState("");

  // Carregar produtos Intelbras
  useEffect(() => {
    fetch("produtos_intelbras_september.json")
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

  // Filtrar produtos com base na busca
  const produtosFiltrados = todosProdutos.filter((p) => {
    const termoDeBusca = busca.toLowerCase();
    const descricao = p.descricao ? p.descricao.toLowerCase() : "";
    const codigo = p.codigo ? String(p.codigo).toLowerCase() : "";
    const tipo = p.tipo ? p.tipo.toLowerCase() : "";

    return (
      descricao.includes(termoDeBusca) ||
      codigo.includes(termoDeBusca) ||
      tipo.includes(termoDeBusca)
    );
  });

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

  // Função: Prepara o prompt e abre o chat
  const iniciarComparacaoIA = () => {
    const prompt = `
      Faça uma breve comparação técnica dos seguintes produtos, destacando as características e diferenciais mais importantes.

      Produtos para comparação:
      ${produtosSelecionados
        .map((p) => {
          return `
        - Produto: ${p.descricao}
        - Código: ${p.codigo}
        `;
        })
        .join("\n")}
    `;

    setMensagemInicialChat(prompt);
    setChatAberto(true);
  };

  // Lógica do botão Voltar ao Topo
  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="comparador-container">
      <h2>🔎 Comparador de Produtos</h2>

      {/*Barra de pesquisa */}
      <input
        type="text"
        placeholder="Buscar produto por nome, código ou marca..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="comparador-search-input"
      />

      {produtosSelecionados.length > 0 && (
        <>
          <div className="comparador-tabela-comparacao">
            <table border="1">
              <thead>
                <tr>
                  <th>Atributo</th>
                  {produtosSelecionados.map((p) => (
                    <th key={p.codigo}>
                      {p.descricao}
                      <button onClick={() => removerProduto(p.codigo)}>
                        ❌
                      </button>
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
          <div className="comparador-botoes-acao" style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button onClick={limparComparacao}>🧹 Limpar comparação</button>
            <button onClick={iniciarComparacaoIA}>
              ✨ Gerar Comparação Técnica
            </button>
          </div>
        </>
      )}

      {chatAberto && (
        <ChatAssistente
          onClose={() => setChatAberto(false)}
          initialMessage={mensagemInicialChat}
        />
      )}

      {produtosSelecionados.length === 0 && (
        <p>Nenhum produto selecionado para comparação.</p>
      )}

      <div className="comparador-produtos-disponiveis">
        <h3>Selecione até 3 produtos:</h3>
        <div className="comparador-grid-container">
          {produtosFiltrados.length > 0 ? (
            produtosFiltrados.map((p) => (
              <div key={p.codigo} className="comparador-card-produto">
                <h4>{p.descricao}</h4>
                <p>Código: {p.codigo}</p>
                <p>{p.tipo}</p>
                <button onClick={() => adicionarProduto(p)}>➕ Comparar</button>
              </div>
            ))
          ) : (
            <p className="no-products">Nenhum produto encontrado.</p>
          )}
        </div>
      </div>
      
      {showScrollButton && (
        <button className="scroll-to-top" onClick={scrollToTop}>
          ⬆️
        </button>
      )}
    </div>
  );
}