import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Wrench,
  RefreshCw,
  Sun,
  Wind,
  BatteryCharging,
  Zap
} from 'lucide-react';
import { apiClient, AnomalyDiagnosticResponse } from '../../api/client';

export const AnomalyCenter: React.FC = () => {
  const [diag, setDiag] = useState<AnomalyDiagnosticResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getDiagnostics();
      setDiag(res);
    } catch (e) {
      console.error('Error fetching diagnostics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const getEquipmentIcon = (name: string) => {
    if (name.includes('Solar')) return <Sun className="h-4 w-4 text-amber-400" />;
    if (name.includes('Wind')) return <Wind className="h-4 w-4 text-cyan-400" />;
    if (name.includes('Battery') || name.includes('BESS')) return <BatteryCharging className="h-4 w-4 text-blue-400" />;
    return <Zap className="h-4 w-4 text-purple-400" />;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Overall Health Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-600 text-white shadow-lg shadow-rose-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Isolation Forest Anomaly Detection & Predictive Maintenance
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Physics-Residual Machine Learning
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Multivariate unsupervised outlier detection and physics-based residual degradation monitoring across microgrid assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Rescan Diagnostics</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {diag && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="glass-card rounded-xl p-4 border border-emerald-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Overall System Health Index</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {diag.overall_system_health_index_pct.toFixed(1)}%
              </span>
              <span className="text-xs font-semibold text-slate-300">/ 100%</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Status: OPTIMAL ASSET HEALTH</div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-amber-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Active Anomaly Alerts</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-400">
                {diag.active_anomaly_count}
              </span>
              <span className="text-xs font-medium text-slate-400">Alerts Detected</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">ML Outlier Confidence &gt; 90%</div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-rose-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Critical Fault Alerts</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-rose-400">
                {diag.critical_alerts_count}
              </span>
              <span className="text-xs font-medium text-slate-400">Action Required</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Zero Trip Protection Active</div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-purple-500/20">
            <div className="text-xs text-slate-400 font-medium mb-1">Telemetry Sensor Buses</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-purple-400">
                4 / 4
              </span>
              <span className="text-xs font-medium text-slate-400">Online</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">2 Hz Real-Time Sampling</div>
          </div>

        </div>
      )}

      {/* 3. Component Subsystem Health Matrix */}
      {diag && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Component Subsystem Health & Degradation Index
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {diag.equipment_health.map((eq, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEquipmentIcon(eq.equipment)}
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">{eq.equipment}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      eq.status === 'OPTIMAL' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      eq.status === 'DEGRADED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {eq.status}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold font-mono text-white">{eq.health_index_pct.toFixed(0)}%</span>
                    <span className="text-[10px] font-mono text-slate-400">MTBF: {eq.mtbf_hours_estimate}h</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${
                        eq.health_index_pct >= 90 ? 'bg-emerald-400' :
                        eq.health_index_pct >= 70 ? 'bg-amber-400' :
                        'bg-rose-400'
                      }`}
                      style={{ width: `${eq.health_index_pct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    {eq.key_degradation_factor}
                  </p>
                </div>

                <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                  <span>Last Service:</span>
                  <span>{eq.last_serviced_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Anomaly Alerts Stream */}
      {diag && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              Active Anomaly Alerts & Prescriptive Maintenance Recommendations
            </h3>
          </div>

          {diag.active_alerts.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
              <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-white">All Subsystems Operating Nominally</div>
              <p className="text-xs text-slate-400">
                Zero statistical anomalies or physical residual breaches detected across Solar, Wind, Battery, and Grid buses.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {diag.active_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-950/20 border-rose-500/40' :
                    alert.severity === 'WARNING' ? 'bg-amber-950/20 border-amber-500/40' :
                    'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        alert.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {alert.severity} • {(alert.confidence_score * 100).toFixed(0)}% Confidence
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{alert.id}</span>
                      <span className="text-xs font-semibold text-slate-300">• {alert.equipment}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {alert.anomaly_type.replace(/_/g, ' ')}
                    </h4>

                    <p className="text-xs text-slate-300">
                      <strong className="text-slate-400 font-medium">Root Cause: </strong>
                      {alert.root_cause_analysis}
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-emerald-300 flex items-start gap-2">
                      <Wrench className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-400">Prescriptive Action: </strong>
                        {alert.recommended_maintenance_action}
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end justify-between text-right font-mono text-xs text-slate-400 space-y-1">
                    <div>
                      <div>Detected: <strong className="text-white">{alert.detected_value}</strong></div>
                      <div>Nominal: {alert.expected_nominal_range}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
