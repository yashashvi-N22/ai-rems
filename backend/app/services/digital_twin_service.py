import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from app.config import settings
from app.schemas.digital_twin_schema import (
    StressTestScenarioParams,
    SimulatedTimestep,
    SimulationStressTestResponse,
    CapacitySizingRequest,
    CapacitySizingResponse
)

class DigitalTwinService:
    def run_stress_test(self, params: StressTestScenarioParams) -> SimulationStressTestResponse:
        """
        Simulate 24-hour microgrid dynamics under injected severe weather, load, or grid outage conditions.
        """
        now = datetime.now(timezone.utc)
        horizon = 24
        timesteps: List[SimulatedTimestep] = []

        e_cap = params.battery_capacity_kwh
        p_ch_max = e_cap * 0.25 # 0.25C rate
        p_dis_max = e_cap * 0.25
        soc = params.initial_soc_pct
        soc_min = settings.BESS_MIN_SOC_PCT
        soc_max = settings.BESS_MAX_SOC_PCT
        eff = 0.95

        tot_solar, tot_wind, tot_demand, tot_unserved, tot_curtailed = 0.0, 0.0, 0.0, 0.0, 0.0
        max_grid_in = 0.0
        min_soc = soc
        max_soc = soc
        outage_hours_encountered = 0
        unserved_during_outage = 0.0

        for h in range(1, horizon + 1):
            t_curr = now + timedelta(hours=h - 1)
            hour_of_day = (now.hour + h - 1) % 24

            # 1. Base solar curve with cloud attenuation & temperature derating
            if 6 <= hour_of_day <= 18:
                solar_angle_factor = math.sin((hour_of_day - 6) / 12.0 * math.pi)
                # Temperature derating: -0.4% per °C above 25°C
                temp_factor = max(0.8, 1.0 - 0.004 * max(0.0, params.ambient_temp_c - 25.0))
                cloud_factor = 1.0 - (params.cloud_attenuation_pct / 100.0)
                s_gen = params.solar_capacity_kw * solar_angle_factor * temp_factor * cloud_factor
            else:
                s_gen = 0.0

            # 2. Base wind curve with wind speed multiplier
            base_wind_norm = 0.45 + 0.35 * math.sin((hour_of_day + 3) / 24.0 * 2.0 * math.pi)
            w_gen = params.wind_capacity_kw * base_wind_norm * (params.wind_speed_multiplier ** 3)
            w_gen = min(params.wind_capacity_kw * 1.05, max(0.0, w_gen))

            # 3. Base demand curve with surge multiplier
            base_dem_norm = 0.40 + 0.35 * math.sin((hour_of_day - 8) / 24.0 * 2.0 * math.pi)
            if 18 <= hour_of_day <= 22:
                base_dem_norm += 0.25 # Evening peak
            d_load = 55.0 * (params.solar_capacity_kw / 100.0) * base_dem_norm * params.load_surge_multiplier

            # 4. Check Grid Availability
            is_grid_available = h not in params.grid_outage_hours
            if not is_grid_available:
                outage_hours_encountered += 1

            # 5. Microgrid Power Balance & Battery Dispatch
            tot_ren = s_gen + w_gen
            b_power = 0.0 # positive = discharge, negative = charge
            g_import = 0.0
            g_export = 0.0
            unserved = 0.0
            curtailed = 0.0
            freq = 50.0

            if tot_ren >= d_load:
                surplus = tot_ren - d_load
                # Battery charging
                headroom = (soc_max - soc) * e_cap / 100.0
                chg = min(p_ch_max, headroom, surplus)
                if chg > 0:
                    b_power = -chg
                    soc = min(soc_max, soc + (chg * eff / e_cap) * 100.0)
                    surplus -= chg

                if is_grid_available:
                    g_export = surplus
                else:
                    curtailed = surplus # Islanded curtailment
            else:
                deficit = d_load - tot_ren
                # Battery discharging
                stored = (soc - soc_min) * e_cap / 100.0
                dis = min(p_dis_max, stored, deficit)
                if dis > 0:
                    b_power = dis
                    soc = max(soc_min, soc - (dis / eff / e_cap) * 100.0)
                    deficit -= dis

                if is_grid_available:
                    g_import = deficit
                else:
                    unserved = deficit # Islanded blackout / unserved load
                    unserved_during_outage += unserved
                    freq = max(47.5, 50.0 - (unserved / max(1.0, d_load)) * 2.5)

            min_soc = min(min_soc, soc)
            max_soc = max(max_soc, soc)
            tot_solar += s_gen
            tot_wind += w_gen
            tot_demand += d_load
            tot_unserved += unserved
            tot_curtailed += curtailed
            max_grid_in = max(max_grid_in, g_import)

            # Stability classification
            if unserved > 0.1:
                status = "LOAD_SHEDDING"
            elif not is_grid_available:
                status = "ISLANDED_STABLE"
            elif g_import > 80.0:
                status = "HIGH_GRID_STRESS"
            else:
                status = "NORMAL_STABLE"

            timesteps.append(SimulatedTimestep(
                hour=h,
                time=t_curr,
                solar_gen_kw=round(s_gen, 2),
                wind_gen_kw=round(w_gen, 2),
                demand_load_kw=round(d_load, 2),
                battery_power_kw=round(b_power, 2),
                battery_soc_pct=round(soc, 1),
                grid_import_kw=round(g_import, 2),
                grid_export_kw=round(g_export, 2),
                unserved_load_kw=round(unserved, 2),
                curtailed_energy_kw=round(curtailed, 2),
                grid_available=is_grid_available,
                system_frequency_hz=round(freq, 2),
                stability_status=status
            ))

        # Resilience calculation
        resilience_pct = 100.0
        if outage_hours_encountered > 0:
            total_outage_demand = sum([ts.demand_load_kw for ts in timesteps if not ts.grid_available])
            resilience_pct = max(0.0, 100.0 - (unserved_during_outage / max(1.0, total_outage_demand)) * 100.0)

        outage_survived = tot_unserved < 1.0

        notes = f"Simulated {params.scenario_type}: Islanding resilience score {resilience_pct:.1f}%. "
        if outage_hours_encountered > 0:
            notes += f"{outage_hours_encountered}h grid blackout tested. Unserved energy: {tot_unserved:.1f} kWh."
        else:
            notes += f"Peak grid import: {max_grid_in:.1f} kW. Minimum Battery SOC: {min_soc:.1f}%."

        return SimulationStressTestResponse(
            scenario_name=params.scenario_type,
            run_timestamp=now,
            horizon_hours=horizon,
            total_solar_kwh=round(tot_solar, 2),
            total_wind_kwh=round(tot_wind, 2),
            total_demand_kwh=round(tot_demand, 2),
            total_unserved_energy_kwh=round(tot_unserved, 2),
            total_curtailed_kwh=round(tot_curtailed, 2),
            max_grid_import_kw=round(max_grid_in, 2),
            min_battery_soc_pct=round(min_soc, 1),
            max_battery_soc_pct=round(max_soc, 1),
            islanding_resilience_score_pct=round(resilience_pct, 1),
            grid_outage_survived=outage_survived,
            summary_notes=notes,
            timesteps=timesteps
        )

    def calculate_capacity_roi(self, req: CapacitySizingRequest) -> CapacitySizingResponse:
        """
        Compute CAPEX, OPEX, 10-year / 20-year Net Present Value (NPV), Payback Period, and LCOE for custom asset mix.
        """
        # Industry unit benchmarks (India / Global utility scale 2025/2026)
        c_solar_per_kw = 42000.0  # ₹42,000 / kWp
        c_wind_per_kw = 58000.0   # ₹58,000 / kW
        c_bess_per_kwh = 18000.0  # ₹18,000 / kWh (LFP)
        c_bos_inverter = 350000.0 # Balance of System & Hybrid Inverter setup

        capex = (req.solar_kw * c_solar_per_kw) + (req.wind_kw * c_wind_per_kw) + (req.battery_kwh * c_bess_per_kwh) + c_bos_inverter
        opex_annual = capex * 0.015 # 1.5% annual O&M

        # Annual Generation (kWh)
        # Solar: 1,650 kWh / kWp / year (~18.8% CF)
        # Wind: 2,280 kWh / kW / year (~26.0% CF)
        annual_solar_kwh = req.solar_kw * 1650.0
        annual_wind_kwh = req.wind_kw * 2280.0
        total_gen_kwh = annual_solar_kwh + annual_wind_kwh

        # Self consumption fraction (boosted by battery size)
        bess_ratio = min(1.0, req.battery_kwh / max(1.0, (req.solar_kw + req.wind_kw)))
        self_consumption_pct = min(96.0, 70.0 + (bess_ratio * 25.0))

        annual_consumed_kwh = total_gen_kwh * (self_consumption_pct / 100.0)
        annual_exported_kwh = total_gen_kwh - annual_consumed_kwh

        # Annual Financial Value
        tariff_buy = req.grid_buy_tariff_inr
        tariff_feedin = settings.DEFAULT_GRID_FEEDIN_TARIFF_INR

        annual_bill_savings = (annual_consumed_kwh * tariff_buy) + (annual_exported_kwh * tariff_feedin)
        net_annual_cashflow = annual_bill_savings - opex_annual

        payback_years = capex / max(1.0, net_annual_cashflow)

        # Discounted Cash Flow NPV
        r = req.discount_rate_pct / 100.0
        npv_10 = -capex
        for y in range(1, 11):
            npv_10 += net_annual_cashflow / ((1.0 + r) ** y)

        npv_20 = -capex
        for y in range(1, 21):
            npv_20 += net_annual_cashflow / ((1.0 + r) ** y)

        # Levelized Cost of Electricity (LCOE ₹ / kWh)
        # LCOE = (CAPEX + PV(OPEX)) / PV(Generation)
        pv_opex = sum([opex_annual / ((1.0 + r) ** y) for y in range(1, 21)])
        pv_gen = sum([total_gen_kwh / ((1.0 + r) ** y) for y in range(1, 21)])
        lcoe = (capex + pv_opex) / max(1.0, pv_gen)

        co2_tons = (total_gen_kwh * 0.82) / 1000.0 # 0.82 kg CO2 / kWh avoided

        return CapacitySizingResponse(
            solar_kw=req.solar_kw,
            wind_kw=req.wind_kw,
            battery_kwh=req.battery_kwh,
            total_capex_inr=round(capex, 2),
            annual_opex_inr=round(opex_annual, 2),
            annual_generation_kwh=round(total_gen_kwh, 1),
            annual_savings_inr=round(annual_bill_savings, 2),
            payback_period_years=round(payback_years, 2),
            ten_year_npv_inr=round(npv_10, 2),
            twenty_year_npv_inr=round(npv_20, 2),
            lcoe_inr_per_kwh=round(lcoe, 2),
            co2_abatement_tons_per_year=round(co2_tons, 1),
            renewable_fraction_pct=round(self_consumption_pct, 1)
        )

digital_twin_service = DigitalTwinService()
