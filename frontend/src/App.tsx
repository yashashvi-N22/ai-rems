import React, { useEffect, useState } from 'react';
import { Header, TabType } from './components/Header';
import { KPICards } from './components/KPICards';
import { LiveEnergyFlow } from './components/LiveEnergyFlow';
import { WeatherStation } from './components/WeatherStation';
import { PowerChart } from './components/PowerChart';
import { ForecastDashboard } from './components/forecasting/ForecastDashboard';
import { OptimizerDashboard } from './components/optimization/OptimizerDashboard';
import { DigitalTwinSandbox } from './components/digitaltwin/DigitalTwinSandbox';
import { AnomalyCenter } from './components/anomalies/AnomalyCenter';
import { RLDispatcher } from './components/rl/RLDispatcher';
import { XAICoPilot } from './components/xai/XAICoPilot';
import { PhaseRoadmapModal } from './components/PhaseRoadmapModal';
import { LocationSwitcherModal } from './components/LocationSwitcherModal';
import { MicrogridLiveTelemetry, WeatherObservation, MicrogridHistoryPoint } from './types/microgrid';
import { apiClient } from './api/client';
import { wsClient } from './api/websocket';
import { ShieldCheck, RefreshCw, MapPin } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [telemetry, setTelemetry] = useState<MicrogridLiveTelemetry | null>(null);
  const [weather, setWeather] = useState<WeatherObservation | null>(null);
  const [history, setHistory] = useState<MicrogridHistoryPoint[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [currentLocationName, setCurrentLocationName] = useState<string>('Hadapsar Clean Energy Hub, Pune');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Initialize data and WebSocket subscription
  useEffect(() => {
    // 1. Initial REST fetch
    const initData = async () => {
      try {
        const [telData, weatherData, histData] = await Promise.all([
          apiClient.getLiveTelemetry(),
          apiClient.getCurrentWeather(),
          apiClient.getTelemetryHistory(50)
        ]);
        setTelemetry(telData);
        setWeather(weatherData);
        if (weatherData?.location_name) {
          setCurrentLocationName(weatherData.location_name);
        }
        setHistory(histData);
        setIsConnected(true);
      } catch (e) {
        console.error('Error fetching initial REST data:', e);
      }
    };

    initData();

    // 2. Connect to WebSocket
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((payload) => {
      setIsConnected(true);
      if (payload.event === 'INITIAL_STATE' || payload.event === 'TELEMETRY_TICK' || payload.event === 'TELEMETRY_UPDATE') {
        setTelemetry(payload.data);
        if (payload.history) {
          setHistory(payload.history);
        } else {
          // Append point to history
          setHistory((prev) => {
            const newPoint: MicrogridHistoryPoint = {
              timestamp: payload.data.timestamp,
              solar_kw: payload.data.solar_generation_kw,
              wind_kw: payload.data.wind_generation_kw,
              demand_kw: payload.data.demand_load_kw,
              battery_soc_pct: payload.data.battery_soc_pct,
              battery_power_kw: payload.data.battery_power_kw,
              grid_import_kw: payload.data.grid_import_kw,
              grid_export_kw: payload.data.grid_export_kw,
              renewable_fraction_pct: payload.data.renewable_fraction_pct
            };
            const updated = [...prev, newPoint];
            return updated.slice(-60);
          });
        }
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [tel, w] = await Promise.all([
        apiClient.getLiveTelemetry(),
        apiClient.getCurrentWeather()
      ]);
      setTelemetry(tel);
      setWeather(w);
      if (w?.location_name) {
        setCurrentLocationName(w.location_name);
      }
    } catch (e) {
      console.error('Manual refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLocationUpdated = (updatedWeather: any) => {
    setWeather(updatedWeather);
    if (updatedWeather?.location_name) {
      setCurrentLocationName(updatedWeather.location_name);
    }
    handleManualRefresh();
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* Top Navigation Header */}
      <Header
        telemetry={telemetry}
        isConnected={isConnected}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRoadmap={() => setIsRoadmapOpen(true)}
        onOpenLocationSwitcher={() => setIsLocationModalOpen(true)}
        currentLocationName={currentLocationName}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Control Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">
              Microgrid Plant: <strong className="text-white">{currentLocationName}</strong> (100 kW Solar + 100 kW Wind + 200 kWh BESS)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-xs font-semibold text-cyan-300 transition-all active:scale-95 shadow-sm"
            >
              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
              <span>Change Location / Custom GPS</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Polling API...' : 'Poll Open-Meteo'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Live Overview View */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <KPICards telemetry={telemetry} />
            <LiveEnergyFlow telemetry={telemetry} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PowerChart history={history} />
              <WeatherStation weather={weather} />
            </div>
          </div>
        )}

        {/* Tab 2: AI Forecasting & Benchmark View (Phase 2) */}
        {activeTab === 'forecasting' && (
          <div className="animate-fade-in">
            <ForecastDashboard />
          </div>
        )}

        {/* Tab 3: Smart Energy Optimizer & MILP Schedule View (Phase 4) */}
        {activeTab === 'optimizer' && (
          <div className="animate-fade-in">
            <OptimizerDashboard />
          </div>
        )}

        {/* Tab 4: Physical Digital Twin & What-If Sandbox (Phase 5) */}
        {activeTab === 'digitaltwin' && (
          <div className="animate-fade-in">
            <DigitalTwinSandbox />
          </div>
        )}

        {/* Tab 5: Anomaly Detection & Predictive Maintenance (Phase 6) */}
        {activeTab === 'anomalies' && (
          <div className="animate-fade-in">
            <AnomalyCenter />
          </div>
        )}

        {/* Tab 6: PPO Reinforcement Learning Smart Dispatcher (Phase 7) */}
        {activeTab === 'rl' && (
          <div className="animate-fade-in">
            <RLDispatcher />
          </div>
        )}

        {/* Tab 7: TreeSHAP Explainable AI & Grounded GenAI Co-Pilot (Phase 8) */}
        {activeTab === 'xai' && (
          <div className="animate-fade-in">
            <XAICoPilot />
          </div>
        )}

      </main>

      {/* Footer / System Status */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>AI-REMS Platform • SIH Hybrid Renewable Energy Generation Solution</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-emerald-400">Phases 1 - 9 [ACTIVE & COMPLETE]</span>
            <button
              onClick={() => setIsRoadmapOpen(true)}
              className="text-emerald-400 hover:underline font-semibold"
            >
              View Full 9-Phase Roadmap
            </button>
          </div>
        </div>
      </footer>

      {/* Phase Roadmap Modal */}
      <PhaseRoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
      />

      {/* Dynamic Location Switcher Modal */}
      <LocationSwitcherModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocationName={currentLocationName}
        onLocationUpdated={handleLocationUpdated}
      />

    </div>
  );
};
export default App;
