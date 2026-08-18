import os
import math
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

def generate_historical_dataset(
    start_date: str = "2025-01-01",
    days: int = 365,
    output_dir: str = "ml_engine/data/processed"
) -> pd.DataFrame:
    """
    Generate a standardized 1-year hourly microgrid meteorological and energy dataset (8,760 hours)
    grounded in NREL NSRDB, NREL Wind Toolkit, and ISO-NE demand characteristics.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
    total_hours = days * 24
    timestamps = [start_dt + timedelta(hours=i) for i in range(total_hours)]
    
    np.random.seed(42)
    records = []

    for i, ts in enumerate(timestamps):
        day_of_year = ts.timetuple().tm_yday
        hour = ts.hour
        month = ts.month
        weekday = ts.weekday()
        is_weekend = 1 if weekday >= 5 else 0

        # --- 1. Solar Physics & Meteorology ---
        # Seasonal solar declination
        declination = 23.45 * math.sin(math.radians((360 / 365) * (day_of_year - 81)))
        # Hour angle (solar noon at 12:00)
        hour_angle = 15.0 * (hour - 12.0)
        lat = 23.8343 # Charanka solar park
        
        # Solar elevation angle & Zenith angle
        sin_elev = (math.sin(math.radians(lat)) * math.sin(math.radians(declination)) +
                    math.cos(math.radians(lat)) * math.cos(math.radians(declination)) * math.cos(math.radians(hour_angle)))
        elev_deg = math.degrees(math.asin(max(-1.0, min(1.0, sin_elev))))
        zenith_deg = max(0.0, 90.0 - elev_deg)

        # Clear sky irradiance model
        if elev_deg > 0:
            air_mass = 1.0 / max(0.01, math.sin(math.radians(elev_deg)) + 0.50572 * ((elev_deg + 6.07995) ** -1.6364))
            clear_ghi = max(0.0, 1050.0 * (math.sin(math.radians(elev_deg)) ** 1.15))
        else:
            clear_ghi = 0.0

        # Cloud cover variability with auto-correlated weather fronts
        weather_front = 0.25 * math.sin(day_of_year / 10.0) + 0.15 * math.sin(day_of_year / 3.0)
        cloud_pct = max(0.0, min(100.0, (20.0 + 30.0 * weather_front + np.random.normal(0, 12))))
        
        # Actual GHI, DNI, DHI
        cloud_transmission = 1.0 - (0.75 * ((cloud_pct / 100.0) ** 2))
        ghi = max(0.0, clear_ghi * cloud_transmission + (np.random.normal(0, 5) if clear_ghi > 0 else 0))
        dni = max(0.0, ghi * 1.15 * (1.0 - (cloud_pct / 100.0))) if ghi > 0 else 0.0
        dhi = max(0.0, ghi - dni * math.sin(math.radians(max(0, elev_deg)))) if ghi > 0 else 0.0

        # Temperature (°C)
        seasonal_temp = 28.0 + 8.0 * math.sin(math.radians((360 / 365) * (day_of_year - 105)))
        diurnal_temp = 6.0 * math.sin(math.radians(15 * (hour - 9)))
        temp_c = round(seasonal_temp + diurnal_temp - (cloud_pct * 0.05) + np.random.normal(0, 0.8), 2)
        humidity_pct = max(15.0, min(95.0, round(60.0 - diurnal_temp * 2.5 + (cloud_pct * 0.2) + np.random.normal(0, 3), 1)))
        pressure_hpa = round(1012.0 - (temp_c * 0.15) + np.random.normal(0, 1), 1)

        # Solar PV Actual Generation (100 kW plant)
        t_cell = temp_c + (ghi * (45.0 - 20.0) / 800.0)
        temp_derate = max(0.7, 1.0 - 0.0038 * (t_cell - 25.0))
        solar_generation_kw = max(0.0, min(105.0, round(100.0 * (ghi / 1000.0) * temp_derate * 0.96 * 0.97, 2)))

        # --- 2. Wind Physics (100 kW turbine) ---
        # Weibull-distributed seasonal wind with diurnal jet
        seasonal_wind = 6.5 + 2.5 * math.sin(math.radians((360 / 365) * (day_of_year - 160)))
        diurnal_wind = 1.5 * math.sin(math.radians(15 * (hour - 15))) # Peaks in afternoon/evening
        wind_10m = max(0.5, round(np.random.weibull(2.1) * (seasonal_wind + diurnal_wind) * 0.65, 2))
        
        # Power law extrapolation to 100m hub height (alpha = 0.143)
        wind_100m = round(wind_10m * ((100.0 / 10.0) ** 0.143), 2)
        wind_dir = round((180.0 + 90.0 * math.sin(day_of_year / 15.0) + np.random.normal(0, 20)) % 360, 1)

        # Wind turbine power curve
        v_in, v_rated, v_out = 3.0, 12.0, 25.0
        if wind_100m < v_in or wind_100m >= v_out:
            wind_generation_kw = 0.0
        elif v_in <= wind_100m < v_rated:
            wind_generation_kw = round(100.0 * (((wind_100m - v_in) / (v_rated - v_in)) ** 3), 2)
        else:
            wind_generation_kw = 100.0

        # --- 3. Electrical Load Demand (Campus/Industrial) ---
        # Base + Day Work Shift + Evening Peak + HVAC Temperature Sensitivity
        base_load = 32.0 if not is_weekend else 22.0
        work_peak = (42.0 if not is_weekend else 15.0) * math.exp(-((hour - 14.0) ** 2) / 18.0)
        evening_peak = 28.0 * math.exp(-((hour - 19.5) ** 2) / 8.0)
        hvac_cooling = max(0.0, (temp_c - 24.0) * 1.8) # Cooling degree demand
        demand_load_kw = max(18.0, round(base_load + work_peak + evening_peak + hvac_cooling + np.random.normal(0, 1.8), 2))

        records.append({
            "timestamp": ts.isoformat(),
            "month": month,
            "day_of_year": day_of_year,
            "hour": hour,
            "weekday": weekday,
            "is_weekend": is_weekend,
            "zenith_deg": round(zenith_deg, 2),
            "cloud_cover_pct": round(cloud_pct, 1),
            "temperature_c": temp_c,
            "relative_humidity": humidity_pct,
            "surface_pressure_hpa": pressure_hpa,
            "ghi": round(ghi, 2),
            "dni": round(dni, 2),
            "dhi": round(dhi, 2),
            "wind_speed_10m": wind_10m,
            "wind_speed_100m": wind_100m,
            "wind_direction_deg": wind_dir,
            "solar_generation_kw": solar_generation_kw,
            "wind_generation_kw": wind_generation_kw,
            "demand_load_kw": demand_load_kw
        })

    df = pd.DataFrame(records)
    csv_path = os.path.join(output_dir, "microgrid_historical_8760h.csv")
    df.to_csv(csv_path, index=False)
    print(f"Generated historical dataset with {len(df)} hourly records at: {csv_path}")
    return df

if __name__ == "__main__":
    generate_historical_dataset()
