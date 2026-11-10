// ============================================
// Base de datos propia (SQLite, incluida en Node.js)
// ============================================
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'mensajes.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS mensajes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    creado        TEXT    NOT NULL DEFAULT (datetime('now')),
    nombre        TEXT    NOT NULL,
    email         TEXT    NOT NULL,
    telefono      TEXT,
    empresa       TEXT,
    servicio      TEXT    NOT NULL,
    mensaje       TEXT    NOT NULL,
    ip            TEXT,
    user_agent    TEXT,
    estado_correo TEXT    NOT NULL DEFAULT 'pendiente', -- pendiente | enviado | error | sin_configurar
    intentos      INTEGER NOT NULL DEFAULT 0,
    ultimo_error  TEXT,
    enviado_en    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_mensajes_estado ON mensajes (estado_correo);
`);

const insertar = db.prepare(`
  INSERT INTO mensajes (nombre, email, telefono, empresa, servicio, mensaje, ip, user_agent)
  VALUES (:nombre, :email, :telefono, :empresa, :servicio, :mensaje, :ip, :user_agent)
`);
const marcarEnviado = db.prepare(`
  UPDATE mensajes SET estado_correo = 'enviado', intentos = intentos + 1,
         ultimo_error = NULL, enviado_en = datetime('now') WHERE id = ?
`);
const marcarError = db.prepare(`
  UPDATE mensajes SET estado_correo = ?, intentos = intentos + 1, ultimo_error = ? WHERE id = ?
`);
const pendientes = db.prepare(`
  SELECT * FROM mensajes
  WHERE estado_correo IN ('pendiente', 'error', 'sin_configurar') AND intentos < ?
  ORDER BY id LIMIT 20
`);
const obtener = db.prepare('SELECT * FROM mensajes WHERE id = ?');
const todos = db.prepare('SELECT * FROM mensajes ORDER BY id');

module.exports = {
  db,
  guardar: (m) => Number(insertar.run(m).lastInsertRowid),
  obtener: (id) => obtener.get(id),
  marcarEnviado: (id) => marcarEnviado.run(id),
  marcarError: (id, estado, error) => marcarError.run(estado, String(error).slice(0, 500), id),
  pendientes: (maxIntentos) => pendientes.all(maxIntentos),
  todos: () => todos.all(),
};
