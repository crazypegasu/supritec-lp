import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import ChatAssistente from "./ChatAssistente.jsx";
import Comparador from "./Comparador.jsx";
import AdminDashboard from "./adminDashboard.jsx";
import './styles.css';

// ============================
// CardProduto
// ============================
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
    const targetRef = refsMap.current[codigo];
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
      ref={refsMap.current[codigo]}
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

// ============================
// Catalogo
// ============================
function Catalogo() {
  const [produtosIntelbras, setProdutosIntelbras] = useState([]);
  const [produtosPPA, setProdutosPPA] = useState([]);
  const [encerrados, setEncerrados] = useState([]);
  const [busca, setBusca] = useState("");
  const [chatAberto, setChatAberto] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState({ tipo: null, valor: null });
  const [dropdownAberto, setDropdownAberto] = useState(null);

  const refsMap = useRef({});

  const filterOptions = {
    segmento: [
      "Alarmes","Cabos Metalicos","Cabos Opticos","Cameras Plug and Play","Captacao de Imagem",
      "CFTV IP","Comunicacao Corporativa","Comunicacao em Nuvem","Comunicacao HO",
      "Controle de Acesso Condominial","Controle de Acesso Corporativo","Controle de Acesso Residencial",
      "Drones","Energia HO","Fechaduras Digitais","Fontes","Gerenciamento de Imagem",
      "Incendio e Iluminacao","Monitoramento e rastreamento","Nobreaks","Passivos Opticos",
      "Racks","Radiocomunicadores","Redes Empresariais","Redes Opticas","Sensores",
      "Sistemas Automatizados","Solar Off Grid"
    ],
    unidade: ["COMUNICACAO","CONSUMO","CONTROLE DE ACESSOS","ENERGIA","ENERGIA SOLAR","REDES","SEGURANCA ELETRONICA"]
  };

  useEffect(() => {
    fetch("produtos_intelbras_september.json").then(res => res.json()).then(setProdutosIntelbras);
    fetch("produtos_ppa.json").then(res => res.json()).then(setProdutosPPA);
    fetch("http://localhost:5000/api/encerrados").then(res => res.json()).then(setEncerrados);
  }, []);

  const handleClearFilter = () => setFiltroAtivo({ tipo: null, valor: null });

  const filtrarProdutos = (produtos, tipo) => {
    const termoBusca = busca.toLowerCase();
    return produtos.filter((p) => {
      let correspondeBusca = false;
      let correspondeFiltro = true;
      if (tipo === "intelbras") {
        correspondeBusca = p.descricao?.toLowerCase().includes(termoBusca) || String(p.codigo).includes(termoBusca) || p.segmento?.toLowerCase().includes(termoBusca);
        if (filtroAtivo.valor) {
          let valorProduto = filtroAtivo.tipo === "segmento" ? p.segmento || "" : p.unidade || p.Unidade || "";
          correspondeFiltro = valorProduto.toLowerCase() === filtroAtivo.valor.toLowerCase();
        }
      } else {
        correspondeBusca = p.Descrição?.toLowerCase().includes(termoBusca) || String(p.Código).includes(termoBusca);
      }
      return (termoBusca === "" || correspondeBusca) && (!filtroAtivo.valor || correspondeFiltro);
    });
  };

  const produtosIntelbrasComEncerrados = produtosIntelbras.map((p) => {
    const enc = encerrados.find(e => String(e["Código Produto"]) === String(p.codigo));
    if (enc) {
      return {...p, status:"encerrado", substituto: enc["Substituto Direto"] !== "-" ? enc["Substituto Direto"]: null, indicacao: enc["Indicação"] || null};
    }
    return p;
  });

  const produtosIntelbrasFiltrados = filtrarProdutos(produtosIntelbrasComEncerrados,"intelbras");
  const produtosPPAFiltrados = filtrarProdutos(produtosPPA,"ppa");

  produtosIntelbrasComEncerrados.forEach(p => { if(!refsMap.current[p.codigo]) refsMap.current[p.codigo] = React.createRef(); });
  produtosPPA.forEach(p => { if(!refsMap.current[p.Código]) refsMap.current[p.Código] = React.createRef(); });

  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      <header className="app-header">
        <h1>Catálogo de Produtos</h1>
        <div className="search-and-filter-container">
          <input type="text" placeholder="Buscar produto..." value={busca} onChange={(e)=>setBusca(e.target.value)} />
          <div className="filter-dropdown-container">
            <button onClick={()=>setDropdownAberto(dropdownAberto==='segmento'?null:'segmento')} className="filter-button">
              Segmento {dropdownAberto==='segmento'?'▲':'▼'}
            </button>
            <button onClick={()=>setDropdownAberto(dropdownAberto==='unidade'?null:'unidade')} className="filter-button">
              Unidade {dropdownAberto==='unidade'?'▲':'▼'}
            </button>
            {dropdownAberto && (
              <div className="filter-options-dropdown">
                {filterOptions[dropdownAberto].map(option=>(
                  <div key={option} onClick={()=>{setFiltroAtivo({tipo:dropdownAberto, valor:option}); setDropdownAberto(null)}} className="filter-option">{option}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button className="btn-darkmode" onClick={()=>setDarkMode(!darkMode)}>{darkMode?"Modo Claro":"Modo Escuro"}</button>
      </header>

      <main className="app-main">
        {filtroAtivo.valor && (
          <div className="filter-status">
            Filtrando por: <span className="filter-status-value">{filtroAtivo.valor}</span>
            <button onClick={handleClearFilter} className="clear-filter-button">✖ Limpar</button>
          </div>
        )}

        <h2>Intelbras</h2>
        <div className="grid-container">
          {produtosIntelbrasFiltrados.length>0 ? produtosIntelbrasFiltrados.map(p=>(
            <CardProduto key={`intelbras-${p.codigo}`} produto={p} tipo="intelbras" refsMap={refsMap}/>
          )) : <p className="no-products">Nenhum produto Intelbras encontrado.</p>}
        </div>

        <h2>PPA</h2>
        <div className="grid-container">
          {produtosPPAFiltrados.length>0 ? produtosPPAFiltrados.map((p,i)=>(
            <CardProduto key={`ppa-${i}`} produto={p} tipo="ppa" refsMap={refsMap}/>
          )) : <p className="no-products">Nenhum produto PPA encontrado.</p>}
        </div>
      </main>

      <button className="chat-toggle" onClick={()=>setChatAberto(!chatAberto)}>💬</button>
      {chatAberto && (
        <div className="chat-popup">
          <div className="chat-popup-header">
            <h3>Assistente de Produtos 🤖</h3>
            <button onClick={()=>setChatAberto(false)}>✖</button>
          </div>
          <ChatAssistente />
        </div>
      )}
    </div>
  );
}

// ============================
// Login Page
// ============================
function LoginPage({ onLogin }) {
  const [username,setUsername] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try{
      const response = await fetch('http://localhost:5000/api/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({username,password})
      });
      const data = await response.json();
      if(response.ok && data.success){
        onLogin(data);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } catch(err){
      console.error(err);
      setError('Erro de conexão.');
    }
  };

  return (
    <div className="login-page">
      <h2>Login</h2>
      <form onSubmit={handleLogin} className="login-form">
        {error && <p className="login-error">{error}</p>}
        <input type="text" placeholder="Usuário" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <input type="password" placeholder="Senha" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

// ============================
// AppContent
// ============================
function AppContent() {
  const [isLoggedIn,setIsLoggedIn] = useState(false);
  const [isAdmin,setIsAdmin] = useState(false);
  const [username,setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(()=>{
    const storedUsername = localStorage.getItem('username');
    const storedIsAdmin = localStorage.getItem('isAdmin')==='true';
    if(storedUsername){
      setUsername(storedUsername);
      setIsAdmin(storedIsAdmin);
      setIsLoggedIn(true);
    }
  },[]);

  const handleLoginSuccess = (data) => {
    localStorage.setItem('isLoggedIn','true');
    localStorage.setItem('isAdmin', data.isAdmin);
    localStorage.setItem('username', data.username);
    setIsLoggedIn(true);
    setIsAdmin(data.isAdmin);
    setUsername(data.username);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUsername('');
    navigate('/');
  };

  if(!isLoggedIn) return <LoginPage onLogin={handleLoginSuccess} />;

  return (
    <>
      <header className="app-header-main">
        <div className="app-header-content">
          <nav className="app-nav">
            <Link to="/">🏠 Catálogo</Link>
            <Link to="/comparador">🔎 Comparador</Link>
            {isAdmin && <Link to="/admin">⚙️ Admin</Link>}
          </nav>
          <div className="user-info">
            <span className="user-welcome">Olá, <strong>{username}</strong></span>
            <button onClick={handleLogout} className="btn-logout">Sair</button>
          </div>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Catalogo />} />
          <Route path="/comparador" element={<Comparador />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard username={username} isAdmin={isAdmin} onLogout={handleLogout} /> : <div className="acesso-negado">Você não tem permissão de administrador.</div>} />
        </Routes>
      </main>
    </>
  );
}

// ============================
// App principal
// ============================
export default function App(){
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
