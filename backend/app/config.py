from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-REMS"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "AI-Driven Real-Time Hybrid Renewable Energy Intelligence & Optimization Platform"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security / CORS
    SECRET_KEY: str = "ai-rems-super-secret-key-for-jwt-and-session-security-2026"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Database (Default to SQLite for instant local zero-dependency development, switchable to Postgres/TimescaleDB)
    DATABASE_URL: str = "sqlite+aiosqlite:///./airems.db"
    
    # Plant Physical Specs & Location (Hadapsar, Pune, Maharashtra, India)
    PLANT_LOCATION_NAME: str = "Hadapsar Clean Energy Hub, Pune, Maharashtra"
    PLANT_LATITUDE: float = 18.5089
    PLANT_LONGITUDE: float = 73.9260
    PLANT_ALTITUDE_M: float = 560.0
    
    PLANT_CAPACITY_SOLAR_KW: float = 100.0   # 100 kW PV Array
    PLANT_CAPACITY_WIND_KW: float = 100.0    # 100 kW Wind Turbine
    BESS_CAPACITY_KWH: float = 200.0         # 200 kWh Battery Pack
    BESS_MAX_CHARGE_KW: float = 50.0         # 50 kW max C-rate
    BESS_MAX_DISCHARGE_KW: float = 50.0      # 50 kW max C-rate
    BESS_MIN_SOC_PCT: float = 15.0           # 15% depth-of-discharge floor
    BESS_MAX_SOC_PCT: float = 95.0           # 95% charge ceiling
    
    # External APIs
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    WEATHER_POLL_INTERVAL_MINUTES: int = 15
    TELEMETRY_STREAM_INTERVAL_SECONDS: float = 2.0
    
    # Carbon & Tariff Baselines
    GRID_CARBON_INTENSITY_GCO2_KWH: float = 710.0  # National average for India (gCO2/kWh)
    DEFAULT_GRID_BUY_TARIFF_INR: float = 7.50       # Base ₹/kWh
    DEFAULT_GRID_PEAK_TARIFF_INR: float = 11.00     # Peak ₹/kWh (18:00 - 22:00)
    DEFAULT_GRID_FEEDIN_TARIFF_INR: float = 3.20    # Feed-in ₹/kWh
    
    # GenAI API
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
