const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database_real.sqlite');

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        
        
        
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function getQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        
        
        
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function cleanBloquesTable() {
  const db = new sqlite3.Database(DB_PATH);
  
  
  
  try {
    await runQuery(db, 'BEGIN TRANSACTION');
    
    // 1. Verificar cuántos registros hay
    
    const bloquesCount = await getQuery(db, 'SELECT COUNT(*) as count FROM bloques');
    
    
    // 2. Verificar qué columnas tiene actualmente
    
    const currentCols = await getQuery(db, "PRAGMA table_info(bloques)");
    
    
    // 3. Crear nueva tabla solo con las columnas necesarias
    
    await runQuery(db, `
      CREATE TABLE bloques_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        horario_id INTEGER NOT NULL,
        plantilla_horario_id INTEGER,
        orden INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(horario_id) REFERENCES horarios(id) ON DELETE RESTRICT,
        FOREIGN KEY(plantilla_horario_id) REFERENCES plantillas_horarios(id) ON DELETE RESTRICT
      )
    `);
    
    
    // 4. Copiar datos existentes (solo las columnas que se mantienen)
    
    const result = await runQuery(db, `
      INSERT INTO bloques_new (id, horario_id, plantilla_horario_id, orden, created_at, updated_at)
      SELECT id, horario_id, plantilla_horario_id, orden, created_at, updated_at
      FROM bloques
    `);
    
    
    // 5. Eliminar tabla antigua
    
    await runQuery(db, 'DROP TABLE bloques');
    
    
    // 6. Renombrar nueva tabla
    
    await runQuery(db, 'ALTER TABLE bloques_new RENAME TO bloques');
    
    
    // 7. Verificar estructura final
    
    const finalCols = await getQuery(db, "PRAGMA table_info(bloques)");
    
    
    const finalCount = await getQuery(db, 'SELECT COUNT(*) as count FROM bloques');
    
    
    await runQuery(db, 'COMMIT');
    
    
    
    
    
    
    
    
    
    
    
  } catch (error) {
    await runQuery(db, 'ROLLBACK');
    
    throw error;
  } finally {
    db.close();
  }
}

cleanBloquesTable()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });

