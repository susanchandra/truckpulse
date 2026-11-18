@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo                    TRUCKPULSE PLATFORM LAUNCHER
echo        Automotive Diagnostics & Fleet Health Monitoring Platform
echo       Daimler Truck Innovation Center India (DTICI) Portfolio
echo =====================================================================
echo.

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

:: 1. Check if backend is already running on port 8000
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Backend is already running on port 8000. Skipping backend launch.
) else (
    echo [1/3] Starting FastAPI Backend on http://localhost:8000 ...
    start "TruckPulse Backend (FastAPI)" cmd /k "cd /d %BACKEND_DIR% && set PYTHONPATH=%BACKEND_DIR% && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
)

:: 2. Check if frontend is already running on port 5173
netstat -ano | findstr :5173 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Frontend is already running on port 5173. Skipping frontend launch.
) else (
    echo [2/3] Starting React Dashboard on http://localhost:5173 ...
    start "TruckPulse Frontend (Vite)" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"
    timeout /t 2 /nobreak >nul
)

:: 3. Open dashboard in default browser
echo [3/3] Opening Dashboard in browser...
start http://localhost:5173

echo.
echo =====================================================================
echo  STATUS: TRUCKPULSE IS NOW RUNNING!
echo.
echo   - React Dashboard:   http://localhost:5173
echo   - FastAPI Backend:   http://localhost:8000
echo   - Swagger API Docs:  http://localhost:8000/docs
echo   - WebSocket Stream:  ws://localhost:8000/ws/telemetry
echo.
echo  To stop: Close the individual Backend and Frontend terminal windows.
echo =====================================================================
echo.
pause
