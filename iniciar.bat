@echo off
chcp 65001 >nul
set RAIZ=%~dp0
if not exist "%RAIZ%backend\node_modules" (
  echo Faltan dependencias. Ejecuta primero instalar.bat
  pause
  exit /b 1
)
if not exist "%RAIZ%backend\.env" (
  echo Falta backend\.env. Ejecuta instalar.bat o copia .env.example a .env
  pause
  exit /b 1
)
start "Inventario PYME - Backend" cmd /k "cd /d "%RAIZ%backend" && npm run dev"
start "Inventario PYME - Frontend" cmd /k "cd /d "%RAIZ%frontend" && npm start"
echo Se abrieron dos ventanas (backend y frontend).
echo Cuando el frontend termine de compilar, abre http://localhost:4200
timeout /t 6 >nul
