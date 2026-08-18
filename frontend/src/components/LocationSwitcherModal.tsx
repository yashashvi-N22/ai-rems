import React, { useEffect, useState } from 'react';
import { MapPin, X, Globe, Check, Navigation, Sparkles, RefreshCw } from 'lucide-react';
import { apiClient, LocationPreset } from '../api/client';
import { WeatherObservation } from '../types/microgrid';

interface LocationSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocationName: string;
  onLocationUpdated: (updatedWeather: WeatherObservation) => void;
}

export const LocationSwitcherModal: React.FC<LocationSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentLocationName,
  onLocationUpdated
}) => {
  const [presets, setPresets] = useState<LocationPreset[]>([]);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  
  // Custom inputs
  const [customName, setCustomName] = useState<string>('My Campus Hub, Pune');
  const [customLat, setCustomLat] = useState<number>(18.5204);
  const [customLon, setCustomLon] = useState<number>(73.8567);
  const [customAlt, setCustomAlt] = useState<number>(560);
  
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      apiClient.getLocationPresets().then((data) => {
        setPresets(data);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = async (preset: LocationPreset) => {
    setIsUpdating(true);
    setStatusMsg(`Connecting to Open-Meteo satellite feed for ${preset.name}...`);
    try {
      const res = await apiClient.setPlantLocation({
        location_name: preset.name,
        latitude: preset.latitude,
        longitude: preset.longitude,
        altitude_m: preset.altitude_m
      });
      onLocationUpdated(res);
      setStatusMsg(`✓ Plant location successfully updated to ${preset.name}!`);
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
      }, 1000);
    } catch (e) {
      console.error(e);
      setStatusMsg('⚠️ Error syncing weather for selected preset.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setIsUpdating(true);
    setStatusMsg(`Fetching real-time satellite irradiance for ${customName} (${customLat}, ${customLon})...`);
    try {
      const res = await apiClient.setPlantLocation({
        location_name: customName.trim(),
        latitude: customLat,
        longitude: customLon,
        altitude_m: customAlt
      });
      onLocationUpdated(res);
      setStatusMsg(`✓ Custom microgrid location active!`);
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
      }, 1000);
    } catch (e) {
      console.error(e);
      setStatusMsg('⚠️ Failed to fetch live weather for custom coordinates.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Microgrid Plant Location & Weather Grounding
            </h2>
            <p className="text-xs text-slate-400">
              Change the geographic location to pull real-time Open-Meteo satellite weather and adapt all AI forecasts & dispatch schedules
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'presets'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Featured National & Global Hubs</span>
          </button>
          
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'custom'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Navigation className="h-4 w-4" />
            <span>Custom Coordinates & Campus</span>
          </button>
        </div>

        {/* Status banner if updating */}
        {statusMsg && (
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 font-mono">
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Tab 1: Presets Grid */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map((preset) => {
              const isSelected = currentLocationName.toLowerCase().includes(preset.name.toLowerCase().split(' ')[0]);
              return (
                <div
                  key={preset.id}
                  onClick={() => !isUpdating && handleSelectPreset(preset)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <MapPin className={`h-4 w-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{preset.name}</span>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                        <Check className="h-3 w-3" /> ACTIVE
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[11px] text-slate-400 font-mono mb-2">
                    {preset.state_country} • {preset.latitude.toFixed(4)}° N, {preset.longitude.toFixed(4)}° E
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Coordinates Form */}
        {activeTab === 'custom' && (
          <form onSubmit={handleApplyCustom} className="space-y-4">
            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Plant / Campus Name
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. My College Campus Microgrid, Pune"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Latitude (°N)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={customLat}
                    onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                    placeholder="18.5204"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Longitude (°E)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={customLon}
                    onChange={(e) => setCustomLon(parseFloat(e.target.value))}
                    placeholder="73.8567"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Altitude (m)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customAlt}
                    onChange={(e) => setCustomAlt(parseFloat(e.target.value))}
                    placeholder="560"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isUpdating ? 'Synchronizing Weather...' : 'Apply & Sync Real-Time Weather'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
