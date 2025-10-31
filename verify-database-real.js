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
  
  console.log('=== Verificando estructura de database_real.sqlite ===\n');
  
  try {
    // Verificar tabla plantillas_horarios
    console.log('1. Tabla plantillas_horarios:');
    const plantillasCols = await getQuery(db, "PRAGMA table_info(plantillas_horarios)");
    console.log('   Columnas:', plantillasCols.map(c => c.name).join(', '));
    
    // Verificar tabla bloques
    console.log('\n2. Tabla bloques:');
    const bloquesCols = await getQuery(db, "PRAGMA table_info(bloques)");
    console.log('   Columnas:', bloquesCols.map(c => c.name).join(', '));
    const hasPlantillaId = bloquesCols.some(c => c.name === 'plantilla_horario_id');
    console.log('   ✓ Tiene plantilla_horario_id:', hasPlantillaId);
    
    // Verificar tabla empleados
    console.log('\n3. Tabla empleados:');
    const empleadosCols = await getQuery(db, "PRAGMA table_info(empleados)");
    console.log('   Columnas:', empleadosCols.map(c => c.name).join(', '));
    const requiredCols = ['nombre', 'cedula', 'foto', 'fecha_ingreso', 'fecha_cumpleanos', 'sexo', 'cargo_id', 'activo'];
    console.log('\n   Verificando columnas requeridas:');
    for (const col of requiredCols) {
      const exists = empleadosCols.some(c => c.name === col);
      console.log(`   ${exists ? '✓' : '✗'} ${col}`);
    }
    
    // Verificar tabla horarios_empleados
    console.log('\n4. Tabla horarios_empleados:');
    const horariosEmpCols = await getQuery(db, "PRAGMA table_info(horarios_empleados)");
    console.log('   Columnas:', horariosEmpCols.map(c => c.name).join(', '));
    const hasPrimerDia = horariosEmpCols.some(c => c.name === 'primer_dia');
    console.log('   ✓ Tiene primer_dia:', hasPrimerDia);
    
    // Contar registros en plantillas_horarios
    console.log('\n5. Registros:');
    const plantillasCount = await getQuery(db, "SELECT COUNT(*) as count FROM plantillas_horarios");
    console.log('   plantillas_horarios:', plantillasCount[0].count);
    const bloquesCount = await getQuery(db, "SELECT COUNT(*) as count FROM bloques");
    console.log('   bloques:', bloquesCount[0].count);
    const empleadosCount = await getQuery(db, "SELECT COUNT(*) as count FROM empleados");
    console.log('   empleados:', empleadosCount[0].count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

verify()
  .then(() => {
    console.log('\n✓ Verificación completada.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


