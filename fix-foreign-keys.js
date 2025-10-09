const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔧 Reparando foreign keys en tabla dispositivos...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error abriendo base de datos:', err);
    return;
  }
  console.log('✅ Base de datos abierta correctamente');
});

// Habilitar foreign keys
db.run("PRAGMA foreign_keys = ON;", (err) => {
  if (err) {
    console.error('❌ Error habilitando foreign keys:', err);
    return;
  }
  console.log('✅ Foreign keys habilitadas');
});

// Verificar si ya existen foreign keys
db.all("PRAGMA foreign_key_list(dispositivos);", (err, rows) => {
  if (err) {
    console.error('❌ Error verificando foreign keys:', err);
    return;
  }
  
  if (rows.length > 0) {
    console.log('✅ Foreign keys ya existen en tabla dispositivos');
    console.log('Foreign keys encontradas:', rows);
    db.close();
    return;
  }
  
  console.log('⚠️ No hay foreign keys en tabla dispositivos');
  console.log('🔧 Las foreign keys se crearán automáticamente cuando Sequelize sincronice');
  
  db.close();
});

console.log('📋 Verificación completada');
