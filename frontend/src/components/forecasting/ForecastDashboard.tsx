import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Sun,
  Wind,
  Factory,
  Zap,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { apiClient, ModelBenchmarkData, MultiDomainForecast } from '../../api/client';
import { ModelBenchmarkTable } from './ModelBenchmarkTable';

export const ForecastDashboard: React.FC = () => {
  const [forecast, setForecast] = useState<MultiDomainForecast | null>(null);
  const [benchmark, setBenchmark] = useState<ModelBenchmarkData | null>(null);
  const [activeModel, setActiveModel] = useState<string>('XGBoost_Quantile');
  const [activeDomain, setActiveDomain] = useState<'combined' | 'solar' | 'wind' | 'demand' | 'net'>('combined');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchForecastData = async (model: string) => {
    setLoading(true);
    try {
      const [fData, bData] = await Promise.all([
        apiClient.getMultiDomainForecast(model, 24),
        apiClient.getForecastBenchmark()
      ]);
      setForecast(fData);
      setBenchmark(bData);
    } catch (e) {
      console.error('Error fetching forecast data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData(activeModel);
  }, [activeModel]);

  // Assemble chart data
  const chartData = forecast?.solar.hourly_predictions.map((s, idx) => {
    const timeLabel = new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const w = forecast.wind.hourly_predictions[idx];
    const d = forecast.demand.hourly_predictions[idx];
    const net = forecast.net_load_p50[idx];

    return {
      time: timeLabel,
      Solar_P50: s.predicted_p50,
      Solar_P10: s.lower_bound_p10,
      Solar_P90: s.upper_bound_p90,
      Wind_P50: w?.predicted_p50 || 0,
      Wind_P10: w?.lower_bound_p10 || 0,
      Wind_P90: w?.upper_bound_p90 || 0,
      Demand_P50: d?.predicted_p50 || 0,
      Demand_P10: d?.lower_bound_p10 || 0,
      Demand_P90: d?.upper_bound_p90 || 0,
      NetLoad: net
    };
  }) || [];

  return (
    <div className="space-y-6">
      
      {/* Control Banner & Model Selector */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-lg shadow-amber-500/20">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                24-Hour Multi-Horizon AI Forecasting Center
              </h2>
              <p className="text-xs text-slate-400">
                Probabilistic generation and demand forecasting with confidence envelopes ($P_{10} - P_{90}$)
              </p>
            </div>
          </div>
        </div>

        {/* Model Selection Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            Model:
          </span>
          <button
            onClick={() => setActiveModel('XGBoost_Quantile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeModel === 'XGBoost_Quantile'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Quantile XGBoost
          </button>
          <button
            onClick={() => setActiveModel('PyTorch_BiLSTM_Attention')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeModel === 'PyTorch_BiLSTM_Attention'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            PyTorch Bi-LSTM
          </button>
          <button
            onClick={() => setActiveModel('Baseline_Seasonal_Naive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeModel === 'Baseline_Seasonal_Naive'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            24h Baseline
          </button>
        </div>
      </div>

      {/* Main Multi-Horizon Forecast Chart */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        
        {/* Domain View Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveDomain('combined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeDomain === 'combined'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Combined View
            </button>
            <button
              onClick={() => setActiveDomain('solar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeDomain === 'solar'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              Solar PV (P10-P90)
            </button>
            <button
              onClick={() => setActiveDomain('wind')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeDomain === 'wind'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400'
              }`}
            >
              <Wind className="h-3.5 w-3.5 text-cyan-400" />
              Wind Turbine (P10-P90)
            </button>
            <button
              onClick={() => setActiveDomain('demand')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeDomain === 'demand'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-pink-400'
              }`}
            >
              <Factory className="h-3.5 w-3.5 text-pink-400" />
              Campus Load (P10-P90)
            </button>
            <button
              onClick={() => setActiveDomain('net')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeDomain === 'net'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              Net Load Trajectory
            </button>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span>Horizon: 24h</span>
            <button
              onClick={() => fetchForecastData(activeModel)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              title="Refresh Forecast"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Chart Container */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} unit=" kW" />
              
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

              {/* Combined View */}
              {activeDomain === 'combined' && (
                <>
                  <Line type="monotone" dataKey="Solar_P50" name="Solar P50" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Wind_P50" name="Wind P50" stroke="#06B6D4" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Demand_P50" name="Demand P50" stroke="#EC4899" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="NetLoad" name="Net Load" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </>
              )}

              {/* Solar Specific View with P10/P90 Band */}
              {activeDomain === 'solar' && (
                <>
                  <Area type="monotone" dataKey="Solar_P90" name="Solar Upper (P90)" stroke="#F59E0B" strokeDasharray="3 3" fillOpacity={0.2} fill="#F59E0B" />
                  <Area type="monotone" dataKey="Solar_P10" name="Solar Lower (P10)" stroke="#F59E0B" strokeDasharray="3 3" fillOpacity={0.0} fill="#0B0F19" />
                  <Line type="monotone" dataKey="Solar_P50" name="Solar Forecast (P50)" stroke="#F59E0B" strokeWidth={3} dot={{ r: 2 }} />
                </>
              )}

              {/* Wind Specific View with P10/P90 Band */}
              {activeDomain === 'wind' && (
                <>
                  <Area type="monotone" dataKey="Wind_P90" name="Wind Upper (P90)" stroke="#06B6D4" strokeDasharray="3 3" fillOpacity={0.2} fill="#06B6D4" />
                  <Area type="monotone" dataKey="Wind_P10" name="Wind Lower (P10)" stroke="#06B6D4" strokeDasharray="3 3" fillOpacity={0.0} fill="#0B0F19" />
                  <Line type="monotone" dataKey="Wind_P50" name="Wind Forecast (P50)" stroke="#06B6D4" strokeWidth={3} dot={{ r: 2 }} />
                </>
              )}

              {/* Demand Specific View with P10/P90 Band */}
              {activeDomain === 'demand' && (
                <>
                  <Area type="monotone" dataKey="Demand_P90" name="Demand Upper (P90)" stroke="#EC4899" strokeDasharray="3 3" fillOpacity={0.2} fill="#EC4899" />
                  <Area type="monotone" dataKey="Demand_P10" name="Demand Lower (P10)" stroke="#EC4899" strokeDasharray="3 3" fillOpacity={0.0} fill="#0B0F19" />
                  <Line type="monotone" dataKey="Demand_P50" name="Demand Forecast (P50)" stroke="#EC4899" strokeWidth={3} dot={{ r: 2 }} />
                </>
              )}

              {/* Net Load Specific View */}
              {activeDomain === 'net' && (
                <Line type="monotone" dataKey="NetLoad" name="Net Load (Deficit/Surplus)" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
              )}

            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Model Benchmark Leaderboard Table */}
      <ModelBenchmarkTable benchmark={benchmark} loading={loading} />

    </div>
  );
};
