import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Box,
  CloudRain,
  Wind,
  ZapOff,
  Flame,
  Factory,
  ShieldAlert,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { apiClient, SimulationResponse, CapacitySizingResponse } from '../../api/client';

export const DigitalTwinSandbox: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<string>('CLOUD_COVER_STORM');
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);

  // Capacity Sizing State
  const [solarKw, setSolarKw] = useState<number>(150);
  const [windKw, setWindKw] = useState<number>(100);
  const [bessKwh, setBessKwh] = useState<number>(300);
  const [tariffInr, setTariffInr] = useState<number>(8.0);
  const [roiResult, setRoiResult] = useState<CapacitySizingResponse | null>(null);

  const runSimulation = async (scenario: string) => {
    try {
      let params: any = {
        scenario_type: scenario,
        solar_capacity_kw: 100.0,
        wind_capacity_kw: 100.0,
        battery_capacity_kwh: 200.0,
        initial_soc_pct: 65.0
      };

      if (scenario === 'CLOUD_COVER_STORM') {
        params.cloud_attenuation_pct = 80.0;
        params.wind_speed_multiplier = 1.35;
      } else if (scenario === 'WIND_DROUGHT') {
        params.wind_speed_multiplier = 0.20;
        params.cloud_attenuation_pct = 0.0;
      } else if (scenario === 'INDUSTRIAL_LOAD_SPIKE') {
        params.load_surge_multiplier = 1.85;
      } else if (scenario === 'GRID_BLACKOUT') {
        params.grid_outage_hours = [17, 18, 19, 20, 21, 22]; // 6h evening peak blackout
      } else if (scenario === 'HEATWAVE_DERATING') {
        params.ambient_temp_c = 46.0;
        params.load_surge_multiplier = 1.30;
      }

      const res = await apiClient.simulateScenario(params);
      setSimResult(res);
      setActiveScenario(scenario);
    } catch (e) {
      console.error('Error running what-if simulation:', e);
    }
  };

  const calculateRoi = async (s = solarKw, w = windKw, b = bessKwh, t = tariffInr) => {
    try {
      const res = await apiClient.calculateCapacitySizing({
        solar_kw: s,
        wind_kw: w,
        battery_kwh: b,
        grid_buy_tariff_inr: t
      });
      setRoiResult(res);
    } catch (e) {
      console.error('Error calculating ROI:', e);
    }
  };

  useEffect(() => {
    runSimulation('CLOUD_COVER_STORM');
    calculateRoi();
  }, []);

  const chartData = simResult?.timesteps.map((ts) => {
    const timeLabel = new Date(ts.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time: timeLabel,
      Solar: ts.solar_gen_kw,
      Wind: ts.wind_gen_kw,
      Demand: ts.demand_load_kw,
      BatterySOC: ts.battery_soc_pct,
      GridImport: ts.grid_import_kw,
      Unserved: ts.unserved_load_kw,
      GridAvailable: ts.grid_available ? 1 : 0
    };
  }) || [];

  return (
    <div className="space-y-8">
      
      {/* 1. What-If Scenario Stress Testing Sandbox */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
              <Box className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Physical Digital Twin & What-If Stress Testing Sandbox
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Physics Dynamic Simulator
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Stress-test microgrid stability, frequency deviation, and islanding survival against extreme injected events
              </p>
            </div>
          </div>
        </div>

        {/* Scenario Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          
          <button
            onClick={() => runSimulation('CLOUD_COVER_STORM')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeScenario === 'CLOUD_COVER_STORM'
                ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <CloudRain className="h-4 w-4 text-purple-400 mb-2" />
            <div className="text-xs font-bold">Cloud Storm</div>
            <div className="text-[10px] text-slate-400">80% Solar Drop + High Wind</div>
          </button>

          <button
            onClick={() => runSimulation('WIND_DROUGHT')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeScenario === 'WIND_DROUGHT'
                ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-md'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Wind className="h-4 w-4 text-cyan-400 mb-2" />
            <div className="text-xs font-bold">Wind Drought</div>
            <div className="text-[10px] text-slate-400">Calm Wind &lt; 2 m/s</div>
          </button>

          <button
            onClick={() => runSimulation('INDUSTRIAL_LOAD_SPIKE')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeScenario === 'INDUSTRIAL_LOAD_SPIKE'
                ? 'bg-amber-600/20 border-amber-500 text-white shadow-md'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Factory className="h-4 w-4 text-amber-400 mb-2" />
            <div className="text-xs font-bold">Load Surge</div>
            <div className="text-[10px] text-slate-400">+185% Industrial Peak</div>
          </button>

          <button
            onClick={() => runSimulation('GRID_BLACKOUT')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeScenario === 'GRID_BLACKOUT'
                ? 'bg-rose-600/20 border-rose-500 text-white shadow-md'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <ZapOff className="h-4 w-4 text-rose-400 mb-2" />
            <div className="text-xs font-bold">Grid Blackout</div>
            <div className="text-[10px] text-slate-400">6h Islanding Mode</div>
          </button>

          <button
            onClick={() => runSimulation('HEATWAVE_DERATING')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeScenario === 'HEATWAVE_DERATING'
                ? 'bg-orange-600/20 border-orange-500 text-white shadow-md'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Flame className="h-4 w-4 text-orange-400 mb-2" />
            <div className="text-xs font-bold">Heatwave</div>
            <div className="text-[10px] text-slate-400">46°C Cell Derating</div>
          </button>

        </div>

        {/* Resilience Summary Banner */}
        {simResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/20">
              <div className="text-xs text-slate-400 font-medium mb-1">Islanding Resilience Score</div>
              <div className="text-2xl font-bold font-mono text-purple-400">
                {simResult.islanding_resilience_score_pct.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Microgrid Autonomy Index</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/20">
              <div className="text-xs text-slate-400 font-medium mb-1">Blackout Survival Status</div>
              <div className="flex items-center gap-1.5 mt-1">
                {simResult.grid_outage_survived ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <span className="text-base font-bold text-emerald-400">PASSED (Zero Shedding)</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5 text-rose-400" />
                    <span className="text-base font-bold text-rose-400">LOAD SHED OCCURRED</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-500/20">
              <div className="text-xs text-slate-400 font-medium mb-1">Total Unserved Load</div>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {simResult.total_unserved_energy_kwh.toFixed(1)} kWh
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Deficit energy unmet</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/20">
              <div className="text-xs text-slate-400 font-medium mb-1">Battery Min/Max SOC</div>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {simResult.min_battery_soc_pct.toFixed(0)}% / {simResult.max_battery_soc_pct.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Safe Range: 15% - 95%</div>
            </div>

          </div>
        )}

        {/* 24-Hour Digital Twin Power Simulation Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="power" stroke="#6B7280" tick={{ fontSize: 11 }} unit=" kW" />
              <YAxis yAxisId="soc" orientation="right" stroke="#10B981" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              <Line yAxisId="power" type="monotone" dataKey="Solar" name="Solar Gen (kW)" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="Wind" name="Wind Gen (kW)" stroke="#06B6D4" strokeWidth={2.5} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="Demand" name="Campus Demand (kW)" stroke="#EC4899" strokeWidth={2} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="GridImport" name="Grid Import (kW)" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              
              {/* Unserved load red bars if any */}
              <Bar yAxisId="power" dataKey="Unserved" name="Unserved Load (kW)" fill="#EF4444" />

              {/* Battery SOC Trajectory Curve */}
              <Line yAxisId="soc" type="monotone" dataKey="BatterySOC" name="Battery SOC (%)" stroke="#10B981" strokeWidth={3} dot={{ r: 2 }} />

            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* 2. Virtual Plant Capacity Sizing & Financial ROI Sandbox */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Hybrid Plant Capacity Sizing & Financial ROI Sandbox
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LCOE & NPV Modeler
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Optimize Solar kWp, Wind kW, and BESS kWh sizing with real-time CAPEX, Levelized Cost of Energy, and Discounted Cash Flow NPV
              </p>
            </div>
          </div>
        </div>

        {/* Capacity Sizing Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Solar kW Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-amber-500/20">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-amber-400">Solar PV Capacity</span>
              <span className="font-mono font-bold text-white">{solarKw} kWp</span>
            </div>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={solarKw}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSolarKw(val);
                calculateRoi(val, windKw, bessKwh, tariffInr);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Wind kW Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/20">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-cyan-400">Wind Turbine Capacity</span>
              <span className="font-mono font-bold text-white">{windKw} kW</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={windKw}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setWindKw(val);
                calculateRoi(solarKw, val, bessKwh, tariffInr);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* BESS kWh Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-blue-500/20">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-blue-400">Battery BESS Capacity</span>
              <span className="font-mono font-bold text-white">{bessKwh} kWh</span>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={bessKwh}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setBessKwh(val);
                calculateRoi(solarKw, windKw, val, tariffInr);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Grid Tariff Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-teal-500/20">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-teal-400">Grid Buy Tariff</span>
              <span className="font-mono font-bold text-white">₹{tariffInr.toFixed(1)} / kWh</span>
            </div>
            <input
              type="range"
              min="4.0"
              max="15.0"
              step="0.5"
              value={tariffInr}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTariffInr(val);
                calculateRoi(solarKw, windKw, bessKwh, val);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

        </div>

        {/* ROI Results Cards */}
        {roiResult && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Total CAPEX</div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                ₹{(roiResult.total_capex_inr / 100000).toFixed(1)} L
              </div>
              <div className="text-[10px] text-slate-400">Installed Cost</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
              <div className="text-[11px] text-emerald-400">Payback Period</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                {roiResult.payback_period_years.toFixed(1)} Years
              </div>
              <div className="text-[10px] text-slate-400">Simple Payback</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20">
              <div className="text-[11px] text-amber-400">LCOE (Cost/kWh)</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                ₹{roiResult.lcoe_inr_per_kwh.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">Levelized Cost</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-indigo-500/20">
              <div className="text-[11px] text-indigo-400">10-Year NPV</div>
              <div className="text-lg font-bold font-mono text-indigo-400 mt-1">
                ₹{(roiResult.ten_year_npv_inr / 100000).toFixed(1)} L
              </div>
              <div className="text-[10px] text-slate-400">Discounted @ 8%</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-teal-500/20">
              <div className="text-[11px] text-teal-400">20-Year NPV</div>
              <div className="text-lg font-bold font-mono text-teal-400 mt-1">
                ₹{(roiResult.twenty_year_npv_inr / 100000).toFixed(1)} L
              </div>
              <div className="text-[10px] text-slate-400">Lifetime Wealth</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
              <div className="text-[11px] text-emerald-400">CO₂ Avoided</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                {roiResult.co2_abatement_tons_per_year.toFixed(0)} T/yr
              </div>
              <div className="text-[10px] text-slate-400">Carbon offset</div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
