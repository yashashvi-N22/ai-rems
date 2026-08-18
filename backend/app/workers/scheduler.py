import asyncio
import logging
from app.config import settings
from app.services.telemetry_service import telemetry_service
from app.services.weather_service import weather_service
from app.api.websockets.stream import manager

logger = logging.getLogger(__name__)

class BackgroundWorker:
    def __init__(self):
        self._is_running = False
        self._telemetry_task: asyncio.Task | None = None
        self._weather_task: asyncio.Task | None = None

    async def start(self):
        self._is_running = True
        logger.info("Starting AI-REMS background workers...")
        
        # Initial weather fetch
        try:
            await weather_service.fetch_live_weather()
            await weather_service.fetch_weather_forecast()
            logger.info("Initial weather telemetry fetched successfully.")
        except Exception as e:
            logger.error(f"Error during initial weather fetch: {e}")

        self._telemetry_task = asyncio.create_task(self._telemetry_loop())
        self._weather_task = asyncio.create_task(self._weather_loop())

    async def stop(self):
        self._is_running = False
        logger.info("Stopping AI-REMS background workers...")
        if self._telemetry_task:
            self._telemetry_task.cancel()
        if self._weather_task:
            self._weather_task.cancel()

    async def _telemetry_loop(self):
        """High-frequency loop generating live power telemetry and broadcasting to WebSockets."""
        while self._is_running:
            try:
                telemetry = await telemetry_service.compute_live_telemetry()
                if len(manager.active_connections) > 0:
                    await manager.broadcast({
                        "event": "TELEMETRY_TICK",
                        "data": telemetry.model_dump(mode="json")
                    })
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in telemetry loop: {e}")
            
            await asyncio.sleep(settings.TELEMETRY_STREAM_INTERVAL_SECONDS)

    async def _weather_loop(self):
        """Periodic loop refreshing meteorological data from Open-Meteo REST API."""
        while self._is_running:
            try:
                await asyncio.sleep(settings.WEATHER_POLL_INTERVAL_MINUTES * 60)
                await weather_service.fetch_live_weather()
                await weather_service.fetch_weather_forecast()
                logger.info("Open-Meteo weather telemetry refreshed.")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in weather polling loop: {e}")

background_worker = BackgroundWorker()
