const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "analyses.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    filename TEXT,
    role TEXT,
    overall_score INTEGER NOT NULL,
    word_count INTEGER,
    payload TEXT NOT NULL
  );
`);

function saveAnalysis({ filename, role, overall, wordCount, payload }) {
  const stmt = db.prepare(`
    INSERT INTO analyses (created_at, filename, role, overall_score, word_count, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    new Date().toISOString(),
    filename || null,
    role || null,
    overall,
    wordCount,
    JSON.stringify(payload)
  );
  return info.lastInsertRowid;
}

function listAnalyses(limit = 50) {
  return db.prepare(`
    SELECT id, created_at, filename, role, overall_score, word_count
    FROM analyses
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}

function getAnalysis(id) {
  const row = db.prepare(`SELECT * FROM analyses WHERE id = ?`).get(id);
  if (!row) return null;
  return { ...row, payload: JSON.parse(row.payload) };
}

function deleteAnalysis(id) {
  return db.prepare(`DELETE FROM analyses WHERE id = ?`).run(id);
}

module.exports = { saveAnalysis, listAnalyses, getAnalysis, deleteAnalysis };
