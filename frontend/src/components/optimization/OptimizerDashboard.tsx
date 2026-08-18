import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Cpu,
  Sliders,
  DollarSign,
  Leaf,
  BatteryCharging,
  RefreshCw,
  Table as TableIcon
} from 'lucide-react';
import { apiClient, OptimizationResponse } from '../../api/client';

export const OptimizerDashboard: React.FC = () => {
  const [optData, setOptData] = useState<OptimizationResponse | null>(null);
  const [costWeight, setCostWeight] = useState<number>(0.5);
  const [carbonWeight, setCarbonWeight] = useState<number>(0.3);
  const [batteryWeight, setBatteryWeight] = useState<number>(0.2);
  const [solving, setSolving] = useState<boolean>(false);

  const fetchSchedule = async (c = costWeight, carb = carbonWeight, batt = batteryWeight) => {
    try {
      const res = await apiClient.getOptimalSchedule(c, carb, batt, 24);
      setOptData(res);
    } catch (e) {
      console.error('Error fetching optimization schedule:', e);
    }
  };

  useEffect(() => {
    fetchSchedule(costWeight, carbonWeight, batteryWeight);
  }, []);

  const handleReoptimize = async () => {
    setSolving(true);
    try {
      const res = await apiClient.solveCustomOptimization({
        cost_weight: costWeight,
        carbon_weight: carbonWeight,
        battery_health_weight: batteryWeight
      });
      setOptData(res);
    } catch (e) {
      console.error('Error running custom optimization:', e);
    } finally {
      setSolving(false);
    }
  };

  const applyPreset = (c: number, carb: number, batt: number) => {
    setCostWeight(c);
    setCarbonWeight(carb);
    setBatteryWeight(batt);
    fetchSchedule(c, carb, batt);
  };

  // Transform schedule for 24h stacked power flow chart
  const chartData = optData?.schedule.map((item) => {
    const timeLabel = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      time: timeLabel,
      SolarDirect: item.solar_to_load_kw,
      WindDirect: item.wind_to_load_kw,
      BattDischarge: item.batt_discharge_to_load_kw,
      GridImport: item.grid_import_to_load_kw,
      SolarToBatt: item.solar_to_batt_kw,
      WindToBatt: item.wind_to_batt_kw,
      GridExport: item.solar_to_grid_kw + item.wind_to_grid_kw,
      Demand: item.demand_forecast_kw,
      BatterySOC: item.battery_soc_pct,
      Tariff: item.tariff_inr_kwh
    };
  }) || [];

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Multi-Objective Weight Controller */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Google OR-Tools Mixed-Integer Linear Optimizer (MILP)
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {optData?.kpis.solver_status || 'SOLVED (CBC)'} • {optData?.kpis.solve_time_ms.toFixed(1)} ms
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Multi-period lookahead optimal energy dispatch minimizing cost, emissions, and battery cycle degradation
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Sliders className="h-3 w-3 text-indigo-400" />
              Preset:
            </span>
            <button
              onClick={() => applyPreset(0.5, 0.3, 0.2)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
            >
              Balanced
            </button>
            <button
              onClick={() => applyPreset(0.8, 0.1, 0.1)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-all"
            >
              Max Cost Savings
            </button>
            <button
              onClick={() => applyPreset(0.1, 0.8, 0.1)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all"
            >
              Zero Carbon Focus
            </button>
            <button
              onClick={() => applyPreset(0.2, 0.2, 0.6)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-all"
            >
              Battery Longevity
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-800/80">
          
          {/* Cost Minimization Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-amber-500/20">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Cost Minimization Weight (α)
              </span>
              <span className="font-mono font-bold text-white">{(costWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={costWeight}
              onChange={(e) => setCostWeight(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Carbon Reduction Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/20">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Leaf className="h-3.5 w-3.5" />
                Carbon Reduction Weight (β)
              </span>
              <span className="font-mono font-bold text-white">{(carbonWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={carbonWeight}
              onChange={(e) => setCarbonWeight(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Battery Health Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/20">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <BatteryCharging className="h-3.5 w-3.5" />
                Battery Longevity Weight (γ)
              </span>
              <span className="font-mono font-bold text-white">{(batteryWeight * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={batteryWeight}
              onChange={(e) => setBatteryWeight(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

        </div>

        {/* Re-solve button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleReoptimize}
            disabled={solving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 font-semibold text-xs text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${solving ? 'animate-spin' : ''}`} />
            <span>{solving ? 'Solving MILP via OR-Tools...' : 'Run MILP Optimization Solver'}</span>
          </button>
        </div>

      </div>

      {/* 2. Side-by-Side Benchmark Performance Cards */}
      {optData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Financial Savings */}
          <div className="glass-card rounded-xl p-4 border border-amber-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Financial Cost Savings vs Baseline</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-400">
                ₹{optData.comparison_vs_baseline.cost_savings_inr.toFixed(0)}
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                (+{optData.comparison_vs_baseline.cost_savings_pct.toFixed(0)}% saved)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              MILP: ₹{optData.kpis.total_cost_inr.toFixed(0)} vs Rule: ₹{optData.comparison_vs_baseline.rule_based_cost_inr.toFixed(0)}
            </div>
          </div>

          {/* Carbon Emissions Avoided */}
          <div className="glass-card rounded-xl p-4 border border-emerald-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Total CO₂ Emissions Avoided</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {optData.kpis.total_co2_avoided_kg.toFixed(0)}
              </span>
              <span className="text-xs font-medium text-slate-400">kg CO₂</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Grid Emissions Cut: {optData.comparison_vs_baseline.co2_reduction_pct.toFixed(0)}%
            </div>
          </div>

          {/* Renewable Utilization */}
          <div className="glass-card rounded-xl p-4 border border-teal-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Renewable Self-Consumption</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-teal-400">
                {optData.kpis.renewable_utilization_pct.toFixed(0)}%
              </span>
              <span className="text-xs font-medium text-slate-400">of demand</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Grid Import: {optData.kpis.total_grid_import_kwh.toFixed(0)} kWh
            </div>
          </div>

          {/* Battery Equivalent Full Cycles */}
          <div className="glass-card rounded-xl p-4 border border-cyan-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Battery Degradation Metric</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {optData.kpis.battery_equivalent_full_cycles.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-slate-400">EFC / 24h</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Safe Operating Zone: 15% - 95%
            </div>
          </div>

        </div>
      )}

      {/* 3. 24-Hour Multi-Layer Power Dispatch Schedule Chart */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              24-Hour Receding Horizon Optimal Dispatch Schedule Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Hour-by-hour power allocation across Solar, Wind, Battery Storage, Demand, and Dynamic Time-of-Use Grid Tariffs
            </p>
          </div>
        </div>

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

              {/* Stacked Bars representing power delivered to load */}
              <Bar yAxisId="power" dataKey="SolarDirect" name="Solar to Load" stackId="load" fill="#F59E0B" />
              <Bar yAxisId="power" dataKey="WindDirect" name="Wind to Load" stackId="load" fill="#06B6D4" />
              <Bar yAxisId="power" dataKey="BattDischarge" name="Battery Discharge" stackId="load" fill="#3B82F6" />
              <Bar yAxisId="power" dataKey="GridImport" name="Grid Import" stackId="load" fill="#8B5CF6" />

              {/* Battery SOC Trajectory Curve */}
              <Line yAxisId="soc" type="monotone" dataKey="BatterySOC" name="Battery SOC (%)" stroke="#10B981" strokeWidth={3} dot={{ r: 2 }} />

              {/* Demand curve overlay */}
              <Line yAxisId="power" type="monotone" dataKey="Demand" name="Campus Demand" stroke="#EC4899" strokeWidth={2} strokeDasharray="3 3" dot={false} />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Detailed 24-Hour Dispatch Table */}
      {optData && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-cyan-400" />
              Hourly Dispatch Schedule Table (24 Timesteps)
            </h3>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 font-mono text-[10px] text-slate-400">
                <tr>
                  <th className="py-2 px-2">Hour</th>
                  <th className="py-2 px-2 text-right">Tariff (₹)</th>
                  <th className="py-2 px-2 text-right">Solar Gen</th>
                  <th className="py-2 px-2 text-right">Wind Gen</th>
                  <th className="py-2 px-2 text-right">Demand</th>
                  <th className="py-2 px-2 text-right">Solar→Load</th>
                  <th className="py-2 px-2 text-right">Wind→Load</th>
                  <th className="py-2 px-2 text-right">Batt→Load</th>
                  <th className="py-2 px-2 text-right">To Batt (Chg)</th>
                  <th className="py-2 px-2 text-right">Grid In</th>
                  <th className="py-2 px-2 text-right">Grid Out</th>
                  <th className="py-2 px-2 text-right">SOC (%)</th>
                  <th className="py-2 px-2 text-right">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                {optData.schedule.map((row) => {
                  const timeLabel = new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const totalChg = row.solar_to_batt_kw + row.wind_to_batt_kw + row.grid_import_to_batt_kw;
                  const totalExport = row.solar_to_grid_kw + row.wind_to_grid_kw;
                  const isPeak = row.tariff_inr_kwh > 9.0;

                  return (
                    <tr key={row.hour_index} className={isPeak ? 'bg-amber-950/20' : ''}>
                      <td className="py-2 px-2 font-sans font-medium text-white">{timeLabel}</td>
                      <td className={`py-2 px-2 text-right ${isPeak ? 'text-amber-400 font-bold' : ''}`}>
                        ₹{row.tariff_inr_kwh.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right text-amber-400">{row.solar_forecast_kw.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right text-cyan-400">{row.wind_forecast_kw.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right text-pink-400">{row.demand_forecast_kw.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right">{row.solar_to_load_kw.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right">{row.wind_to_load_kw.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right text-blue-400">{row.batt_discharge_to_load_kw.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right text-emerald-400">{totalChg.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right text-purple-400">{row.grid_import_to_load_kw.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right text-teal-400">{totalExport.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-400">{row.battery_soc_pct.toFixed(0)}%</td>
                      <td className="py-2 px-2 text-right font-bold text-white">₹{row.hourly_cost_inr.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
