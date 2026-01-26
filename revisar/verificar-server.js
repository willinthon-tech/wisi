// Script para verificar que el archivo server.js no tenga errores de sintaxis TypeScript
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

console.log('Verificando server.js...');

try {
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Buscar patrones problemáticos
  const problematicPatterns = [
    /const\s+\w+\s*:\s*any\s*=/g,
    /const\s+\w+\s*:\s*string\s*=/g,
    /const\s+\w+\s*:\s*number\s*=/g,
    /const\s+\w+\s*:\s*boolean\s*=/g,
    /const\s+\w+\s*:\s*\{/g
  ];
  
  let foundIssues = false;
  
  problematicPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      foundIssues = true;
      console.log(`\n❌ PROBLEMA ENCONTRADO (patrón ${index + 1}):`);
      matches.forEach(match => {
        const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
        console.log(`  Línea ~${lineNumber}: ${match}`);
      });
    }
  });
  
  // Buscar específicamente marcajeMapeado
  const marcajeMapeadoMatches = content.match(/const\s+marcajeMapeado[^=]*=/g);
  if (marcajeMapeadoMatches) {
    console.log('\n📋 Instancias de marcajeMapeado encontradas:');
    marcajeMapeadoMatches.forEach(match => {
      const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
      console.log(`  Línea ~${lineNumber}: ${match.trim()}`);
      
      if (match.includes(': any')) {
        console.log(`    ❌ ERROR: Contiene ': any' (sintaxis TypeScript no válida en JavaScript)`);
        foundIssues = true;
      } else {
        console.log(`    ✅ Correcto`);
      }
    });
  }
  
  if (!foundIssues) {
    console.log('\n✅ No se encontraron problemas de sintaxis TypeScript en server.js');
    console.log('✅ El archivo está listo para producción');
  } else {
    console.log('\n❌ Se encontraron problemas. Por favor, corrígelos antes de subir al servidor.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('Error al leer el archivo:', error.message);
  process.exit(1);
}

