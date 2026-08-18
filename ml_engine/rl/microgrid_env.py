import math
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Tuple, Dict, Any, Optional

class MicrogridGymEnv(gym.Env):
    """
    Standard Gymnasium Environment for Hybrid Microgrid Real-Time Energy Dispatch.
    State: [SOC(t), Solar(t), Wind(t), Demand(t), Tariff(t), sin_hour, cos_hour, Grid_Carbon]
    Action: Continuous battery dispatch setpoint in [-1.0, 1.0] -> [-P_max_charge, +P_max_discharge]
    """
    metadata = {"render_modes": ["human"]}

    def __init__(
        self,
        bess_capacity_kwh: float = 200.0,
        bess_max_power_kw: float = 50.0,
        min_soc_pct: float = 15.0,
        max_soc_pct: float = 95.0,
        grid_carbon_factor: float = 0.82
    ):
        super().__init__()
        self.bess_capacity = bess_capacity_kwh
        self.bess_max_power = bess_max_power_kw
        self.min_soc = min_soc_pct
        self.max_soc = max_soc_pct
        self.grid_carbon = grid_carbon_factor
        self.eff = 0.95

        # Observation Space: 8 continuous state features
        # [soc_pct, solar_kw, wind_kw, demand_kw, tariff_inr, sin_h, cos_h, grid_carbon]
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0, 0.0, 2.0, -1.0, -1.0, 0.0], dtype=np.float32),
            high=np.array([100.0, 200.0, 200.0, 250.0, 25.0, 1.0, 1.0, 2.0], dtype=np.float32),
            dtype=np.float32
        )

        # Action Space: [-1.0 (Full Charge) to +1.0 (Full Discharge)]
        self.action_space = spaces.Box(
            low=np.array([-1.0], dtype=np.float32),
            high=np.array([1.0], dtype=np.float32),
            dtype=np.float32
        )

        self.current_step = 0
        self.max_steps = 24
        self.soc = 65.0
        self.trajectory_data = None

    def reset(self, seed: Optional[int] = None, options: Optional[Dict[str, Any]] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        super().reset(seed=seed)
        self.current_step = 0
        self.soc = 65.0 if options is None or "initial_soc" not in options else options["initial_soc"]
        
        obs = self._get_obs()
        return obs, {"hour": self.current_step, "soc": self.soc}

    def _get_obs(self) -> np.ndarray:
        h = self.current_step % 24
        sin_h = math.sin(2.0 * math.pi * h / 24.0)
        cos_h = math.cos(2.0 * math.pi * h / 24.0)
        
        # Nominal diurnal patterns
        solar = max(0.0, 85.0 * math.sin(math.pi * (h - 6) / 12.0)) if 6 <= h <= 18 else 0.0
        wind = 40.0 + 20.0 * math.sin(2.0 * math.pi * (h + 3) / 24.0)
        demand = 45.0 + 35.0 * math.sin(math.pi * (h - 8) / 14.0)
        if 18 <= h <= 22:
            tariff = 11.0 # Peak tariff
            demand += 25.0
        elif 0 <= h <= 6:
            tariff = 6.40 # Off-peak
        else:
            tariff = 7.50

        return np.array([
            self.soc,
            solar,
            wind,
            demand,
            tariff,
            sin_h,
            cos_h,
            self.grid_carbon
        ], dtype=np.float32)

    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        act = float(np.clip(action[0], -1.0, 1.0))
        target_b_power = act * self.bess_max_power # positive = discharge, negative = charge

        obs = self._get_obs()
        solar, wind, demand, tariff = float(obs[1]), float(obs[2]), float(obs[3]), float(obs[4])

        # Physical battery state update
        if target_b_power > 0: # Discharge
            stored_kwh = (self.soc - self.min_soc) * self.bess_capacity / 100.0
            actual_dis = min(target_b_power, stored_kwh * self.eff)
            self.soc = max(self.min_soc, self.soc - (actual_dis / self.eff / self.bess_capacity) * 100.0)
            b_power = actual_dis
        else: # Charge
            headroom_kwh = (self.max_soc - self.soc) * self.bess_capacity / 100.0
            actual_chg = min(abs(target_b_power), headroom_kwh / self.eff)
            self.soc = min(self.max_soc, self.soc + (actual_chg * self.eff / self.bess_capacity) * 100.0)
            b_power = -actual_chg

        tot_renew = solar + wind
        net_demand = demand - tot_renew - b_power

        if net_demand > 0:
            grid_in = net_demand
            grid_out = 0.0
        else:
            grid_in = 0.0
            grid_out = abs(net_demand)

        cost = (grid_in * tariff) - (grid_out * 3.20)
        carbon = grid_in * self.grid_carbon
        deg = abs(b_power) * 0.85

        # Reward = Negative weighted operating cost
        reward = -(cost * 0.6 + carbon * 2.0 + deg * 0.2)

        self.current_step += 1
        terminated = self.current_step >= self.max_steps
        truncated = False

        next_obs = self._get_obs()
        info = {
            "solar_kw": solar,
            "wind_kw": wind,
            "demand_kw": demand,
            "battery_power_kw": b_power,
            "battery_soc_pct": self.soc,
            "grid_import_kw": grid_in,
            "grid_export_kw": grid_out,
            "hourly_cost_inr": cost,
            "hourly_co2_kg": carbon
        }

        return next_obs, reward, terminated, truncated, info
