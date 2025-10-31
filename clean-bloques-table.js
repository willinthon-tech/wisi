const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database_real.sqlite');

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error(`Error ejecutando query: ${sql}`);
        console.error(`Parámetros:`, params);
        console.error(`Error:`, err.message);
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
        console.error(`Error ejecutando query: ${sql}`);
        console.error(`Parámetros:`, params);
        console.error(`Error:`, err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function cleanBloquesTable() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('=== Limpiando columnas antiguas de la tabla bloques ===\n');
  
  try {
    await runQuery(db, 'BEGIN TRANSACTION');
    
    // 1. Verificar cuántos registros hay
    console.log('1. Verificando registros existentes...');
    const bloquesCount = await getQuery(db, 'SELECT COUNT(*) as count FROM bloques');
    console.log(`   ✓ Encontrados ${bloquesCount[0].count} bloques`);
    
    // 2. Verificar qué columnas tiene actualmente
    console.log('\n2. Columnas actuales:');
    const currentCols = await getQuery(db, "PRAGMA table_info(bloques)");
    console.log('   ', currentCols.map(c => c.name).join(', '));
    
    // 3. Crear nueva tabla solo con las columnas necesarias
    console.log('\n3. Creando nueva tabla bloques_new...');
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
    console.log('   ✓ Tabla bloques_new creada');
    
    // 4. Copiar datos existentes (solo las columnas que se mantienen)
    console.log('\n4. Copiando datos a la nueva tabla...');
    const result = await runQuery(db, `
      INSERT INTO bloques_new (id, horario_id, plantilla_horario_id, orden, created_at, updated_at)
      SELECT id, horario_id, plantilla_horario_id, orden, created_at, updated_at
      FROM bloques
    `);
    console.log(`   ✓ ${result.changes} registros copiados`);
    
    // 5. Eliminar tabla antigua
    console.log('\n5. Eliminando tabla bloques antigua...');
    await runQuery(db, 'DROP TABLE bloques');
    console.log('   ✓ Tabla bloques eliminada');
    
    // 6. Renombrar nueva tabla
    console.log('\n6. Renombrando bloques_new a bloques...');
    await runQuery(db, 'ALTER TABLE bloques_new RENAME TO bloques');
    console.log('   ✓ Tabla renombrada');
    
    // 7. Verificar estructura final
    console.log('\n7. Verificando estructura final:');
    const finalCols = await getQuery(db, "PRAGMA table_info(bloques)");
    console.log('   Columnas:', finalCols.map(c => c.name).join(', '));
    
    const finalCount = await getQuery(db, 'SELECT COUNT(*) as count FROM bloques');
    console.log(`   Registros: ${finalCount[0].count}`);
    
    await runQuery(db, 'COMMIT');
    console.log('\n=== Limpieza completada exitosamente ===');
    console.log('\n✓ Las columnas antiguas han sido eliminadas:');
    console.log('  - hora_entrada');
    console.log('  - hora_salida');
    console.log('  - turno');
    console.log('  - hora_entrada_descanso');
    console.log('  - hora_salida_descanso');
    console.log('  - tiene_descanso');
    console.log('\n✓ La tabla ahora solo tiene:');
    console.log('  - id, horario_id, plantilla_horario_id, orden, created_at, updated_at');
    
  } catch (error) {
    await runQuery(db, 'ROLLBACK');
    console.error('\n❌ Error en la limpieza:', error);
    throw error;
  } finally {
    db.close();
  }
}

cleanBloquesTable()
  .then(() => {
    console.log('\n✓ Proceso terminado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

