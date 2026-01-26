const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run(dbPath) {
  
  const db = new sqlite3.Database(dbPath);
  const runQuery = (sql) => new Promise((resolve, reject) => db.run(sql, (e) => e ? reject(e) : resolve()));
  const getAll = (sql) => new Promise((resolve, reject) => db.all(sql, (e, rows) => e ? reject(e) : resolve(rows)));
  try {
    await runQuery('BEGIN');
    
    // Verificar si la tabla ya existe
    const tables = await getAll("SELECT name FROM sqlite_master WHERE type='table' AND name='feriados'");
    if (tables.length === 0) {
      console.log(`Creando tabla feriados en ${dbPath}...`);
      await runQuery(`
        CREATE TABLE feriados (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          sala_id INTEGER NOT NULL,
          fecha DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE RESTRICT
        );
      `);
      console.log(`Tabla feriados creada exitosamente.`);
    } else {
      console.log(`La tabla feriados ya existe en ${dbPath}.`);
    }
    
    await runQuery('COMMIT');
  } catch (e) {
    console.error(`Error en ${dbPath}:`, e);
    try { await runQuery('ROLLBACK'); } catch {}
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

(async () => {
  await run(path.join(__dirname, 'database.sqlite'));
  console.log('Migración completada.');
})();

