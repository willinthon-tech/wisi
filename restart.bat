@echo off
echo Reiniciando servidores...

echo Deteniendo procesos...
taskkill /f /im node.exe 2>nul

echo Esperando...
timeout /t 3 /nobreak >nul

echo Iniciando backend...
start "Backend" cmd /k "cd wisi-system && npm start"

timeout /t 5 /nobreak >nul

echo Iniciando frontend...
start "Frontend" cmd /k "cd wisi-frontend && npm start"

echo Listo!

