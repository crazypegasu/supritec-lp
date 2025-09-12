// database.cjs
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/users.db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Crie a tabela de usuários se ela não existir
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )`);

  // Insira um usuário de exemplo (a senha será criptografada)
  const stmt = db.prepare("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)");

  bcrypt.hash('12345', SALT_ROUNDS, (err, hash) => {
    if (err) {
      console.error("Erro ao criptografar a senha:", err);
      return;
    }
    // "admin" será inserido apenas se não existir
    stmt.run('admin', hash, function(err) {
      if (err && err.errno !== 19) {
        console.error("Erro ao inserir usuário:", err);
      } else {
        console.log("Usuário 'admin' inserido com sucesso (ou já existia).");
      }
    });
    stmt.finalize();
  });
});

module.exports = db;