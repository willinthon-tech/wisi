@echo off
title Sistema WISI - Backend y Frontend

echo.
echo ========================================
echo    🚀 SISTEMA WISI - INICIANDO
echo ========================================
echo.

echo 🧹 Limpiando procesos anteriores...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo 🔧 Iniciando Backend (Express + SQLite)...
start "Backend WISI" cmd /k "cd /d C:\Users\PC\wisi-system && nodemon server.js"

echo ⏳ Esperando que el backend inicie...
timeout /t 5 >nul

echo.
echo 🎨 Iniciando Frontend (Angular)...
start "Frontend WISI" cmd /k "cd /d C:\Users\PC\wisi-system\wisi-frontend && ng serve --port 4200"

echo ⏳ Esperando que el frontend inicie...
timeout /t 8 >nul

echo.
echo ========================================
echo    ✅ SISTEMA WISI INICIADO
echo ========================================
echo.
echo 📊 Backend:  http://localhost:3000
echo 🎨 Frontend: http://localhost:4200
echo.
echo 🔑 Credenciales:
echo    Usuario: willinthon
echo    Contraseña: 12345678
echo.
echo 💡 Para detener los servicios, cierra las ventanas de cmd
echo.
pause












