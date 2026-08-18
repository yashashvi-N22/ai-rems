import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity } from 'lucide-react';
import { MicrogridHistoryPoint } from '../types/microgrid';

interface PowerChartProps {
  history: MicrogridHistoryPoint[];
}

export const PowerChart: React.FC<PowerChartProps> = ({ history }) => {
  const chartData = history.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    Solar: p.solar_kw,
    Wind: p.wind_kw,
    Demand: p.demand_kw,
    BatterySOC: p.battery_soc_pct,
    GridImport: p.grid_import_kw,
  }));

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            Real-Time Microgrid Dynamic Telemetry Chart
          </h2>
          <p className="text-xs text-slate-400">
            Streaming temporal trajectory of renewable generation, campus demand, and grid balance
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Points: <span className="text-emerald-400 font-semibold">{chartData.length}</span>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EC4899" stopOpacity={0.0} />
              </linearGradient>
            </defs>

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

            <Area
              type="monotone"
              dataKey="Solar"
              stroke="#F59E0B"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSolar)"
            />
            <Area
              type="monotone"
              dataKey="Wind"
              stroke="#06B6D4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorWind)"
            />
            <Area
              type="monotone"
              dataKey="Demand"
              stroke="#EC4899"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDemand)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
