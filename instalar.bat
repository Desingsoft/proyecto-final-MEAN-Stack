@echo off
chcp 65001 >nul
echo ============================================
echo  Inventario PYME - instalacion de dependencias
echo ============================================
echo.
echo [1/2] Backend...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 goto error
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Se creo backend\.env a partir del ejemplo. REVISALO antes de iniciar.
)
echo.
echo [2/2] Frontend...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto error
echo.
echo Listo. Siguientes pasos:
echo   1. Revisa backend\.env (MONGODB_URI y JWT_SECRET).
echo   2. Crea tu administrador:  cd backend ^&^& npm run crear:admin
echo   3. Ejecuta iniciar.bat
pause
exit /b 0
:error
echo.
echo Algo fallo durante la instalacion. Revisa los mensajes de arriba.
pause
exit /b 1
