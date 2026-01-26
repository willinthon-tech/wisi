#!/bin/bash
# Script para verificar el archivo server.js en el servidor remoto

echo "Verificando server.js en el servidor..."

# Buscar el problema específico
echo "Buscando 'marcajeMapeado: any'..."
grep -n "marcajeMapeado.*: any" /var/www/wisi.space/server.js

if [ $? -eq 0 ]; then
    echo "❌ ERROR ENCONTRADO: El archivo tiene 'marcajeMapeado: any'"
    echo "Necesitas reemplazar esa línea con 'const marcajeMapeado = {'"
else
    echo "✅ No se encontró 'marcajeMapeado: any'"
fi

# Verificar la línea 7012 (o alrededor)
echo ""
echo "Líneas alrededor de 7012:"
sed -n '7010,7015p' /var/www/wisi.space/server.js

# Verificar la línea 7067 (donde debería estar)
echo ""
echo "Líneas alrededor de 7067:"
sed -n '7065,7070p' /var/www/wisi.space/server.js

