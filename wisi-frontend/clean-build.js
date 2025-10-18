const fs = require('fs');
const path = require('path');

console.log('🧹 Limpiando carpeta de build...');

const distPath = path.join(__dirname, 'dist');

// Función para eliminar recursivamente
function deleteRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        deleteRecursive(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
    
    fs.rmdirSync(dirPath);
    console.log(`✅ Eliminada carpeta: ${dirPath}`);
  }
}

// Eliminar completamente la carpeta dist
if (fs.existsSync(distPath)) {
  console.log('🗑️  Eliminando carpeta dist existente...');
  deleteRecursive(distPath);
  console.log('✅ Carpeta dist eliminada completamente');
} else {
  console.log('ℹ️  No existe carpeta dist, continuando...');
}

console.log('🎯 Listo para build limpio!');
