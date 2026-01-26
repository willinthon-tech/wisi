#!/bin/bash

# Script para descargar imágenes de attlogs
# Se ejecuta cada 5 minutos

cd /var/www/wisi.space

# Obtener token de autenticación
TOKEN=$(curl -s -X POST https://wisi.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"willinthon","password":"12345678"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "$(date): Error obteniendo token de autenticación"
  exit 1
fi

# Obtener lista de dispositivos
DEVICES=$(curl -s -H "Authorization: Bearer $TOKEN" https://wisi.space/api/dispositivos)

if [ -z "$DEVICES" ]; then
  echo "$(date): Error obteniendo dispositivos"
  exit 1
fi

echo "$(date): Iniciando descarga de imágenes..."

# Ejecutar descarga de imágenes (esto debería estar en el servidor)
# Por ahora, solo log
echo "$(date): CRON ejecutado - Token obtenido correctamente"

exit 0
