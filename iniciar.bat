@echo off
title UNICRI ERP - Iniciando...
color 0A

echo.
echo  ====================================
echo   UNICRI ERP - Sistema Financeiro
echo  ====================================
echo.

cd /d "%~dp0"

echo [1/3] Instalando dependencias do servidor...
cd server && call npm install --silent
cd ..

echo [2/3] Instalando dependencias do frontend...
cd client && call npm install --silent
cd ..

echo [3/3] Populando banco de dados...
cd server && call node src/db/seed.js
cd ..

echo.
echo  ✓ Pronto! Iniciando sistema...
echo  → Acesse: http://localhost:5173
echo.

start "UNICRI ERP - Backend" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 2 /nobreak >nul
start "UNICRI ERP - Frontend" cmd /k "cd /d %~dp0client && npm run dev"

timeout /t 5 /nobreak >nul
start http://localhost:5173
