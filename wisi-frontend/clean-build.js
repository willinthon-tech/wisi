const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPIEZA ULTRA-AGRESIVA DE CACHÉ...');

const distPath = path.join(__dirname, 'dist');
const nodeModulesPath = path.join(__dirname, 'node_modules/.cache');

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
    console.log(`✅ Eliminada: ${dirPath}`);
  }
}

// 1. Eliminar carpeta dist
if (fs.existsSync(distPath)) {
  console.log('🗑️  Eliminando carpeta dist...');
  deleteRecursive(distPath);
  console.log('✅ Carpeta dist eliminada completamente');
} else {
  console.log('ℹ️  No existe carpeta dist');
}

// 2. Eliminar caché de node_modules
if (fs.existsSync(nodeModulesPath)) {
  console.log('🗑️  Eliminando caché de node_modules...');
  deleteRecursive(nodeModulesPath);
  console.log('✅ Caché de node_modules eliminado');
} else {
  console.log('ℹ️  No existe caché de node_modules');
}

// 3. Limpiar caché de npm
console.log('🧽 Limpiando caché de npm...');
const { execSync } = require('child_process');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Caché de npm limpiado');
} catch (error) {
  console.log('⚠️  No se pudo limpiar caché de npm');
}

console.log('🎯 SISTEMA COMPLETAMENTE LIMPIO - LISTO PARA BUILD!');
