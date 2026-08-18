# ==============================================================================
# AI-REMS One-Click Development Launcher (PowerShell / Windows)
# Launches FastAPI Backend (:8000) & Vite React Frontend (:5173)
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  AI-REMS: Real-Time Microgrid Intelligence & Optimization Platform  " -ForegroundColor Green
Write-Host "  SIH Stage Production Launch Kit                                     " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

# Set environment paths
$ROOT_DIR = $PSScriptRoot
$BACKEND_DIR = "$ROOT_DIR\backend"
$FRONTEND_DIR = "$ROOT_DIR\frontend"
$NODE_PATH = "C:\Users\Yashashvi Nandanwar\.gemini\antigravity\scratch\tools\node"

if (Test-Path $NODE_PATH) {
    $env:PATH = "$NODE_PATH;$env:PATH"
}

# 1. Verify and Seed ML Data
Write-Host "`n[1/3] Verifying ML Engine and Historical Datasets..." -ForegroundColor Yellow
python "$ROOT_DIR\scripts\seed_demo_data.py"

# 2. Launch FastAPI Backend
Write-Host "`n[2/3] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process -FilePath "python" -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory $BACKEND_DIR

# 3. Launch React Vite Frontend
Write-Host "`n[3/3] Launching React Vite Dashboard on http://localhost:5173..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $FRONTEND_DIR

Start-Sleep -Seconds 3
Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  AI-REMS IS RUNNING!" -ForegroundColor Green
Write-Host "  - Frontend Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "  - Swagger API Docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - WebSocket Stream:   ws://localhost:8000/ws/live-stream" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
