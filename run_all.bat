@echo off
echo =========================================================================
echo Launching AI-REMS (Backend + Real-Time React Frontend)
echo =========================================================================
start "AI-REMS Backend (FastAPI)" cmd /c "%~dp0run_backend.bat"
timeout /t 2 >nul
start "AI-REMS Frontend (React/Vite)" cmd /c "%~dp0run_frontend.bat"
echo AI-REMS services launched!
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173
