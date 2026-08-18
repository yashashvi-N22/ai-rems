# 🚀 AI-REMS: Complete Cloud Deployment Guide

This guide gives you **3 deployment options** depending on your need:

---

## ⚡ Option 1: Instant 60-Second Public URL (Best for Live Presentation Today)

If you want a live public URL right now so examiners or teammates can open the dashboard on their phones or laptops without paying for cloud servers:

### Step 1: Ensure Backend and Frontend are Running
Make sure your servers are running locally (`http://127.0.0.1:8000` and `http://127.0.0.1:5173`).

### Step 2: Create an Instant Free Public Tunnel
Open a new PowerShell window and run:
```powershell
$env:PATH = "C:\Users\Yashashvi Nandanwar\.gemini\antigravity\scratch\tools\node;$env:PATH"
npx localtunnel --port 5173
```
This gives you a public HTTPS URL (e.g. `https://hungry-fox-42.loca.lt`) that works anywhere on any device!

---

## 🌐 Option 2: 100% Free 24/7 Cloud Deployment (Render + Vercel)

### 1. Deploy the Backend (Python FastAPI) on Render.com (Free Tier)
1. Push your project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "AI-REMS production release"
   git remote add origin https://github.com/YOUR_USERNAME/ai-rems.git
   git push -u origin main
   ```
2. Go to **[Render.com](https://render.com)** $\to$ Click **"New Web Service"**.
3. Select your GitHub repository.
4. Configure the settings:
   - **Environment**: `Python`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Click **"Deploy Web Service"**.
6. Render will generate your backend URL (e.g., `https://ai-rems-api.onrender.com`).

---

### 2. Deploy the Frontend (React Vite) on Vercel (Free Tier)
1. Go to **[Vercel.com](https://vercel.com)** $\to$ Click **"Add New Project"**.
2. Import your GitHub repository.
3. Configure the settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Environment Variables**:
     - `VITE_API_BASE_URL`: `https://ai-rems-api.onrender.com/api/v1`
     - `VITE_WS_URL`: `wss://ai-rems-api.onrender.com/ws/live-stream`
4. Click **"Deploy"**.
5. Vercel will give you a lightning-fast global URL (e.g., `https://ai-rems.vercel.app`)!

---

## 🐳 Option 3: Production Docker Deployment on Any Linux VPS (AWS / DigitalOcean / GCP)

If you have a Linux cloud server (Ubuntu VPS):

1. SSH into your server:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```
2. Clone your repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-rems.git
   cd ai-rems
   ```
3. Start the multi-container Docker cluster with one command:
   ```bash
   docker compose up -d --build
   ```
4. Access your live industrial SCADA microgrid directly at `http://YOUR_SERVER_IP`!

---

## 🔒 Environment Variables Summary

| Variable | Default (Local) | Production Cloud Example |
|---|---|---|
| `ENVIRONMENT` | `development` | `production` |
| `PLANT_LOCATION_NAME` | `Hadapsar Clean Energy Hub, Pune, Maharashtra` | `Hadapsar Clean Energy Hub, Pune, Maharashtra` |
| `PLANT_LATITUDE` | `18.5089` | `18.5089` |
| `PLANT_LONGITUDE` | `73.9260` | `73.9260` |
| `GEMINI_API_KEY` | *(Optional)* | `AIzaSy...` *(for Google Gemini GenAI Co-Pilot)* |
