import React, { useEffect, useState } from "react";
import ChatAssistente from "./ChatAssistente"; // importa o componente do chat

// Componente CardProduto
const CardProduto = ({ produto, tipo }) => {
  const isIntelbras = tipo === "intelbras";
  const isPPA = tipo === "ppa";

  // Intelbras
  const descricao = isIntelbras ? produto.descricao : produto.Descrição;
  const codigo = isIntelbras ? produto.codigo : produto.Código;
  const segmento = isIntelbras ? produto.segmento : null;
  const psd = isIntelbras ? produto.psd : isPPA ? produto["Valor Tabela"] : null;
  const pscf = isIntelbras ? produto.pscf : null;
  const status = isIntelbras ? produto.status : null;

  const encerrado = isIntelbras && status === "encerrado";

  return (
    <div className={`card-produto ${encerrado ? "card-encerrado" : ""} ${isPPA ? "card-ppa" : ""}`}>
      <h3 className={`card-titulo ${encerrado ? "titulo-encerrado" : ""}`}>{descricao}</h3>
      <p className="card-codigo">Código: {codigo}</p>
      {segmento && <p className="card-segmento">{segmento}</p>}

      {isIntelbras ? (
        encerrado ? (
          <p className="substituto">Produto encerrado. Consulte catálogo.</p>
        ) : (
          <div className="card-precos">
            <p className="preco-psd">PSD: R$ {psd}</p>
            <p className="preco-pscf">PSCF: R$ {pscf}</p>
          </div>
        )
      ) : (
        <div className="card-precos">
          <p className="preco-psd">Valor Tabela: {psd}</p>
        </div>
      )}
    </div>
  );
};

// Componente principal
export default function App() {
  const [produtosIntelbras, setProdutosIntelbras] = useState([]);
  const [produtosPPA, setProdutosPPA] = useState([]);
  const [busca, setBusca] = useState("");

  // estado do popup do chat
  const [chatAberto, setChatAberto] = useState(false);

  useEffect(() => {
    fetch("produtos_intelbras.json")
      .then((res) => res.json())
      .then((data) => setProdutosIntelbras(data))
      .catch((err) => console.error("Erro ao carregar Intelbras:", err));
  }, []);

  useEffect(() => {
    fetch("produtos_ppa.json")
      .then((res) => res.json())
      .then((data) => setProdutosPPA(data))
      .catch((err) => console.error("Erro ao carregar PPA:", err));
  }, []);

  // Função de filtro
  const filtrarProdutos = (produtos, tipo) =>
    produtos.filter((p) => {
      if (tipo === "intelbras") {
        return (
          p.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
          String(p.codigo).includes(busca) ||
          p.segmento?.toLowerCase().includes(busca.toLowerCase())
        );
      } else {
        return (
          p.Descrição?.toLowerCase().includes(busca.toLowerCase()) ||
          String(p.Código).includes(busca)
        );
      }
    });

  const produtosIntelbrasFiltrados = filtrarProdutos(produtosIntelbras, "intelbras");
  const produtosPPAFiltrados = filtrarProdutos(produtosPPA, "ppa");

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Catálogo de Produtos</h1>
        <input
          type="text"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </header>

      <main className="app-main">
        <h2>Intelbras</h2>
        <div className="grid-container">
          {produtosIntelbrasFiltrados.length > 0 ? (
            produtosIntelbrasFiltrados.map((p) => (
              <CardProduto key={`intelbras-${p.id}`} produto={p} tipo="intelbras" />
            ))
          ) : (
            <p className="no-products">Nenhum produto Intelbras encontrado.</p>
          )}
        </div>

        <h2>PPA</h2>
        <div className="grid-container">
          {produtosPPAFiltrados.length > 0 ? (
            produtosPPAFiltrados.map((p, index) => (
              <CardProduto key={`ppa-${index}`} produto={p} tipo="ppa" />
            ))
          ) : (
            <p className="no-products">Nenhum produto PPA encontrado.</p>
          )}
        </div>
      </main>

      {/* Botão flutuante para abrir o chat */}
      <button
        className="chat-toggle"
        onClick={() => setChatAberto(!chatAberto)}
      >
        💬
      </button>

      {/* Popup do chat */}
      {chatAberto && (
        <div className="chat-popup">
          <div className="chat-popup-header">
            <h3>Assistente de Produtos 🤖</h3>
            <button onClick={() => setChatAberto(false)}>✖</button>
          </div>
          <ChatAssistente />
        </div>
      )}
    </div>
  );
}
