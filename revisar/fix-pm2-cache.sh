#!/bin/bash
# Script para forzar la actualización de PM2 y eliminar caché

echo "=== Verificando archivo server.js ==="
echo "Línea 7012:"
sed -n '7012p' /var/www/wisi.space/server.js

echo ""
echo "Línea 7067 (donde debería estar marcajeMapeado):"
sed -n '7067p' /var/www/wisi.space/server.js

echo ""
echo "=== Buscando 'marcajeMapeado: any' ==="
grep -n "marcajeMapeado.*: any" /var/www/wisi.space/server.js
if [ $? -eq 0 ]; then
    echo "❌ ERROR: Todavía existe 'marcajeMapeado: any'"
    exit 1
else
    echo "✅ No se encontró 'marcajeMapeado: any'"
fi

echo ""
echo "=== Verificando qué archivo está usando PM2 ==="
pm2 show server | grep "script path"

echo ""
echo "=== Deteniendo y eliminando proceso PM2 ==="
pm2 stop server
pm2 delete server

echo ""
echo "=== Limpiando caché de Node.js ==="
# Eliminar caché de Node.js si existe
rm -rf /var/www/wisi.space/node_modules/.cache 2>/dev/null
rm -rf ~/.node_modules/.cache 2>/dev/null

echo ""
echo "=== Verificando sintaxis del archivo ==="
node -c /var/www/wisi.space/server.js
if [ $? -eq 0 ]; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis"
    exit 1
fi

echo ""
echo "=== Reiniciando PM2 con el archivo actualizado ==="
cd /var/www/wisi.space
pm2 start server.js --name server

echo ""
echo "=== Esperando 3 segundos y verificando logs ==="
sleep 3
pm2 logs server --lines 20 --nostream

