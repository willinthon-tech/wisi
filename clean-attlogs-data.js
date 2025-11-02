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
    
    
    // 1. Contar registros antes de eliminar
    const [countResult] = await sequelize.query("SELECT COUNT(*) as total FROM attlogs;");
    const totalRecords = countResult[0].total;
    
    
    // 2. Eliminar directorio de fotos si existe
    
    const attlogsDir = path.join(__dirname, 'attlogs');
    
    if (fs.existsSync(attlogsDir)) {
      try {
        // Eliminar todo el directorio y su contenido
        fs.rmSync(attlogsDir, { recursive: true, force: true });
        
      } catch (error) {
        
      }
    } else {
      
    }
    
    // 3. Eliminar todos los registros de attlogs
    
    const [deleteResult] = await sequelize.query("DELETE FROM attlogs;");
    
    
    // 4. Verificar que la tabla esté vacía
    const [verifyResult] = await sequelize.query("SELECT COUNT(*) as total FROM attlogs;");
    const remainingRecords = verifyResult[0].total;
    
    
    // 5. Opcional: Resetear el autoincrement
    
    await sequelize.query("DELETE FROM sqlite_sequence WHERE name='attlogs';");
    
    
    // 6. Verificar espacio en disco liberado
    const stats = fs.statSync(path.join(__dirname, 'database.sqlite'));
    const dbSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    
    
    
    
  } catch (error) {
    
    
  } finally {
    await sequelize.close();
  }
}

// Función para confirmar antes de ejecutar
async function confirmAndClean() {
  
  
  
  
  // En un entorno real, aquí podrías usar readline para confirmar
  // Por ahora, ejecutamos directamente
  
  await cleanAttlogsData();
}

// Ejecutar el script
confirmAndClean();
