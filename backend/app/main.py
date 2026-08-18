import os
import sys
import logging

# Ensure root workspace directory is on sys.path for ml_engine imports
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARENT_DIR = os.path.dirname(ROOT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api.v1 import api_v1_router
from app.api.websockets.stream import router as ws_router
from app.workers.scheduler import background_worker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_rems")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing AI-REMS Backend Service...")
    await init_db()
    await background_worker.start()
    logger.info("AI-REMS Backend is online and listening.")
    yield
    logger.info("Shutting down AI-REMS Backend Service...")
    await background_worker.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

@app.get("/")
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "websocket": "/ws/live-stream",
        "plant_location": settings.PLANT_LOCATION_NAME,
        "capacity": {
            "solar_kw": settings.PLANT_CAPACITY_SOLAR_KW,
            "wind_kw": settings.PLANT_CAPACITY_WIND_KW,
            "bess_kwh": settings.BESS_CAPACITY_KWH
        }
    }
