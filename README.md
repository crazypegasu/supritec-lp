# 📦 Supritec - Catálogo de Produtos com Assistente IA

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)

---

Este projeto é uma **landing page interativa** para auxiliar vendedores da **Supritec** na consulta de produtos Intelbras e PPA.  
Além do catálogo tradicional, o sistema conta com um **assistente de inteligência artificial** que responde dúvidas em tempo real.

---

## 🚀 Funcionalidades
- 🔍 Busca no catálogo local (produtos_intelbras.json e produtos_ppa.json).

- 🤖 Assistente com IA (OpenAI GPT) – responde em 2-3 linhas, direto ao ponto.
- 📡 Fallback inteligente:

 -  1️⃣ Procura no catálogo.
  
 -  2️⃣ Se não achar → consulta WolframAlpha (cálculos e dados técnicos).
  
 -  3️⃣ Se ainda não achar → GPT responde por conta própria.

- 📝 Log automático de dúvidas em chat_logs.json – para treinar vendedores e mapear necessidades.
- 🎨 Dark mode frontend.
- 📋 Botão de copiar informações do produto (código + descrição + preço).

---

## 🛠️ Tecnologias Utilizadas
- **Frontend:** React + Vite  
- **Estilo:** CSS puro (responsivo, dark mode em breve)  
- **Backend:** Node.js + Express  
- **IA:** API OpenAI (GPT-4o-mini)  
- **Gerenciamento de variáveis:** dotenv  

---

## 📂 Estrutura do Projeto

.
- ├── public/ # Arquivos públicos 
- ├── src/
- │ ├── App.jsx # Componente principal
- │ ├── ChatAssistente.jsx # Chat com a IA
- │ ├── style.css # Estilos globais
- │ └── ...
- ├── serverAi.js # Backend com Express
- ├── .env # Variáveis de ambiente 
- └── README.md # Documentação do projeto

---

## ⚙️ Pré-requisitos
- Node.js >=18
- NPM ou Yarn
- Conta na OpenAI para gerar API.
- Conta na WolframAlpha Developer para gerar AppID.

---

## 📊 Logs de dúvidas
- Cada interação gera um registro no arquivo chat_logs.json:

```json
  {
    "pergunta": "Qual a diferença do MHDX 1108 para o 1208?",
    "resposta": "O 1208 suporta até 4MP, o 1108 até 1080p.",
    "origem": "Catálogo",
    "data": "2025-09-07T23:45:12.123Z"
  },

```

- Esses dados ajudam a identificar pontos para treinamento da equipe e produtos mais questionados.

---

## 👨‍💻 Autor

- Miguel Pereira Gonçalves
- Projeto desenvolvido para acelerar e dar inteligência ao dia a dia da equipe de vendas da Supritec.
