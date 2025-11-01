const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run(dbPath) {
  console.log(`\n== Migrando ${dbPath} ==`);
  const db = new sqlite3.Database(dbPath);
  const runQuery = (sql) => new Promise((resolve, reject) => db.run(sql, (e) => e ? reject(e) : resolve()));
  const getAll = (sql) => new Promise((resolve, reject) => db.all(sql, (e, rows) => e ? reject(e) : resolve(rows)));
  try {
    await runQuery('BEGIN');
    const rows = await getAll("SELECT name FROM sqlite_master WHERE type='table' AND name='excepciones_horario'");
    if (rows.length === 0) {
      console.log('→ Creando tabla excepciones_horario...');
      await runQuery(`
        CREATE TABLE excepciones_horario (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          empleado_id INTEGER NOT NULL,
          fecha DATE NOT NULL,
          plantilla_horario_id INTEGER NOT NULL,
          motivo TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(empleado_id, fecha)
        );
      `);
      console.log('✓ Tabla creada');
    } else {
      console.log('✓ Tabla excepciones_horario ya existe');
    }
    await runQuery('COMMIT');
  } catch (e) {
    console.error('Error migrando', dbPath, e.message);
    try { await runQuery('ROLLBACK'); } catch {}
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

(async () => {
  await run(path.join(__dirname, 'database.sqlite'));
  await run(path.join(__dirname, 'database_real.sqlite'));
  console.log('\n✓ Migración completada');
})();





