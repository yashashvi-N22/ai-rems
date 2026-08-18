@echo off
echo =======================================================
echo Starting AI-REMS FastAPI Backend Server...
echo =======================================================
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
