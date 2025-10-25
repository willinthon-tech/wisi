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
start "Backend WISI" cmd /k "cd /d C:\wisi && nodemon server.js"

echo ⏳ Esperando que el backend inicie...
timeout /t 5 >nul

echo.
echo 🎨 Iniciando Frontend (Angular)...
start "Frontend WISI" cmd /k "cd /d C:\wisi\wisi-frontend && ng serve --port 4200"

echo ⏳ Esperando que el frontend inicie...
timeout /t 8 >nul

echo ========================================
echo    ✅ SISTEMA WISI INICIADO
echo ========================================
pause













