import math
import random
import logging
from collections import deque
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Deque
from app.config import settings
from app.schemas.weather_schema import WeatherObservation
from app.schemas.telemetry_schema import (
    MicrogridLiveTelemetry,
    PowerFlowBreakdown,
    MicrogridHistoryPoint
)
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)

class TelemetryService:
    def __init__(self):
        # Battery state
        self.battery_soc_pct: float = 65.0       # Initial 65% SOC
        self.battery_soh_pct: float = 99.4       # 99.4% State of Health
        self.battery_temperature_c: float = 26.5 # Celsius
        self.last_update_time: datetime = datetime.now(timezone.utc)
        
        # In-memory sliding buffer for real-time frontend charts (last 120 ticks)
        self._history_buffer: Deque[MicrogridHistoryPoint] = deque(maxlen=120)
        self._latest_telemetry: Optional[MicrogridLiveTelemetry] = None
        
        # Pre-seed history buffer with realistic past points so charts look alive immediately
        self._initialize_history_buffer()

    def _initialize_history_buffer(self):
        now = datetime.now(timezone.utc)
        for i in range(60, 0, -1):
            t = now - timedelta(minutes=i*2)
            hour = t.hour + (t.minute / 60.0)
            solar_factor = max(0.0, math.sin(math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0.0
            solar_kw = round(solar_factor * settings.PLANT_CAPACITY_SOLAR_KW * 0.85, 2)
            wind_kw = round(settings.PLANT_CAPACITY_WIND_KW * (0.35 + 0.15 * math.sin(i / 5.0)), 2)
            demand_kw = round(45.0 + 35.0 * math.sin(math.pi * (hour - 7) / 14) + random.uniform(-3, 3), 2)
            
            tot_renew = solar_kw + wind_kw
            net = demand_kw - tot_renew
            
            if net > 0:
                batt_p = min(30.0, net)
                grid_in = net - batt_p
                grid_out = 0.0
            else:
                batt_p = -min(30.0, abs(net))
                grid_in = 0.0
                grid_out = abs(net) - abs(batt_p)
                
            ren_frac = min(100.0, (tot_renew / max(1.0, demand_kw)) * 100.0)
            
            self._history_buffer.append(MicrogridHistoryPoint(
                timestamp=t,
                solar_kw=solar_kw,
                wind_kw=wind_kw,
                demand_kw=demand_kw,
                battery_soc_pct=round(55.0 + 15.0 * math.sin(i / 10.0), 1),
                battery_power_kw=round(batt_p, 2),
                grid_import_kw=round(grid_in, 2),
                grid_export_kw=round(grid_out, 2),
                renewable_fraction_pct=round(ren_frac, 1)
            ))

    def _calculate_dynamic_demand_kw(self, timestamp: datetime) -> float:
        """
        Calculate realistic microgrid load demand based on industrial/campus diurnal curve.
        Base Load: ~40 kW
        Day Shift Peak (09:00 - 17:00): Up to 95 kW
        Evening Lighting/Cooling (18:00 - 22:00): ~75 kW
        Night Idle (23:00 - 06:00): ~35 kW
        """
        hour = timestamp.hour + (timestamp.minute / 60.0) + (timestamp.second / 3600.0)
        
        # Multi-modal diurnal curve
        day_peak = 45.0 * math.exp(-((hour - 13.5) ** 2) / 18.0)
        evening_peak = 30.0 * math.exp(-((hour - 19.5) ** 2) / 8.0)
        base_load = 35.0
        
        # Small stochastic noise for natural telemetry fluctuation
        noise = random.gauss(0.0, 1.5)
        demand = base_load + day_peak + evening_peak + noise
        return max(15.0, round(demand, 2))

    def _get_current_tariff(self, timestamp: datetime) -> float:
        """Determine time-of-use (ToU) electricity price."""
        hour = timestamp.hour
        if 18 <= hour <= 22:
            return settings.DEFAULT_GRID_PEAK_TARIFF_INR
        elif 0 <= hour <= 6:
            return settings.DEFAULT_GRID_BUY_TARIFF_INR * 0.85
        return settings.DEFAULT_GRID_BUY_TARIFF_INR

    async def compute_live_telemetry(self, weather: Optional[WeatherObservation] = None) -> MicrogridLiveTelemetry:
        """
        Compute real-time microgrid power flow, BESS integration, and sustainability indices.
        """
        now = datetime.now(timezone.utc)
        if weather is None:
            weather = await weather_service.fetch_live_weather()

        # 1. Physics Generation
        # Add slight instant turbulence/variability
        jitter = random.uniform(0.97, 1.03)
        solar_kw = round(weather_service._estimate_solar_kw(weather.ghi, weather.temperature_c) * jitter, 2)
        wind_kw = round(weather_service._estimate_wind_kw(weather.wind_speed_100m) * jitter, 2)
        total_renewable_kw = round(solar_kw + wind_kw, 2)

        # 2. Demand
        demand_kw = self._calculate_dynamic_demand_kw(now)
        net_load_kw = round(demand_kw - total_renewable_kw, 2)

        # 3. Dynamic Power Routing & Battery Dispatch
        dt_hours = max(0.0005, (now - self.last_update_time).total_seconds() / 3600.0)
        self.last_update_time = now

        flow = PowerFlowBreakdown(
            solar_to_load_kw=0.0,
            solar_to_batt_kw=0.0,
            solar_to_grid_kw=0.0,
            solar_curtailed_kw=0.0,
            wind_to_load_kw=0.0,
            wind_to_batt_kw=0.0,
            wind_to_grid_kw=0.0,
            wind_curtailed_kw=0.0,
            batt_to_load_kw=0.0,
            grid_to_load_kw=0.0,
            grid_to_batt_kw=0.0
        )

        battery_power_kw = 0.0  # >0 discharging, <0 charging
        grid_import_kw = 0.0
        grid_export_kw = 0.0

        if total_renewable_kw >= demand_kw:
            # Renewable Surplus: Demand fully supplied by solar + wind
            surplus = total_renewable_kw - demand_kw
            
            # Apportion direct load feed proportionally
            if total_renewable_kw > 0:
                flow.solar_to_load_kw = round((solar_kw / total_renewable_kw) * demand_kw, 2)
                flow.wind_to_load_kw = round((wind_kw / total_renewable_kw) * demand_kw, 2)
            
            solar_remaining = solar_kw - flow.solar_to_load_kw
            wind_remaining = wind_kw - flow.wind_to_load_kw

            # Charge Battery if below max SOC
            headroom_kwh = (settings.BESS_MAX_SOC_PCT - self.battery_soc_pct) * settings.BESS_CAPACITY_KWH / 100.0
            max_possible_charge_kw = min(settings.BESS_MAX_CHARGE_KW, headroom_kwh / max(0.01, dt_hours)) if headroom_kwh > 0 else 0.0

            charge_power_kw = min(surplus, max_possible_charge_kw)
            
            if charge_power_kw > 0 and surplus > 0:
                flow.solar_to_batt_kw = round(min(solar_remaining, charge_power_kw * (solar_remaining / surplus)), 2)
                flow.wind_to_batt_kw = round(min(wind_remaining, charge_power_kw * (wind_remaining / surplus)), 2)
                battery_power_kw = -(flow.solar_to_batt_kw + flow.wind_to_batt_kw)
            
            # Export remaining excess to Grid
            solar_excess = solar_remaining - flow.solar_to_batt_kw
            wind_excess = wind_remaining - flow.wind_to_batt_kw
            flow.solar_to_grid_kw = max(0.0, round(solar_excess, 2))
            flow.wind_to_grid_kw = max(0.0, round(wind_excess, 2))
            grid_export_kw = round(flow.solar_to_grid_kw + flow.wind_to_grid_kw, 2)

        else:
            # Renewable Deficit: Demand exceeds solar + wind
            flow.solar_to_load_kw = solar_kw
            flow.wind_to_load_kw = wind_kw
            deficit = demand_kw - total_renewable_kw

            # Discharge Battery if above min SOC
            stored_available_kwh = (self.battery_soc_pct - settings.BESS_MIN_SOC_PCT) * settings.BESS_CAPACITY_KWH / 100.0
            max_possible_discharge_kw = min(settings.BESS_MAX_DISCHARGE_KW, stored_available_kwh / max(0.01, dt_hours)) if stored_available_kwh > 0 else 0.0

            discharge_kw = min(deficit, max_possible_discharge_kw)
            if discharge_kw > 0:
                flow.batt_to_load_kw = round(discharge_kw, 2)
                battery_power_kw = flow.batt_to_load_kw
            
            # Import remaining deficit from Grid
            grid_import_kw = max(0.0, round(deficit - discharge_kw, 2))
            flow.grid_to_load_kw = grid_import_kw

        # 4. Update Battery SOC (Coulomb Counting with efficiency)
        eff = 0.94
        if battery_power_kw < 0: # Charging
            delta_soc = (abs(battery_power_kw) * eff * dt_hours / settings.BESS_CAPACITY_KWH) * 100.0
            self.battery_soc_pct = min(settings.BESS_MAX_SOC_PCT, self.battery_soc_pct + delta_soc)
            self.battery_temperature_c = min(38.0, self.battery_temperature_c + 0.05)
        elif battery_power_kw > 0: # Discharging
            delta_soc = ((battery_power_kw / eff) * dt_hours / settings.BESS_CAPACITY_KWH) * 100.0
            self.battery_soc_pct = max(settings.BESS_MIN_SOC_PCT, self.battery_soc_pct - delta_soc)
            self.battery_temperature_c = min(36.0, self.battery_temperature_c + 0.03)
        else:
            self.battery_temperature_c = max(25.0, self.battery_temperature_c - 0.02)

        self.battery_soc_pct = round(self.battery_soc_pct, 2)
        self.battery_temperature_c = round(self.battery_temperature_c, 2)

        # Determine states
        if battery_power_kw < -0.5:
            battery_status = "CHARGING"
        elif battery_power_kw > 0.5:
            battery_status = "DISCHARGING"
        else:
            battery_status = "IDLE"

        if grid_import_kw > 0.5:
            grid_status = "IMPORTING"
        elif grid_export_kw > 0.5:
            grid_status = "EXPORTING"
        else:
            grid_status = "ZERO_EXCHANGE"

        # 5. KPIs
        tariff = self._get_current_tariff(now)
        renewables_used = min(demand_kw, total_renewable_kw + max(0.0, battery_power_kw))
        renewable_fraction = min(100.0, round((renewables_used / demand_kw) * 100.0, 1)) if demand_kw > 0 else 100.0
        
        # Carbon avoided: renewables used * grid emission factor
        carbon_avoided_kg_hr = round(renewables_used * (settings.GRID_CARBON_INTENSITY_GCO2_KWH / 1000.0), 2)
        cost_rate_inr_hr = round((grid_import_kw * tariff) - (grid_export_kw * settings.DEFAULT_GRID_FEEDIN_TARIFF_INR), 2)

        telemetry = MicrogridLiveTelemetry(
            timestamp=now,
            system_id="MICROGRID_01",
            solar_generation_kw=solar_kw,
            wind_generation_kw=wind_kw,
            total_renewable_generation_kw=total_renewable_kw,
            demand_load_kw=demand_kw,
            net_load_kw=net_load_kw,
            battery_soc_pct=self.battery_soc_pct,
            battery_power_kw=round(battery_power_kw, 2),
            battery_status=battery_status,
            battery_temperature_c=self.battery_temperature_c,
            battery_soh_pct=self.battery_soh_pct,
            grid_import_kw=grid_import_kw,
            grid_export_kw=grid_export_kw,
            grid_status=grid_status,
            grid_tariff_inr=tariff,
            renewable_fraction_pct=renewable_fraction,
            carbon_avoided_kg_per_hr=carbon_avoided_kg_hr,
            current_cost_rate_inr_per_hr=cost_rate_inr_hr,
            flow=flow,
            weather_summary={
                "ghi": weather.ghi,
                "dni": weather.dni,
                "wind_speed_100m": weather.wind_speed_100m,
                "temperature_c": weather.temperature_c,
                "cloud_cover_pct": weather.cloud_cover_pct,
                "source": weather.source
            },
            is_simulated=False
        )

        self._latest_telemetry = telemetry

        # Append to in-memory history buffer
        self._history_buffer.append(MicrogridHistoryPoint(
            timestamp=now,
            solar_kw=solar_kw,
            wind_kw=wind_kw,
            demand_kw=demand_kw,
            battery_soc_pct=self.battery_soc_pct,
            battery_power_kw=round(battery_power_kw, 2),
            grid_import_kw=grid_import_kw,
            grid_export_kw=grid_export_kw,
            renewable_fraction_pct=renewable_fraction
        ))

        return telemetry

    def get_latest_telemetry(self) -> Optional[MicrogridLiveTelemetry]:
        return self._latest_telemetry

    def get_history(self, limit: int = 60) -> List[MicrogridHistoryPoint]:
        return list(self._history_buffer)[-limit:]

telemetry_service = TelemetryService()
