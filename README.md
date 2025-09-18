# 🚀 Catálogo Interativo de Produtos - Supritec 🦅

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

Landing page interativa para consulta de produtos Intelbras e PPA. A aplicação agora conta com um **sistema de login seguro** e um **assistente virtual inteligente** capaz de comparar produtos e analisar interações do usuário.

---

## 🎯 Funcionalidades Principais

-   📦 **Catálogo de Produtos:** Consulta completa de produtos Intelbras e PPA.
-   🔒 **Sistema de Autenticação:** Login seguro para acesso restrito e administração.
-   🤖 **Assistente Virtual Inteligente:** Um assistente integrado que oferece respostas instantâneas, gera comparações automáticas de produtos e mantém um histórico de interações.
-   📊 **Análise de Logs (Backend):** Um script em Python que processa os logs de conversa do assistente virtual, utilizando PLN para extrair insights sobre as dúvidas e necessidades dos usuários.
-   🖥️ **Interface Responsiva:** Design otimizado para uma experiência de usuário consistente em desktops e dispositivos móveis.

---

## 🛠️ Tecnologias Utilizadas

| Frontend      | Backend       | Banco de Dados | Outros                 |
|---------------|---------------|----------------|------------------------|
| React.js      | Node.js       | SQLite         | JSON para catálogo     |
| Vite          | Express.js    |                | Git para versionamento |
| CSS           | Python (PLN)  |                |                        |

---

## 📁 Estrutura do Projeto

- psd-lp/
- ├─ api/
- │ ├─ `logs/` # Diretório para armazenamento de logs
- │ ├─ `analise_logs.py` # Script Python para análise de logs
- │ ├─ `database.db` # Banco de dados SQLite
- │ └─ `...` # Outros arquivos do backend
- ├─ src/
- │ ├─ `App.jsx` # Componente principal
- │ ├─ `AdminLogin.jsx` # Componente da página de login
- │ ├─ `ChatAssistente.jsx` # Popup de chat com assistente
- │ ├─ `Comparador.jsx` # Comparador automático
- │ └─ `styles.css` # Estilos da aplicação
- ├─ `package.json`
- ├─ `vite.config.js` # Arquivo de configuração do Vite
- └─ `README.md`

---

## 👨‍💻 Autor

- Miguel Pereira Gonçalves
- Email: miguelpegasus8@gmail.com