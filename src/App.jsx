// App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ChatAssistente from "./ChatAssistente";
import Comparador from "./Comparador";

// Componente CardProduto
const CardProduto = ({ produto, tipo, refsMap }) => {
  const isIntelbras = tipo === "intelbras";
  const descricao = isIntelbras ? produto.descricao : produto.Descrição;
  const codigo = isIntelbras ? produto.codigo : produto.Código;
  const segmento = isIntelbras ? produto.segmento : null;
  const psd = isIntelbras ? produto.psd : produto["Valor Tabela"];
  const pscf = isIntelbras ? produto.pscf : produto["PSCF"] || null;
  const status = isIntelbras ? produto.status : produto.Status || null;

  const encerrado = status === "encerrado";

  const scrollToProduto = (codigo) => {
    const targetRef = refsMap[codigo];
    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      targetRef.current.classList.add("highlight");
      setTimeout(() => targetRef.current.classList.remove("highlight"), 2000);
    }
  };

  const copiarInfo = () => {
    const texto = `
Produto: ${descricao}
Código: ${codigo}
Segmento: ${segmento || "-"}
PSD: ${psd || "-"}
PSCF: ${pscf || "-"}
Status: ${encerrado ? "Encerrado" : "Ativo"}
`;
    navigator.clipboard.writeText(texto);
    alert("Informações copiadas!");
  };

  return (
    <div
      ref={refsMap[codigo]}
      className={`card-produto ${encerrado ? "encerrado" : ""} ${tipo === "ppa" ? "card-ppa" : ""}`}
    >
      <h3 className="card-titulo">{descricao}</h3>
      <p className="card-codigo">Código: {codigo}</p>
      {segmento && <p className="card-segmento">{segmento}</p>}

      {encerrado ? (
        <div>
          <p className="substituto">Produto encerrado.</p>
          {produto.substituto && (
            <p>
              Substituto:{" "}
              <span className="link-substituto" onClick={() => scrollToProduto(produto.substituto)}>
                {produto.substituto}
              </span>
            </p>
          )}
          {produto.indicacao && (
            <p>
              Indicação:{" "}
              <span className="link-substituto" onClick={() => scrollToProduto(produto.indicacao)}>
                {produto.indicacao}
              </span>
            </p>
          )}
        </div>
      ) : (
        <div className="card-precos">
          {psd && <p className="preco-psd">PSD: R$ {psd}</p>}
          {pscf && <p className="preco-pscf">PSCF: R$ {pscf}</p>}
        </div>
      )}

      <button className="btn-copiar" onClick={copiarInfo}>
        Copiar Info
      </button>
    </div>
  );
};

// Página principal Catálogo
function Catalogo() {
  const [produtosIntelbras, setProdutosIntelbras] = useState([]);
  const [produtosPPA, setProdutosPPA] = useState([]);
  const [encerrados, setEncerrados] = useState([]);
  const [busca, setBusca] = useState("");
  const [chatAberto, setChatAberto] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const refsMap = {};

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

  // Carregar produtos encerrados
  useEffect(() => {
    fetch("http://localhost:5000/api/encerrados")
      .then((res) => res.json())
      .then((data) => setEncerrados(data));
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

  // Aplicar status encerrado aos produtos Intelbras
  const produtosIntelbrasComEncerrados = produtosIntelbras.map((p) => {
    const enc = encerrados.find((e) => String(e["Código Produto"]) === String(p.codigo));
    if (enc) {
      return {
        ...p,
        status: "encerrado",
        substituto: enc["Substituto Direto"] !== "-" ? enc["Substituto Direto"] : null,
        indicacao: enc["Indicação"] || null,
      };
    }
    return p;
  });

  const produtosIntelbrasFiltrados = filtrarProdutos(produtosIntelbrasComEncerrados, "intelbras");
  const produtosPPAFiltrados = filtrarProdutos(produtosPPA, "ppa");

  // Criar refs
  produtosIntelbrasComEncerrados.forEach((p) => {
    refsMap[p.codigo] = refsMap[p.codigo] || React.createRef();
  });
  produtosPPA.forEach((p) => {
    refsMap[p.Código] = refsMap[p.Código] || React.createRef();
  });

  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      <header className="app-header">
        <h1>Catálogo de Produtos</h1>
        <input
          type="text"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button className="btn-darkmode" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Modo Claro" : "Modo Escuro"}
        </button>
      </header>

      <main className="app-main">
        <h2>Intelbras</h2>
        <div className="grid-container">
          {produtosIntelbrasFiltrados.length > 0 ? (
            produtosIntelbrasFiltrados.map((p) => (
              <CardProduto key={`intelbras-${p.codigo}`} produto={p} tipo="intelbras" refsMap={refsMap} />
            ))
          ) : (
            <p className="no-products">Nenhum produto Intelbras encontrado.</p>
          )}
        </div>

        <h2>PPA</h2>
        <div className="grid-container">
          {produtosPPAFiltrados.length > 0 ? (
            produtosPPAFiltrados.map((p, index) => (
              <CardProduto key={`ppa-${index}`} produto={p} tipo="ppa" refsMap={refsMap} />
            ))
          ) : (
            <p className="no-products">Nenhum produto PPA encontrado.</p>
          )}
        </div>
      </main>

      <button className="chat-toggle" onClick={() => setChatAberto(!chatAberto)}>
        💬
      </button>

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

// App com rotas
export default function App() {
  return (
    <Router>
      <nav className="app-nav">
        <Link to="/">🏠 Catálogo</Link> | <Link to="/comparador">🔎 Comparador</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/comparador" element={<Comparador />} />
      </Routes>
    </Router>
  );
}
