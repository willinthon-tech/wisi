const fs = require('fs');
const path = require('path');



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
    
  }
}

// 1. Eliminar carpeta dist
if (fs.existsSync(distPath)) {
  
  deleteRecursive(distPath);
  
} else {
  
}

// 2. Eliminar caché de node_modules
if (fs.existsSync(nodeModulesPath)) {
  
  deleteRecursive(nodeModulesPath);
  
} else {
  
}

// 3. Limpiar caché de npm

const { execSync } = require('child_process');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  
} catch (error) {
  
}


