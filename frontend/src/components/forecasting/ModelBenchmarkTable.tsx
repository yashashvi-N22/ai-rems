import React from 'react';
import { Trophy, CheckCircle2, Sparkles } from 'lucide-react';
import { ModelBenchmarkData } from '../../api/client';

interface ModelBenchmarkTableProps {
  benchmark: ModelBenchmarkData | null;
  loading: boolean;
}

export const ModelBenchmarkTable: React.FC<ModelBenchmarkTableProps> = ({ benchmark, loading }) => {
  if (loading || !benchmark) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-slate-800 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
        <div className="h-40 bg-slate-900/60 rounded-xl" />
      </div>
    );
  }

  const domainList = [
    { key: 'solar', title: 'Solar PV Generation (kW)', color: 'text-amber-400', border: 'border-amber-500/30' },
    { key: 'wind', title: 'Wind Turbine Generation (kW)', color: 'text-cyan-400', border: 'border-cyan-500/30' },
    { key: 'demand', title: 'Campus Load Demand (kW)', color: 'text-pink-400', border: 'border-pink-500/30' }
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            AI/ML Multi-Model Empirical Evaluation Leaderboard
          </h2>
          <p className="text-xs text-slate-400">
            Hold-out test period benchmark across 1,314 hours comparing Baseline, XGBoost, and PyTorch Bi-LSTM
          </p>
        </div>
        <div className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
          N = 8,760h • 70/15/15 Chronological Split
        </div>
      </div>

      {/* Domain Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {domainList.map(({ key, title, color, border }) => {
          const dom = benchmark.domains[key];
          if (!dom) return null;

          return (
            <div key={key} className={`p-4 rounded-xl bg-slate-900/80 border ${border} flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${color}`}>{title}</h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Mean: {dom.mean_actual_kw} kW
                  </span>
                </div>

                {/* Metrics Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                        <th className="pb-2 font-medium">Model</th>
                        <th className="pb-2 font-medium text-right">MAE</th>
                        <th className="pb-2 font-medium text-right">RMSE</th>
                        <th className="pb-2 font-medium text-right">R²</th>
                        <th className="pb-2 font-medium text-right">Skill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {Object.entries(dom.models).map(([mName, m]) => {
                        const isWinner = mName === 'XGBoost_Quantile';
                        return (
                          <tr key={mName} className={isWinner ? 'bg-emerald-500/10 text-emerald-300 font-semibold' : 'text-slate-300'}>
                            <td className="py-2 pr-1 font-sans flex items-center gap-1">
                              {isWinner && <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
                              <span className="truncate max-w-[90px]" title={mName}>
                                {mName.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2 text-right">{m.mae.toFixed(1)}</td>
                            <td className="py-2 text-right">{m.rmse.toFixed(1)}</td>
                            <td className="py-2 text-right">{m.r2_score.toFixed(2)}</td>
                            <td className="py-2 text-right text-emerald-400">
                              {m.skill_score_pct > 0 ? `+${m.skill_score_pct.toFixed(0)}%` : '0%'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Feature Drivers */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Key Feature Drivers (Gain Importance)
                </div>
                <div className="flex flex-wrap gap-1">
                  {dom.top_feature_drivers.slice(0, 4).map((f, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {f.feature} ({(f.importance * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
