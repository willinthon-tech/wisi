const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database_real.sqlite');

function getQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function verify() {
  const db = new sqlite3.Database(DB_PATH);
  
  
  
  try {
    // Verificar tabla plantillas_horarios
    
    const plantillasCols = await getQuery(db, "PRAGMA table_info(plantillas_horarios)");
    
    
    // Verificar tabla bloques
    
    const bloquesCols = await getQuery(db, "PRAGMA table_info(bloques)");
    
    const hasPlantillaId = bloquesCols.some(c => c.name === 'plantilla_horario_id');
    
    
    // Verificar tabla empleados
    
    const empleadosCols = await getQuery(db, "PRAGMA table_info(empleados)");
    
    const requiredCols = ['nombre', 'cedula', 'foto', 'fecha_ingreso', 'fecha_cumpleanos', 'sexo', 'cargo_id', 'activo'];
    
    for (const col of requiredCols) {
      const exists = empleadosCols.some(c => c.name === col);
      
    }
    
    // Verificar tabla horarios_empleados
    
    const horariosEmpCols = await getQuery(db, "PRAGMA table_info(horarios_empleados)");
    
    const hasPrimerDia = horariosEmpCols.some(c => c.name === 'primer_dia');
    
    
    // Contar registros en plantillas_horarios
    
    const plantillasCount = await getQuery(db, "SELECT COUNT(*) as count FROM plantillas_horarios");
    
    const bloquesCount = await getQuery(db, "SELECT COUNT(*) as count FROM bloques");
    
    const empleadosCount = await getQuery(db, "SELECT COUNT(*) as count FROM empleados");
    
    
  } catch (error) {
    
  } finally {
    db.close();
  }
}

verify()
  .then(() => {
    
    process.exit(0);
  })
  .catch((error) => {
    
    process.exit(1);
  });













