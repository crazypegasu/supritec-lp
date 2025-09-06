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
- 🔍 **Busca por produtos** (Intelbras e PPA) por código, descrição ou segmento.  
- 💬 **Assistente IA** integrado para dúvidas rápidas.  
- 🛑 Destaque para **produtos encerrados** e sugestão de substitutos.  
- 📋 **Cards organizados** com código, descrição, preço e status.  
- ⚡ **Design responsivo** com popup de chat flutuante.  

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
├── public/ # Arquivos públicos (imagens, JSON de produtos)
├── src/
│ ├── App.jsx # Componente principal
│ ├── ChatAssistente.jsx # Chat com a IA
│ ├── style.css # Estilos globais
│ └── ...
├── serverAi.js # Backend com Express
├── .env # Variáveis de ambiente (não versionado)
└── README.md # Documentação do projeto


