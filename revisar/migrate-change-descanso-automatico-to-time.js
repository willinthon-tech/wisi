const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run(dbPath) {
  
  const db = new sqlite3.Database(dbPath);
  const runQuery = (sql) => new Promise((resolve, reject) => db.run(sql, (e) => e ? reject(e) : resolve()));
  const getAll = (sql) => new Promise((resolve, reject) => db.all(sql, (e, rows) => e ? reject(e) : resolve(rows)));
  try {
    await runQuery('BEGIN');
    
    // Verificar si la tabla existe
    const tables = await getAll("SELECT name FROM sqlite_master WHERE type='table' AND name='plantillas_horarios'");
    if (tables.length === 0) {
      console.log(`La tabla plantillas_horarios no existe en ${dbPath}, saltando...`);
      await runQuery('COMMIT');
      return;
    }
    
    // Verificar si la columna descanso_automatico existe
    const tableInfo = await getAll("PRAGMA table_info(plantillas_horarios)");
    const columnInfo = tableInfo.find(col => col.name === 'descanso_automatico');
    
    if (!columnInfo) {
      console.log(`La columna descanso_automatico no existe en ${dbPath}, agregándola como TIME...`);
      await runQuery(`
        ALTER TABLE plantillas_horarios 
        ADD COLUMN descanso_automatico TIME;
      `);
      console.log(`Columna descanso_automatico agregada como TIME exitosamente.`);
    } else {
      // Verificar el tipo actual
      if (columnInfo.type.toUpperCase() === 'INTEGER') {
        console.log(`Cambiando tipo de columna descanso_automatico de INTEGER a TIME en ${dbPath}...`);
        
        // SQLite no soporta ALTER COLUMN directamente, necesitamos recrear la tabla
        // 1. Crear nueva tabla con el tipo correcto
        await runQuery(`
          CREATE TABLE plantillas_horarios_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            sala_id INTEGER NOT NULL,
            codigo TEXT NOT NULL,
            hora_entrada TIME,
            hora_salida TIME,
            hora_descanso_entrada TIME,
            hora_descanso_salida TIME,
            descanso_automatico TIME,
            color TEXT DEFAULT '#ffffff',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // 2. Copiar datos (convertir INTEGER a TIME si es necesario)
        await runQuery(`
          INSERT INTO plantillas_horarios_new 
          SELECT 
            id,
            nombre,
            sala_id,
            codigo,
            hora_entrada,
            hora_salida,
            hora_descanso_entrada,
            hora_descanso_salida,
            CASE 
              WHEN descanso_automatico IS NULL THEN NULL
              WHEN descanso_automatico < 60 THEN printf('%02d:%02d', 0, descanso_automatico)
              ELSE printf('%02d:%02d', descanso_automatico / 60, descanso_automatico % 60)
            END as descanso_automatico,
            color,
            created_at,
            updated_at
          FROM plantillas_horarios;
        `);
        
        // 3. Eliminar tabla antigua
        await runQuery(`DROP TABLE plantillas_horarios;`);
        
        // 4. Renombrar nueva tabla
        await runQuery(`ALTER TABLE plantillas_horarios_new RENAME TO plantillas_horarios;`);
        
        console.log(`Tipo de columna cambiado exitosamente.`);
      } else if (columnInfo.type.toUpperCase() === 'TIME') {
        console.log(`La columna descanso_automatico ya es de tipo TIME en ${dbPath}.`);
      } else {
        console.log(`La columna descanso_automatico tiene tipo ${columnInfo.type} en ${dbPath}, no se modificó.`);
      }
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

