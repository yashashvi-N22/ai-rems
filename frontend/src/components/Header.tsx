import React from 'react';
import { Zap, Globe, Layers, Activity, TrendingUp, Sliders, Box, ShieldAlert, Bot, Sparkles } from 'lucide-react';
import { MicrogridLiveTelemetry } from '../types/microgrid';

export type TabType = 'overview' | 'forecasting' | 'optimizer' | 'digitaltwin' | 'anomalies' | 'rl' | 'xai';

interface HeaderProps {
  telemetry: MicrogridLiveTelemetry | null;
  isConnected: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenRoadmap: () => void;
  onOpenLocationSwitcher: () => void;
  currentLocationName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  isConnected,
  activeTab,
  onTabChange,
  onOpenRoadmap,
  onOpenLocationSwitcher,
  currentLocationName = "Hadapsar, Pune"
}) => {
  const formattedTime = telemetry?.timestamp
    ? new Date(telemetry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <header className="border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AI-REMS
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0 • SIH Stage
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              AI-Driven Real-Time Hybrid Renewable Energy Intelligence & Optimization
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onTabChange('overview')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>1. Overview</span>
          </button>
          
          <button
            onClick={() => onTabChange('forecasting')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'forecasting'
                ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>2. Forecast</span>
          </button>

          <button
            onClick={() => onTabChange('optimizer')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'optimizer'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>3. MILP</span>
          </button>

          <button
            onClick={() => onTabChange('digitaltwin')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'digitaltwin'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>4. Digital Twin</span>
          </button>

          <button
            onClick={() => onTabChange('anomalies')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'anomalies'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>5. Health</span>
          </button>

          <button
            onClick={() => onTabChange('rl')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'rl'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>6. RL Agent</span>
          </button>

          <button
            onClick={() => onTabChange('xai')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'xai'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>7. XAI & Co-Pilot</span>
          </button>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenLocationSwitcher}
            title="Click to change microgrid plant location or enter custom coordinates"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-xs text-slate-200 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-semibold truncate max-w-[120px]">
              {currentLocationName.split(',')[0]}
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">📍 Edit</span>
          </button>

          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span>{isConnected ? 'LIVE' : 'CONN'}</span>
            <span className="text-slate-400 font-mono font-normal ml-0.5">({formattedTime})</span>
          </div>

          <button
            onClick={onOpenRoadmap}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition-all hover:scale-105 active:scale-95"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Roadmap</span>
          </button>
        </div>

      </div>
    </header>
  );
};
