#!/bin/bash
# Script para diagnosticar el problema de PM2

echo "=========================================="
echo "DIAGNÓSTICO COMPLETO"
echo "=========================================="

echo ""
echo "1. Verificando línea 7012 directamente del archivo:"
sed -n '7012p' /var/www/wisi.space/server.js
echo ""

echo "2. Verificando líneas 7010-7015:"
sed -n '7010,7015p' /var/www/wisi.space/server.js
echo ""

echo "3. Buscando TODAS las instancias de 'marcajeMapeado':"
grep -n "marcajeMapeado" /var/www/wisi.space/server.js
echo ""

echo "4. Verificando si hay archivos duplicados:"
find /var/www/wisi.space -name "server.js*" -type f
echo ""

echo "5. Verificando el hash del archivo (para detectar cambios):"
md5sum /var/www/wisi.space/server.js
echo ""

echo "6. Leyendo directamente las líneas alrededor de 7012 (50 líneas antes y después):"
sed -n '6962,7062p' /var/www/wisi.space/server.js | grep -A 5 -B 5 "marcajeMapeado"
echo ""

echo "7. Verificando si hay caracteres especiales o problemas de encoding:"
file /var/www/wisi.space/server.js
echo ""

echo "8. Contando líneas totales del archivo:"
wc -l /var/www/wisi.space/server.js
echo ""

echo "9. Verificando la línea 7067 (donde debería estar marcajeMapeado):"
sed -n '7065,7070p' /var/www/wisi.space/server.js
echo ""

echo "10. Buscando 'const marcajeMapeado: any' específicamente:"
grep -n "const marcajeMapeado: any" /var/www/wisi.space/server.js
if [ $? -eq 0 ]; then
    echo "❌ ENCONTRADO: El archivo SÍ tiene el error"
else
    echo "✅ NO encontrado: El archivo está correcto"
fi

