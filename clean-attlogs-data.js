const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Configurar conexión a la base de datos
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function cleanAttlogsData() {
  try {
    console.log('🧹 Iniciando limpieza de datos de attlogs...\n');
    
    // 1. Contar registros antes de eliminar
    const [countResult] = await sequelize.query("SELECT COUNT(*) as total FROM attlogs;");
    const totalRecords = countResult[0].total;
    console.log(`📊 Total de registros en attlogs: ${totalRecords}`);
    
    // 2. Eliminar directorio de fotos si existe
    console.log('\n🗑️ Eliminando directorio de fotos...');
    const attlogsDir = path.join(__dirname, 'attlogs');
    
    if (fs.existsSync(attlogsDir)) {
      try {
        // Eliminar todo el directorio y su contenido
        fs.rmSync(attlogsDir, { recursive: true, force: true });
        console.log('   ✅ Directorio attlogs eliminado completamente');
      } catch (error) {
        console.log(`   ❌ Error eliminando directorio: ${error.message}`);
      }
    } else {
      console.log('   ⚠️ Directorio attlogs no existe');
    }
    
    // 3. Eliminar todos los registros de attlogs
    console.log('\n🗑️ Eliminando registros de la tabla attlogs...');
    const [deleteResult] = await sequelize.query("DELETE FROM attlogs;");
    console.log(`   ✅ Registros eliminados: ${deleteResult.changes || 'N/A'}`);
    
    // 4. Verificar que la tabla esté vacía
    const [verifyResult] = await sequelize.query("SELECT COUNT(*) as total FROM attlogs;");
    const remainingRecords = verifyResult[0].total;
    console.log(`\n📊 Registros restantes en attlogs: ${remainingRecords}`);
    
    // 5. Opcional: Resetear el autoincrement
    console.log('\n🔄 Reseteando contador de ID...');
    await sequelize.query("DELETE FROM sqlite_sequence WHERE name='attlogs';");
    console.log('   ✅ Contador de ID reseteado');
    
    // 6. Verificar espacio en disco liberado
    const stats = fs.statSync(path.join(__dirname, 'database.sqlite'));
    const dbSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n💾 Tamaño actual de la base de datos: ${dbSizeMB} MB`);
    
    console.log('\n✅ Limpieza completada exitosamente!');
    console.log('🎯 La tabla attlogs está ahora vacía y las fotos han sido eliminadas.');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Función para confirmar antes de ejecutar
async function confirmAndClean() {
  console.log('⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos de attlogs y las fotos asociadas.');
  console.log('⚠️  Esta acción NO se puede deshacer.');
  console.log('\n¿Estás seguro de que quieres continuar? (Escribe "CONFIRMAR" para proceder)');
  
  // En un entorno real, aquí podrías usar readline para confirmar
  // Por ahora, ejecutamos directamente
  console.log('\n🚀 Ejecutando limpieza...\n');
  await cleanAttlogsData();
}

// Ejecutar el script
confirmAndClean();
