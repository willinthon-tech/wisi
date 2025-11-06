const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Script de migración para producción
 * Este script aplica todos los cambios de base de datos de forma segura
 * sin perder datos existentes.
 * 
 * Cambios incluidos:
 * 1. Agregar/cambiar columna descanso_automatico en plantillas_horarios (INTEGER -> TIME)
 * 2. Crear tabla feriados con restricciones
 */

async function run(dbPath) {
  const db = new sqlite3.Database(dbPath);
  const runQuery = (sql) => new Promise((resolve, reject) => db.run(sql, (e) => e ? reject(e) : resolve()));
  const getAll = (sql) => new Promise((resolve, reject) => db.all(sql, (e, rows) => e ? reject(e) : resolve(rows)));
  
  try {
    await runQuery('BEGIN TRANSACTION');
    console.log(`\n=== Iniciando migración en ${dbPath} ===\n`);
    
    // ============================================
    // 1. MIGRACIÓN: descanso_automatico en plantillas_horarios
    // ============================================
    console.log('1. Verificando tabla plantillas_horarios...');
    const tables = await getAll("SELECT name FROM sqlite_master WHERE type='table' AND name='plantillas_horarios'");
    
    if (tables.length === 0) {
      console.log('   ⚠️  La tabla plantillas_horarios no existe. Saltando migración de descanso_automatico.');
    } else {
      const tableInfo = await getAll("PRAGMA table_info(plantillas_horarios)");
      const columnInfo = tableInfo.find(col => col.name === 'descanso_automatico');
      
      if (!columnInfo) {
        // Columna no existe, agregarla como TIME
        console.log('   ➕ Agregando columna descanso_automatico como TIME...');
        await runQuery(`
          ALTER TABLE plantillas_horarios 
          ADD COLUMN descanso_automatico TIME;
        `);
        console.log('   ✅ Columna descanso_automatico agregada exitosamente.');
      } else if (columnInfo.type.toUpperCase() === 'INTEGER') {
        // Columna existe como INTEGER, cambiarla a TIME
        console.log('   🔄 Cambiando tipo de columna descanso_automatico de INTEGER a TIME...');
        
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE RESTRICT
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
        
        console.log('   ✅ Tipo de columna cambiado exitosamente de INTEGER a TIME.');
      } else if (columnInfo.type.toUpperCase() === 'TIME') {
        console.log('   ✓ La columna descanso_automatico ya es de tipo TIME.');
      } else {
        console.log(`   ⚠️  La columna descanso_automatico tiene tipo ${columnInfo.type}, no se modificó.`);
      }
    }
    
    // ============================================
    // 2. MIGRACIÓN: Crear tabla feriados
    // ============================================
    console.log('\n2. Verificando tabla feriados...');
    const feriadosTables = await getAll("SELECT name FROM sqlite_master WHERE type='table' AND name='feriados'");
    
    if (feriadosTables.length === 0) {
      console.log('   ➕ Creando tabla feriados...');
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
      console.log('   ✅ Tabla feriados creada exitosamente.');
    } else {
      console.log('   ✓ La tabla feriados ya existe.');
      
      // Verificar que tenga todas las columnas necesarias
      const feriadosInfo = await getAll("PRAGMA table_info(feriados)");
      const requiredColumns = ['id', 'nombre', 'sala_id', 'fecha', 'created_at', 'updated_at'];
      const existingColumns = feriadosInfo.map(col => col.name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`   ⚠️  Faltan columnas: ${missingColumns.join(', ')}`);
        // Agregar columnas faltantes si es necesario
        for (const col of missingColumns) {
          if (col === 'created_at' || col === 'updated_at') {
            try {
              await runQuery(`ALTER TABLE feriados ADD COLUMN ${col} DATETIME DEFAULT CURRENT_TIMESTAMP;`);
              console.log(`   ➕ Columna ${col} agregada.`);
            } catch (e) {
              console.log(`   ⚠️  No se pudo agregar ${col}: ${e.message}`);
            }
          }
        }
      } else {
        console.log('   ✓ Todas las columnas requeridas están presentes.');
      }
    }
    
    // ============================================
    // 3. VERIFICAR RESTRICCIONES DE CLAVES FORÁNEAS
    // ============================================
    console.log('\n3. Verificando restricciones de claves foráneas...');
    
    // Verificar foreign key de plantillas_horarios.sala_id
    const fkPlantillas = await getAll(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='plantillas_horarios'
    `);
    if (fkPlantillas.length > 0 && fkPlantillas[0].sql) {
      const hasRestrict = fkPlantillas[0].sql.includes('ON DELETE RESTRICT');
      if (hasRestrict) {
        console.log('   ✓ Restricción ON DELETE RESTRICT presente en plantillas_horarios.sala_id');
      } else {
        console.log('   ⚠️  Restricción ON DELETE RESTRICT no encontrada en plantillas_horarios (puede estar en el modelo)');
      }
    }
    
    // Verificar foreign key de feriados.sala_id
    const fkFeriados = await getAll(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='feriados'
    `);
    if (fkFeriados.length > 0 && fkFeriados[0].sql) {
      const hasRestrict = fkFeriados[0].sql.includes('ON DELETE RESTRICT');
      if (hasRestrict) {
        console.log('   ✓ Restricción ON DELETE RESTRICT presente en feriados.sala_id');
      } else {
        console.log('   ⚠️  Restricción ON DELETE RESTRICT no encontrada en feriados');
      }
    }
    
    await runQuery('COMMIT');
    console.log('\n=== ✅ Migración completada exitosamente ===\n');
    
  } catch (e) {
    console.error(`\n❌ Error en ${dbPath}:`, e);
    try { 
      await runQuery('ROLLBACK'); 
      console.log('   🔄 Transacción revertida.');
    } catch (rollbackError) {
      console.error('   ⚠️  Error al revertir transacción:', rollbackError);
    }
    process.exitCode = 1;
    throw e;
  } finally {
    db.close();
  }
}

// Función principal
(async () => {
  const args = process.argv.slice(2);
  let dbPath;
  
  if (args.length > 0) {
    // Si se proporciona una ruta como argumento, usarla
    dbPath = path.resolve(args[0]);
  } else {
    // Por defecto, usar database.sqlite en el directorio actual
    dbPath = path.join(__dirname, 'database.sqlite');
  }
  
  console.log('🚀 Script de Migración para Producción');
  console.log('=====================================\n');
  console.log(`📁 Base de datos: ${dbPath}\n`);
  
  try {
    await run(dbPath);
    console.log('✨ Proceso finalizado correctamente.');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message);
    process.exit(1);
  }
})();

