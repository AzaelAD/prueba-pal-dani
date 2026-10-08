@echo off
title CuraMed POS - Sistema Medico
color 0A
echo ========================================================
echo   INICIANDO CURAMED POS - MATERIAL MEDICO Y CURACION
echo ========================================================
echo.

echo 1. Iniciando Servidor Completo (API + Web) en Puerto 5000...
start "CuraMed Backend (Puerto 5000)" cmd /k "cd server && npm start"

echo Esperando 3 segundos...
timeout /t 3 /nobreak > nul

echo 2. Iniciando Servidor de Desarrollo Vite en Puerto 5173...
start "CuraMed Frontend (Puerto 5173)" cmd /k "cd client && npm run dev"

echo Esperando 2 segundos...
timeout /t 2 /nobreak > nul

echo 3. Abriendo el sistema en su navegador web predeterminado...
start http://localhost:5000

echo.
echo ========================================================
echo   SISTEMA ACTIVO Y LISTO:
echo   - Acceso Principal (Recomendado): http://localhost:5000
echo   - Acceso Desarrollo (Vite):       http://localhost:5173
echo.
echo   Credenciales:
echo   - Admin:  admin@curamed.com  / admin123
echo   - Cajero: cajero@curamed.com / cajero123
echo ========================================================
echo.
pause
