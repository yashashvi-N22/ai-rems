@echo off
echo =======================================================
echo Starting AI-REMS React + Vite Frontend Dashboard...
echo =======================================================
set "PATH=%~dp0..\tools\node;%PATH%"
cd /d "%~dp0frontend"
npm run dev
pause
