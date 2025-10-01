@echo off
echo Reiniciando servidores...

echo.
echo Deteniendo procesos existentes...
taskkill /f /im node.exe 2>nul
taskkill /f /im ng.exe 2>nul

echo.
echo Esperando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo Iniciando servidor backend...
start "Backend Server" cmd /k "cd /d %~dp0 && node server.js"

echo.
echo Esperando 5 segundos para que el backend inicie...
timeout /t 5 /nobreak >nul

echo.
echo Iniciando servidor frontend...
start "Frontend Server" cmd /k "cd /d %~dp0\wisi-frontend && ng serve --open"

echo.
echo Servidores reiniciados. Verifica las ventanas de consola.
pause