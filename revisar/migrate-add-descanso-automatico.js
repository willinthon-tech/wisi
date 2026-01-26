const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run(dbPath) {
  
  const db = new sqlite3.Database(dbPath);
  const runQuery = (sql) => new Promise((resolve, reject) => db.run(sql, (e) => e ? reject(e) : resolve()));
  const getAll = (sql) => new Promise((resolve, reject) => db.all(sql, (e, rows) => e ? reject(e) : resolve(rows)));
  try {
    await runQuery('BEGIN');
    
    // Verificar si la columna descanso_automatico ya existe
    const tableInfo = await getAll("PRAGMA table_info(plantillas_horarios)");
    const hasColumn = tableInfo.some(col => col.name === 'descanso_automatico');
    
    if (!hasColumn) {
      console.log(`Agregando columna descanso_automatico a plantillas_horarios en ${dbPath}...`);
      await runQuery(`
        ALTER TABLE plantillas_horarios 
        ADD COLUMN descanso_automatico INTEGER;
      `);
      console.log(`Columna descanso_automatico agregada exitosamente.`);
    } else {
      console.log(`La columna descanso_automatico ya existe en ${dbPath}.`);
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
  await run(path.join(__dirname, 'database_real.sqlite'));
  console.log('Migración completada.');
})();

