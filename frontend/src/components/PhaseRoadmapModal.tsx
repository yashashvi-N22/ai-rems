import React from 'react';
import { X, CheckCircle2, Circle, Sparkles, Cpu } from 'lucide-react';

interface PhaseRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PHASES = [
  {
    phase: 'Phase 1',
    title: 'Full-Stack Foundation & Live Meteorological Ingestion',
    status: 'ACTIVE',
    items: [
      'FastAPI modular backend + async SQLAlchemy SQLite/TimescaleDB core',
      'Live Open-Meteo REST API integration for solar irradiance (GHI, DNI, DHI) and hub wind speed',
      'Real-time physical power flow calculation with first-principles energy balance',
      'Bi-directional WebSocket streaming engine syncing React client at 2Hz',
      'Modern dark-themed responsive dashboard with animated energy flow diagram'
    ]
  },
  {
    phase: 'Phase 2',
    title: 'Historical Datasets & AI/ML Forecasting Engine',
    status: 'NEXT',
    items: [
      'NREL NSRDB solar + NREL Wind Toolkit + ISO-NE demand feature engineering',
      'Progressive Model Zoo: Persistence Baseline → XGBoost / LightGBM Regressors',
      'Deep Learning PyTorch Bi-LSTM Seq2Seq with Multi-Head Attention',
      'Quantile loss prediction intervals (P10, P50, P90 uncertainty bounds)',
      'Standardized benchmark matrix (MAE, RMSE, MAPE, R², Skill Score)'
    ]
  },
  {
    phase: 'Phase 3',
    title: 'Real-Time Multi-Horizon Forecasting Integration',
    status: 'PLANNED',
    items: [
      'Continuous background inference pipeline generating rolling 24h forecasts',
      'Automated feature vector assembly from live weather telemetry',
      'Hypertable persistence of predictions and probabilistic confidence envelopes'
    ]
  },
  {
    phase: 'Phase 4',
    title: 'Battery & Mixed-Integer Linear Optimization (MILP)',
    status: 'PLANNED',
    items: [
      'Google OR-Tools MILP solver with HiGHS/CBC optimization engine',
      'Multi-objective cost, carbon emissions, and battery degradation minimization',
      '24-hour lookahead receding horizon schedule with dynamic ToU grid tariffs'
    ]
  },
  {
    phase: 'Phase 5',
    title: 'Physical Digital Twin & What-If Sandbox',
    status: 'PLANNED',
    items: [
      'Single-diode PV with thermal derating, wind Betz power curve, BESS ECM circuit',
      'Interactive sandbox sliders (-40% solar drop, +25% load surge, +50% tariff)',
      'Instantaneous contingency re-optimization and financial/carbon delta reports'
    ]
  },
  {
    phase: 'Phase 6',
    title: 'Anomaly Detection & Predictive Maintenance',
    status: 'PLANNED',
    items: [
      'Unsupervised Isolation Forest + dynamic 3-sigma residual tracking',
      'Detection of PV string failure, inverter clipping, battery thermal runaway',
      'Asset health scores and Remaining Useful Life (RUL) estimations'
    ]
  },
  {
    phase: 'Phase 7',
    title: 'Reinforcement Learning (RL) Smart Dispatcher',
    status: 'PLANNED',
    items: [
      'Custom Gymnasium microgrid simulation environment',
      'Stable-Baselines3 PPO/SAC continuous action policy training',
      'Benchmarking RL adaptive strategies against MILP deterministic optimal'
    ]
  },
  {
    phase: 'Phase 8',
    title: 'Explainable AI (SHAP) & Grounded GenAI Co-Pilot',
    status: 'PLANNED',
    items: [
      'TreeSHAP feature importance and local decision attribution waterfall charts',
      'Conversational AI Energy Assistant with strict deterministic tool/function calling',
      'Zero hallucination natural language reasoning over actual backend telemetry'
    ]
  },
  {
    phase: 'Phase 9',
    title: 'SIH Competition Packaging & Production Deployment',
    status: 'PLANNED',
    items: [
      'Docker Compose orchestration (FastAPI, React, TimescaleDB, Redis)',
      'Automated integration test suites and stress benchmarking',
      'Live judge demonstration scenario presets and presentation toolkit'
    ]
  }
];

export const PhaseRoadmapModal: React.FC<PhaseRoadmapModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F172A] border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                AI-REMS Master Architecture & Phased Roadmap
              </h3>
              <p className="text-xs text-slate-400">
                Smart India Hackathon (SIH) Hybrid Renewable Energy Solution Specification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* SIH Alignment Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-blue-950/40 border border-emerald-500/30 flex items-start gap-3.5">
            <Sparkles className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-emerald-300">
                SIH Problem Alignment: SIH25105, AG343, SIH1296
              </div>
              <div>
                AI-REMS is engineered from first principles as a real-time, software-only intelligent energy operating system. Live API meteorological inputs are combined with physics models and deep optimization to minimize carbon emissions, prevent battery degradation, and eliminate grid reliance.
              </div>
            </div>
          </div>

          {/* Phases Grid */}
          <div className="space-y-4">
            {PHASES.map((p, idx) => {
              const isActive = p.status === 'ACTIVE';
              const isNext = p.status === 'NEXT';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : isNext
                      ? 'bg-cyan-950/10 border-cyan-500/30'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      {isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-500" />
                      )}
                      <span className="text-sm font-bold text-white">{p.phase}: {p.title}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                        : isNext
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2.5 text-xs text-slate-300 pl-6 list-disc marker:text-emerald-400">
                    {p.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Phase 1 is currently LIVE & operational
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/20"
          >
            Close Roadmap
          </button>
        </div>

      </div>
    </div>
  );
};
