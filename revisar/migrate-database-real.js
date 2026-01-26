 const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database_real.sqlite');

// Función helper para ejecutar queries
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

// Función helper para obtener resultados
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

// Función para verificar si una tabla existe
async function tableExists(db, tableName) {
  const result = await getQuery(db, 
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?", 
    [tableName]
  );
  return result.length > 0;
}

// Función para verificar si una columna existe en una tabla
async function columnExists(db, tableName, columnName) {
  const result = await getQuery(db, `PRAGMA table_info(${tableName})`);
  return result.some(col => col.name === columnName);
}

async function migrate() {
  const db = new sqlite3.Database(DB_PATH);
  
  
  
  try {
    await runQuery(db, 'BEGIN TRANSACTION');
    
    // 1. Crear tabla plantillas_horarios si no existe
    
    const plantillasExists = await tableExists(db, 'plantillas_horarios');
    
    if (!plantillasExists) {
      
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS plantillas_horarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          sala_id INTEGER NOT NULL,
          codigo TEXT NOT NULL,
          hora_entrada TIME,
          hora_salida TIME,
          hora_descanso_entrada TIME,
          hora_descanso_salida TIME,
          color TEXT DEFAULT '#ffffff',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(sala_id) REFERENCES salas(id) ON DELETE RESTRICT
        )
      `);
      
    } else {
      
      
      // Verificar columnas faltantes
      const columnsToCheck = [
        { name: 'hora_entrada', sql: 'ALTER TABLE plantillas_horarios ADD COLUMN hora_entrada TIME' },
        { name: 'hora_salida', sql: 'ALTER TABLE plantillas_horarios ADD COLUMN hora_salida TIME' },
        { name: 'hora_descanso_entrada', sql: 'ALTER TABLE plantillas_horarios ADD COLUMN hora_descanso_entrada TIME' },
        { name: 'hora_descanso_salida', sql: 'ALTER TABLE plantillas_horarios ADD COLUMN hora_descanso_salida TIME' },
        { name: 'color', sql: "ALTER TABLE plantillas_horarios ADD COLUMN color TEXT DEFAULT '#ffffff'" }
      ];
      
      for (const col of columnsToCheck) {
        const exists = await columnExists(db, 'plantillas_horarios', col.name);
        if (!exists) {
          
          await runQuery(db, col.sql);
          
        }
      }
    }
    
    // 2. Verificar y actualizar tabla bloques
    
    const bloquesExists = await tableExists(db, 'bloques');
    
    if (bloquesExists) {
      // Verificar si existe la columna plantilla_horario_id
      const plantillaIdExists = await columnExists(db, 'bloques', 'plantilla_horario_id');
      
      if (!plantillaIdExists) {
        
        // Primero agregar la columna como nullable
        await runQuery(db, 'ALTER TABLE bloques ADD COLUMN plantilla_horario_id INTEGER');
        
        
        // Verificar si hay datos en bloques y si necesitamos hacer una migración
        const bloquesCount = await getQuery(db, 'SELECT COUNT(*) as count FROM bloques');
        if (bloquesCount[0].count > 0) {
          
          
        }
      } else {
        
      }
      
      // Verificar restricción de foreign key (SQLite no soporta ADD CONSTRAINT directamente)
      // Solo podemos verificar si la restricción existe revisando el schema
      const schema = await getQuery(db, "SELECT sql FROM sqlite_master WHERE type='table' AND name='bloques'");
      if (schema.length > 0 && !schema[0].sql.includes('FOREIGN KEY(plantilla_horario_id)')) {
        
        
      }
    } else {
      
      await runQuery(db, `
        CREATE TABLE IF NOT EXISTS bloques (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          horario_id INTEGER NOT NULL,
          plantilla_horario_id INTEGER NOT NULL,
          orden INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(horario_id) REFERENCES horarios(id) ON DELETE RESTRICT,
          FOREIGN KEY(plantilla_horario_id) REFERENCES plantillas_horarios(id) ON DELETE RESTRICT
        )
      `);
      
    }
    
    // 3. Verificar otras tablas de RRHH
    
    
    const rrhhTables = [
      {
        name: 'areas',
        sql: `
          CREATE TABLE IF NOT EXISTS areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            departamento_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(departamento_id) REFERENCES departamentos(id) ON DELETE RESTRICT
          )
        `
      },
      {
        name: 'departamentos',
        sql: `
          CREATE TABLE IF NOT EXISTS departamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            sala_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(sala_id) REFERENCES salas(id) ON DELETE RESTRICT
          )
        `
      },
      {
        name: 'cargos',
        sql: `
          CREATE TABLE IF NOT EXISTS cargos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            area_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(area_id) REFERENCES areas(id) ON DELETE RESTRICT
          )
        `
      },
      {
        name: 'empleados',
        sql: `
          CREATE TABLE IF NOT EXISTS empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            cedula TEXT NOT NULL UNIQUE,
            foto TEXT,
            fecha_ingreso DATE NOT NULL,
            fecha_cumpleanos DATE NOT NULL,
            sexo TEXT NOT NULL CHECK(sexo IN ('Masculino', 'Femenino')),
            cargo_id INTEGER NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(cargo_id) REFERENCES cargos(id) ON DELETE RESTRICT
          )
        `
      },
      {
        name: 'horarios',
        sql: `
          CREATE TABLE IF NOT EXISTS horarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            sala_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(sala_id) REFERENCES salas(id) ON DELETE RESTRICT
          )
        `
      },
      {
        name: 'horarios_empleados',
        sql: `
          CREATE TABLE IF NOT EXISTS horarios_empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            horario_id INTEGER NOT NULL,
            primer_dia TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(empleado_id) REFERENCES empleados(id) ON DELETE RESTRICT,
            FOREIGN KEY(horario_id) REFERENCES horarios(id) ON DELETE RESTRICT
          )
        `
      }
    ];
    
    for (const table of rrhhTables) {
      const exists = await tableExists(db, table.name);
      if (!exists) {
        
        await runQuery(db, table.sql);
        
      } else {
        
        
        // Verificar y agregar columnas faltantes en tablas existentes
        if (table.name === 'empleados') {
          const empleadosColumns = [
            { name: 'nombre', sql: 'ALTER TABLE empleados ADD COLUMN nombre TEXT' },
            { name: 'fecha_ingreso', sql: 'ALTER TABLE empleados ADD COLUMN fecha_ingreso DATE' },
            { name: 'fecha_cumpleanos', sql: 'ALTER TABLE empleados ADD COLUMN fecha_cumpleanos DATE' },
            { name: 'activo', sql: 'ALTER TABLE empleados ADD COLUMN activo INTEGER DEFAULT 1' }
          ];
          
          for (const col of empleadosColumns) {
            const colExists = await columnExists(db, 'empleados', col.name);
            if (!colExists) {
              
              try {
                await runQuery(db, col.sql);
                
              } catch (err) {
                
              }
            }
          }
        } else if (table.name === 'horarios_empleados') {
          const horariosEmpColumns = [
            { name: 'primer_dia', sql: 'ALTER TABLE horarios_empleados ADD COLUMN primer_dia TEXT' }
          ];
          
          for (const col of horariosEmpColumns) {
            const colExists = await columnExists(db, 'horarios_empleados', col.name);
            if (!colExists) {
              
              try {
                await runQuery(db, col.sql);
                
              } catch (err) {
                
              }
            }
          }
        }
      }
    }
    
    await runQuery(db, 'COMMIT');
    
    
    
    
    
    
    
  } catch (error) {
    await runQuery(db, 'ROLLBACK');
    
    throw error;
  } finally {
    db.close();
  }
}

// Ejecutar migración
migrate()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });

