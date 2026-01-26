#!/bin/bash
# Script para probar el archivo directamente con Node.js

echo "=========================================="
echo "PROBANDO ARCHIVO DIRECTAMENTE CON NODE.JS"
echo "=========================================="

cd /var/www/wisi.space

echo ""
echo "1. Verificando sintaxis con node -c:"
node -c server.js
if [ $? -eq 0 ]; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis"
    exit 1
fi

echo ""
echo "2. Intentando cargar el archivo (esto tomará unos segundos y puede fallar si hay dependencias faltantes):"
timeout 10 node -e "
try {
    console.log('Intentando cargar server.js...');
    // Solo cargar las primeras líneas para verificar sintaxis
    const fs = require('fs');
    const content = fs.readFileSync('./server.js', 'utf8');
    const lines = content.split('\n');
    console.log('Total líneas:', lines.length);
    console.log('Línea 7012:', lines[7011]); // índice 0-based
    console.log('Línea 7067:', lines[7066]); // índice 0-based
    
    // Buscar el problema
    const problematicLine = lines.findIndex((line, idx) => 
        line.includes('marcajeMapeado: any') && idx > 7000 && idx < 7100
    );
    if (problematicLine !== -1) {
        console.log('❌ PROBLEMA ENCONTRADO en línea', problematicLine + 1);
        console.log('Contenido:', lines[problematicLine]);
    } else {
        console.log('✅ No se encontró marcajeMapeado: any en las líneas 7000-7100');
    }
} catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('7012')) {
        console.error('❌ El error está en la línea 7012');
    }
}
" 2>&1

echo ""
echo "3. Verificando si PM2 tiene el archivo en caché:"
pm2 describe server 2>/dev/null | grep -E "script path|exec cwd|pid" || echo "PM2 no está corriendo"

echo ""
echo "4. Forzando eliminación completa de PM2 y reinicio:"
echo "   (Esto eliminará TODOS los procesos de PM2)"
read -p "¿Continuar? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 kill
    sleep 2
    rm -rf /root/.pm2
    sleep 1
    pm2 start server.js --name server
    sleep 3
    pm2 logs server --lines 20 --nostream
else
    echo "Saltado. Ejecuta manualmente: pm2 kill && rm -rf /root/.pm2 && pm2 start server.js --name server"
fi

