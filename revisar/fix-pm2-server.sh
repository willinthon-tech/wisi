#!/bin/bash
# Script para corregir el problema de PM2 con caché

echo "=========================================="
echo "PASO 1: Verificando archivo en servidor"
echo "=========================================="

# Verificar línea 7012 específicamente
echo "Línea 7012 del archivo:"
sed -n '7012p' /var/www/wisi.space/server.js

echo ""
echo "Buscando 'marcajeMapeado: any':"
if grep -n "marcajeMapeado.*: any" /var/www/wisi.space/server.js; then
    echo "❌ ERROR: El archivo en el servidor todavía tiene el error"
    echo "Necesitas subir el archivo correcto primero"
    exit 1
else
    echo "✅ El archivo en el servidor está correcto"
fi

echo ""
echo "=========================================="
echo "PASO 2: Verificando qué archivo usa PM2"
echo "=========================================="
pm2 show server | grep -E "script path|exec cwd"

echo ""
echo "=========================================="
echo "PASO 3: Deteniendo completamente PM2"
echo "=========================================="
pm2 stop all
pm2 delete all

echo ""
echo "=========================================="
echo "PASO 4: Limpiando caché"
echo "=========================================="
# Limpiar caché de Node.js
find /var/www/wisi.space -name ".cache" -type d -exec rm -rf {} + 2>/dev/null
rm -rf /tmp/node-* 2>/dev/null

echo ""
echo "=========================================="
echo "PASO 5: Verificando sintaxis del archivo"
echo "=========================================="
cd /var/www/wisi.space
if node -c server.js; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error de sintaxis - revisa el archivo"
    exit 1
fi

echo ""
echo "=========================================="
echo "PASO 6: Reiniciando PM2"
echo "=========================================="
pm2 start server.js --name server
pm2 save

echo ""
echo "=========================================="
echo "PASO 7: Esperando y verificando logs"
echo "=========================================="
sleep 5
echo "Últimas 30 líneas de logs:"
pm2 logs server --lines 30 --nostream

echo ""
echo "=========================================="
echo "Verificando estado de PM2:"
echo "=========================================="
pm2 status

