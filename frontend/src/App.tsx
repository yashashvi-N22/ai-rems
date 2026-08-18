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

import { mockInitialTelemetry, mockInitialWeather, generateMockHistory } from './api/mockData';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [telemetry, setTelemetry] = useState<MicrogridLiveTelemetry>(mockInitialTelemetry);
  const [weather, setWeather] = useState<WeatherObservation>(mockInitialWeather);
  const [history, setHistory] = useState<MicrogridHistoryPoint[]>(() => generateMockHistory(50));
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [currentLocationName, setCurrentLocationName] = useState<string>('Hadapsar Clean Energy Hub, Pune');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Initialize data and WebSocket subscription
  useEffect(() => {
    let wsReceived = false;

    // 1. Initial REST fetch
    const initData = async () => {
      try {
        const [telData, weatherData, histData] = await Promise.all([
          apiClient.getLiveTelemetry(),
          apiClient.getCurrentWeather(),
          apiClient.getTelemetryHistory(50)
        ]);
        if (telData) setTelemetry(telData);
        if (weatherData) {
          setWeather(weatherData);
          if (weatherData.location_name) setCurrentLocationName(weatherData.location_name);
        }
        if (histData && histData.length > 0) setHistory(histData);
        setIsConnected(true);
      } catch (e) {
        console.warn('Backend REST unreachable, running in autonomous browser mode:', e);
      }
    };

    initData();

    // 2. Connect to WebSocket
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((payload) => {
      wsReceived = true;
      setIsConnected(true);
      if (payload.event === 'INITIAL_STATE' || payload.event === 'TELEMETRY_TICK' || payload.event === 'TELEMETRY_UPDATE') {
        setTelemetry(payload.data);
        if (payload.history) {
          setHistory(payload.history);
        }
      }
    });

    // 3. Fallback client-side live simulation if backend is not streaming
    const fallbackTicker = setInterval(() => {
      if (!wsReceived) {
        setTelemetry((prev) => {
          const delta = (Math.random() - 0.5) * 2;
          const s = Math.max(0, Math.min(100, (prev?.solar_generation_kw || 68.5) + delta));
          const w = Math.max(0, Math.min(100, (prev?.wind_generation_kw || 42.1) + delta * 0.8));
          const d = Math.max(40, Math.min(140, (prev?.demand_load_kw || 85.0) + delta * 0.5));
          const gen = s + w;
          const net = gen - d;
          const batt = net > 0 ? -Math.min(50, net) : Math.min(50, Math.abs(net));
          const gridIn = net < -50 ? Math.abs(net) - 50 : 0;
          const gridOut = net > 50 ? net - 50 : 0;

          const updated: MicrogridLiveTelemetry = {
            ...prev,
            timestamp: new Date().toISOString(),
            solar_generation_kw: parseFloat(s.toFixed(1)),
            wind_generation_kw: parseFloat(w.toFixed(1)),
            demand_load_kw: parseFloat(d.toFixed(1)),
            battery_power_kw: parseFloat(batt.toFixed(1)),
            battery_soc_pct: parseFloat(Math.min(95, Math.max(15, (prev?.battery_soc_pct || 68.4) + (batt < 0 ? 0.05 : -0.05))).toFixed(1)),
            grid_import_kw: parseFloat(gridIn.toFixed(1)),
            grid_export_kw: parseFloat(gridOut.toFixed(1)),
            renewable_fraction_pct: parseFloat((Math.min(100, (gen / d) * 100)).toFixed(1)),
            flow: {
              solar_to_load_kw: parseFloat(Math.min(s, d).toFixed(1)),
              solar_to_batt_kw: parseFloat(Math.max(0, s - d).toFixed(1)),
              solar_to_grid_kw: parseFloat((gridOut > 0 ? gridOut * 0.5 : 0).toFixed(1)),
              solar_curtailed_kw: 0.0,
              wind_to_load_kw: parseFloat(Math.min(w, Math.max(0, d - s)).toFixed(1)),
              wind_to_batt_kw: parseFloat(Math.max(0, w - Math.max(0, d - s)).toFixed(1)),
              wind_to_grid_kw: parseFloat((gridOut > 0 ? gridOut * 0.5 : 0).toFixed(1)),
              wind_curtailed_kw: 0.0,
              batt_to_load_kw: parseFloat((batt > 0 ? batt : 0).toFixed(1)),
              grid_to_load_kw: parseFloat(gridIn.toFixed(1)),
              grid_to_batt_kw: 0.0
            }
          };

          // Append to history
          setHistory((hPrev) => {
            const pt: MicrogridHistoryPoint = {
              timestamp: updated.timestamp,
              solar_kw: updated.solar_generation_kw,
              wind_kw: updated.wind_generation_kw,
              demand_kw: updated.demand_load_kw,
              battery_soc_pct: updated.battery_soc_pct,
              battery_power_kw: updated.battery_power_kw,
              grid_import_kw: updated.grid_import_kw,
              grid_export_kw: updated.grid_export_kw,
              renewable_fraction_pct: updated.renewable_fraction_pct
            };
            return [...hPrev.slice(-59), pt];
          });

          return updated;
        });
      }
    }, 2000);

    return () => {
      clearInterval(fallbackTicker);
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
