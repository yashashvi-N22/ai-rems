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
  Zap,
  Trophy,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Bot
} from 'lucide-react';
import { apiClient, RLBenchmarkResponse } from '../../api/client';

export const RLDispatcher: React.FC = () => {
  const [benchmark, setBenchmark] = useState<RLBenchmarkResponse | null>(null);
  const [trajectory, setTrajectory] = useState<any[]>([]);
  const [runningSim, setRunningSim] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [bData, tData] = await Promise.all([
        apiClient.getRLBenchmark(),
        apiClient.runRLDispatch()
      ]);
      setBenchmark(bData);
      setTrajectory(tData);
    } catch (e) {
      console.error('Error fetching RL data:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunPolicy = async () => {
    setRunningSim(true);
    try {
      const res = await apiClient.runRLDispatch();
      setTrajectory(res);
    } catch (e) {
      console.error('Error executing PPO policy:', e);
    } finally {
      setRunningSim(false);
    }
  };

  const chartData = trajectory.map((step) => ({
    hour: `H${step.hour}`,
    BatteryPower: step.action_setpoint_kw,
    BatterySOC: step.battery_soc_pct,
    Demand: step.demand_kw,
    Renewables: step.solar_kw + step.wind_kw,
    Cost: step.hourly_cost_inr
  }));

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Proximal Policy Optimization (PPO) Reinforcement Learning
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Continuous Actor-Critic • 0.35 ms Latency
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Deep reinforcement learning policy trained via Gymnasium for sub-second real-time stochastic tariff arbitrage & power balancing
            </p>
          </div>
        </div>

        <button
          onClick={handleRunPolicy}
          disabled={runningSim}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs text-white shadow-lg shadow-cyan-600/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${runningSim ? 'animate-spin' : ''}`} />
          <span>{runningSim ? 'Inferring Policy...' : 'Execute 24h PPO Policy'}</span>
        </button>
      </div>

      {/* 2. 3-Way Benchmark Leaderboard */}
      {benchmark && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              3-Way Strategy Benchmark: Heuristic vs PPO RL vs Deterministic MILP
            </h3>
            <span className="text-xs font-mono text-slate-400">24-Hour Stochastic Benchmark</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                  <th className="pb-2 font-medium">Control Strategy</th>
                  <th className="pb-2 font-medium text-right">24h Cost (₹)</th>
                  <th className="pb-2 font-medium text-right">Cost Savings</th>
                  <th className="pb-2 font-medium text-right">CO₂ Emissions</th>
                  <th className="pb-2 font-medium text-right">Self-Consumption</th>
                  <th className="pb-2 font-medium text-right">Battery Cycles</th>
                  <th className="pb-2 font-medium text-right">Inference Speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {Object.entries(benchmark.strategies).map(([sName, strat]) => {
                  const isRL = sName === 'PPO_Reinforcement_Learning';
                  const isMILP = sName === 'MILP_Deterministic_Optimal';

                  return (
                    <tr
                      key={sName}
                      className={
                        isRL ? 'bg-cyan-950/20 text-cyan-300 font-semibold' :
                        isMILP ? 'bg-emerald-950/20 text-emerald-300 font-semibold' :
                        'text-slate-300'
                      }
                    >
                      <td className="py-3 font-sans flex items-center gap-1.5">
                        {isMILP && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        {isRL && <Bot className="h-3.5 w-3.5 text-cyan-400" />}
                        <span>{sName.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3 text-right">₹{strat.total_cost_inr.toFixed(2)}</td>
                      <td className="py-3 text-right text-emerald-400">
                        {strat.cost_savings_pct > 0 ? `+${strat.cost_savings_pct.toFixed(0)}%` : '0%'}
                      </td>
                      <td className="py-3 text-right">{strat.co2_emissions_kg.toFixed(1)} kg</td>
                      <td className="py-3 text-right">{strat.renewable_utilization_pct.toFixed(1)}%</td>
                      <td className="py-3 text-right">{strat.battery_full_cycles.toFixed(2)} EFC</td>
                      <td className="py-3 text-right font-bold text-amber-400">
                        {strat.inference_latency_ms < 1.0
                          ? `${(strat.inference_latency_ms * 1000).toFixed(0)} μs`
                          : `${strat.inference_latency_ms.toFixed(1)} ms`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Takeaways bullets */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Empirical Findings:
            </div>
            {benchmark.key_takeaways.map((note, i) => (
              <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Live PPO 24h Policy Action Trajectory */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              PPO Policy Real-Time Dispatch Trajectory (24 Timesteps)
            </h3>
            <p className="text-xs text-slate-400">
              Continuous battery action setpoint mapping state observations to optimal power flows
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="hour" stroke="#6B7280" tick={{ fontSize: 11 }} />
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

              <Bar yAxisId="power" dataKey="BatteryPower" name="PPO Battery Action (kW)" fill="#06B6D4" />
              <Line yAxisId="power" type="monotone" dataKey="Renewables" name="Total Renewables (kW)" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line yAxisId="power" type="monotone" dataKey="Demand" name="Campus Demand (kW)" stroke="#EC4899" strokeWidth={2} dot={false} />
              <Line yAxisId="soc" type="monotone" dataKey="BatterySOC" name="Battery SOC (%)" stroke="#10B981" strokeWidth={3} dot={{ r: 2 }} />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
