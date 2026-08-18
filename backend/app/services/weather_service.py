import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import httpx
from app.config import settings
from app.schemas.weather_schema import WeatherObservation, HourlyForecastPoint, WeatherForecastResponse

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.base_url = settings.OPEN_METEO_BASE_URL
        self._cached_current: Optional[WeatherObservation] = None
        self._cached_forecast: Optional[WeatherForecastResponse] = None
        self._last_fetch_time: Optional[datetime] = None
        
        # Dynamic active location state (defaults to settings)
        self.active_location_name = settings.PLANT_LOCATION_NAME
        self.active_latitude = settings.PLANT_LATITUDE
        self.active_longitude = settings.PLANT_LONGITUDE
        self.active_altitude_m = settings.PLANT_ALTITUDE_M

    def get_presets(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "pune_hadapsar",
                "name": "Hadapsar Clean Energy Hub, Pune",
                "state_country": "Maharashtra, India",
                "latitude": 18.5089,
                "longitude": 73.9260,
                "altitude_m": 560.0,
                "description": "Urban industrial & IT corridor microgrid with high rooftop PV and daytime load demand."
            },
            {
                "id": "charanka_gujarat",
                "name": "Charanka Solar-Wind Hybrid Park",
                "state_country": "Patan, Gujarat, India",
                "latitude": 23.8343,
                "longitude": 71.1924,
                "altitude_m": 18.0,
                "description": "Asia's pioneer 700+ MW mega solar park with strong Kutch wind corridors."
            },
            {
                "id": "bhadla_rajasthan",
                "name": "Bhadla Mega Solar Park",
                "state_country": "Phalodi, Rajasthan, India",
                "latitude": 27.5360,
                "longitude": 71.9170,
                "altitude_m": 220.0,
                "description": "World's largest 2,245 MW solar installation with extreme desert DNI irradiance."
            },
            {
                "id": "pavagada_karnataka",
                "name": "Pavagada Solar Park (Shakti Sthala)",
                "state_country": "Tumakuru, Karnataka, India",
                "latitude": 14.2800,
                "longitude": 77.4100,
                "altitude_m": 650.0,
                "description": "2,050 MW high-altitude plateau solar park with Deccan plateau wind profile."
            },
            {
                "id": "muppandal_tamilnadu",
                "name": "Muppandal Wind-Solar Corridor",
                "state_country": "Kanyakumari, Tamil Nadu, India",
                "latitude": 8.2600,
                "longitude": 77.5400,
                "altitude_m": 45.0,
                "description": "India's highest wind density corridor (1,500 MW wind capacity) through Palakkad/Aralvaimozhi pass."
            },
            {
                "id": "leh_ladakh",
                "name": "Ladakh High-Altitude Solar Hub",
                "state_country": "Leh, Ladakh, India",
                "latitude": 34.1526,
                "longitude": 77.5771,
                "altitude_m": 3500.0,
                "description": "High UV irradiance cold-desert microgrid with critical battery thermal insulation needs."
            }
        ]

    def set_location(self, name: str, lat: float, lon: float, alt_m: float = 100.0):
        self.active_location_name = name
        self.active_latitude = lat
        self.active_longitude = lon
        self.active_altitude_m = alt_m
        self._cached_current = None
        self._cached_forecast = None
        logger.info(f"Active Plant Location updated to: {name} ({lat}, {lon})")

    async def fetch_live_weather(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_name: Optional[str] = None
    ) -> WeatherObservation:
        """
        Fetch real-time weather and solar irradiance telemetry from Open-Meteo REST API.
        """
        lat = latitude if latitude is not None else self.active_latitude
        lon = longitude if longitude is not None else self.active_longitude
        loc_name = location_name if location_name is not None else self.active_location_name
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": [
                "temperature_2m",
                "relative_humidity_2m",
                "surface_pressure",
                "cloud_cover",
                "precipitation",
                "direct_normal_irradiance",
                "diffuse_radiation",
                "shortwave_radiation_instant",
                "wind_speed_10m",
                "wind_speed_100m",
                "wind_direction_10m",
                "wind_gusts_10m"
            ],
            "timezone": "auto"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/forecast", params=params)
                response.raise_for_status()
                data = response.json()

            current = data.get("current", {})
            ghi = float(current.get("shortwave_radiation_instant", 0.0) or 0.0)
            dni = float(current.get("direct_normal_irradiance", 0.0) or 0.0)
            dhi = float(current.get("diffuse_radiation", 0.0) or 0.0)
            
            # Ensure non-negative irradiance
            ghi = max(0.0, ghi)
            dni = max(0.0, dni)
            dhi = max(0.0, dhi)

            observation = WeatherObservation(
                timestamp=datetime.now(timezone.utc),
                location_name=loc_name,
                latitude=lat,
                longitude=lon,
                temperature_c=float(current.get("temperature_2m", 25.0)),
                relative_humidity=float(current.get("relative_humidity_2m", 50.0)),
                surface_pressure_hpa=float(current.get("surface_pressure", 1013.25)),
                cloud_cover_pct=float(current.get("cloud_cover", 10.0)),
                precipitation_mm=float(current.get("precipitation", 0.0)),
                ghi=ghi,
                dni=dni,
                dhi=dhi,
                wind_speed_10m=float(current.get("wind_speed_10m", 4.5)),
                wind_speed_100m=float(current.get("wind_speed_100m", 7.2)),
                wind_direction_deg=float(current.get("wind_direction_10m", 180.0)),
                wind_gusts_10m=float(current.get("wind_gusts_10m", 6.0)),
                source="OPEN_METEO_LIVE_API"
            )

            self._cached_current = observation
            self._last_fetch_time = datetime.now(timezone.utc)
            return observation

        except Exception as e:
            logger.warning(f"Error fetching live weather from Open-Meteo: {e}. Falling back to cached or synthetic model.")
            if self._cached_current:
                return self._cached_current
            return self._generate_fallback_observation(latitude, longitude, location_name)

    async def fetch_weather_forecast(
        self,
        latitude: float = settings.PLANT_LATITUDE,
        longitude: float = settings.PLANT_LONGITUDE,
        location_name: str = settings.PLANT_LOCATION_NAME,
        horizon_hours: int = 24
    ) -> WeatherForecastResponse:
        """
        Fetch 24-48h hourly weather and irradiance forecast from Open-Meteo.
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": [
                "temperature_2m",
                "cloud_cover",
                "direct_normal_irradiance",
                "diffuse_radiation",
                "shortwave_radiation",
                "wind_speed_10m",
                "wind_speed_100m",
                "wind_direction_10m"
            ],
            "forecast_days": 2,
            "timezone": "auto"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/forecast", params=params)
                response.raise_for_status()
                data = response.json()

            hourly_data = data.get("hourly", {})
            times = hourly_data.get("time", [])
            temps = hourly_data.get("temperature_2m", [])
            clouds = hourly_data.get("cloud_cover", [])
            ghis = hourly_data.get("shortwave_radiation", [])
            dnis = hourly_data.get("direct_normal_irradiance", [])
            dhis = hourly_data.get("diffuse_radiation", [])
            winds_10 = hourly_data.get("wind_speed_10m", [])
            winds_100 = hourly_data.get("wind_speed_100m", [])
            wind_dirs = hourly_data.get("wind_direction_10m", [])

            hourly_points: List[HourlyForecastPoint] = []
            count = min(len(times), horizon_hours)

            for i in range(count):
                ghi_val = max(0.0, float(ghis[i] if i < len(ghis) else 0.0))
                dni_val = max(0.0, float(dnis[i] if i < len(dnis) else 0.0))
                dhi_val = max(0.0, float(dhis[i] if i < len(dhis) else 0.0))
                temp_val = float(temps[i] if i < len(temps) else 25.0)
                wind100_val = float(winds_100[i] if i < len(winds_100) else 6.0)

                # Physical estimates for solar and wind kW
                estimated_solar = self._estimate_solar_kw(ghi_val, temp_val)
                estimated_wind = self._estimate_wind_kw(wind100_val)

                # Parse time string
                t_str = times[i]
                t_dt = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
                if t_dt.tzinfo is None:
                    t_dt = t_dt.replace(tzinfo=timezone.utc)

                hourly_points.append(HourlyForecastPoint(
                    time=t_dt,
                    temperature_c=temp_val,
                    cloud_cover_pct=float(clouds[i] if i < len(clouds) else 0.0),
                    ghi=ghi_val,
                    dni=dni_val,
                    dhi=dhi_val,
                    wind_speed_10m=float(winds_10[i] if i < len(winds_10) else 4.0),
                    wind_speed_100m=wind100_val,
                    wind_direction_deg=float(wind_dirs[i] if i < len(wind_dirs) else 180.0),
                    estimated_solar_kw=round(estimated_solar, 2),
                    estimated_wind_kw=round(estimated_wind, 2)
                ))

            result = WeatherForecastResponse(
                location_name=location_name,
                latitude=latitude,
                longitude=longitude,
                forecast_generated_at=datetime.now(timezone.utc),
                horizon_hours=count,
                hourly=hourly_points
            )
            self._cached_forecast = result
            return result

        except Exception as e:
            logger.warning(f"Error fetching forecast from Open-Meteo: {e}. Generating fallback forecast.")
            if self._cached_forecast:
                return self._cached_forecast
            return self._generate_fallback_forecast(latitude, longitude, location_name, horizon_hours)

    def _estimate_solar_kw(self, ghi: float, temp_c: float) -> float:
        """Physical single-diode PV conversion model with temperature coefficient derating."""
        # STC: 1000 W/m2 at 25 C cell temperature
        # NOCT cell temp estimation
        t_cell = temp_c + (ghi * (45.0 - 20.0) / 800.0)
        temp_derate = 1.0 - 0.0038 * (t_cell - 25.0)
        temp_derate = max(0.6, min(1.05, temp_derate))
        inverter_eff = 0.96
        soiling_factor = 0.97
        solar_kw = settings.PLANT_CAPACITY_SOLAR_KW * (ghi / 1000.0) * temp_derate * inverter_eff * soiling_factor
        return max(0.0, min(settings.PLANT_CAPACITY_SOLAR_KW * 1.1, solar_kw))

    def _estimate_wind_kw(self, wind_speed_100m: float) -> float:
        """Physical wind turbine power curve calculation with cut-in, rated, and cut-out speeds."""
        v_in = 3.0
        v_rated = 12.0
        v_out = 25.0
        p_rated = settings.PLANT_CAPACITY_WIND_KW

        if wind_speed_100m < v_in or wind_speed_100m >= v_out:
            return 0.0
        elif v_in <= wind_speed_100m < v_rated:
            # Cubic power relationship
            fraction = ((wind_speed_100m - v_in) / (v_rated - v_in)) ** 3
            return max(0.0, min(p_rated, p_rated * fraction))
        else:
            return p_rated

    def _generate_fallback_observation(self, lat: float, lon: float, location: str) -> WeatherObservation:
        """Fallback synthetic calculation based on current hour solar zenith simulation."""
        now = datetime.now(timezone.utc)
        hour = now.hour + (now.minute / 60.0)
        # Solar diurnal bell curve
        import math
        solar_zenith = max(0.0, math.sin(math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0.0
        ghi = solar_zenith * 850.0
        dni = solar_zenith * 920.0
        dhi = solar_zenith * 140.0

        return WeatherObservation(
            timestamp=now,
            location_name=location,
            latitude=lat,
            longitude=lon,
            temperature_c=28.5 + 4.0 * solar_zenith,
            relative_humidity=45.0 - 15.0 * solar_zenith,
            surface_pressure_hpa=1012.0,
            cloud_cover_pct=15.0,
            precipitation_mm=0.0,
            ghi=round(ghi, 2),
            dni=round(dni, 2),
            dhi=round(dhi, 2),
            wind_speed_10m=5.2,
            wind_speed_100m=8.1,
            wind_direction_deg=210.0,
            wind_gusts_10m=7.0,
            source="FALLBACK_SIMULATOR"
        )

    def _generate_fallback_forecast(self, lat: float, lon: float, location: str, horizon: int) -> WeatherForecastResponse:
        now = datetime.now(timezone.utc)
        hourly: List[HourlyForecastPoint] = []
        import math

        for h in range(horizon):
            t = now + timedelta(hours=h)
            hour_val = t.hour
            solar_factor = max(0.0, math.sin(math.pi * (hour_val - 6) / 12)) if 6 <= hour_val <= 18 else 0.0
            ghi = round(solar_factor * 850.0, 2)
            dni = round(solar_factor * 900.0, 2)
            dhi = round(solar_factor * 120.0, 2)
            temp = round(26.0 + 6.0 * solar_factor, 1)
            wind100 = round(6.5 + 2.0 * math.sin(h / 3.0), 2)

            hourly.append(HourlyForecastPoint(
                time=t,
                temperature_c=temp,
                cloud_cover_pct=20.0,
                ghi=ghi,
                dni=dni,
                dhi=dhi,
                wind_speed_10m=round(wind100 * 0.7, 2),
                wind_speed_100m=wind100,
                wind_direction_deg=200.0,
                estimated_solar_kw=round(self._estimate_solar_kw(ghi, temp), 2),
                estimated_wind_kw=round(self._estimate_wind_kw(wind100), 2)
            ))

        return WeatherForecastResponse(
            location_name=location,
            latitude=lat,
            longitude=lon,
            forecast_generated_at=now,
            horizon_hours=horizon,
            hourly=hourly
        )

weather_service = WeatherService()
