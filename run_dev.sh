#!/usr/bin/env bash
# ==============================================================================
# AI-REMS One-Click Development Launcher (Linux / macOS)
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "======================================================================"
echo "  AI-REMS: Real-Time Microgrid Intelligence & Optimization Platform  "
echo "  SIH Stage Production Launch Kit                                     "
echo "======================================================================"

# 1. Seed data & verify
echo -e "\n[1/3] Verifying ML Engine and Historical Datasets..."
python3 "$ROOT_DIR/scripts/seed_demo_data.py"

# 2. Launch backend in background
echo -e "\n[2/3] Starting FastAPI Backend on http://localhost:8000..."
cd "$BACKEND_DIR"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 3. Launch frontend in background
echo -e "\n[3/3] Starting React Vite Frontend on http://localhost:5173..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo -e "\n======================================================================"
echo "  AI-REMS IS RUNNING!"
echo "  - Frontend Dashboard: http://localhost:5173"
echo "  - Swagger API Docs:   http://localhost:8000/docs"
echo "======================================================================"

# Trap kill signal
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
