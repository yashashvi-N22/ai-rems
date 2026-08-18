import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  Sparkles,
  Bot,
  Send,
  Sun,
  Wind,
  Factory,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { apiClient, ChatResponse } from '../../api/client';

export const XAICoPilot: React.FC = () => {
  // SHAP state
  const [domain, setDomain] = useState<'solar' | 'wind' | 'demand'>('solar');
  const [globalShap, setGlobalShap] = useState<any[]>([]);
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [localWaterfall, setLocalWaterfall] = useState<any | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'assistant',
      content: `👋 **Hello! I am your AI-REMS Operational Intelligence Co-Pilot.**

I have real-time visibility into live microgrid telemetry, Open-Meteo weather APIs, 24h probabilistic AI forecasts, Google OR-Tools MILP optimization schedules, and TreeSHAP feature attributions.

Ask me any question about system operations, dispatch decisions, or maintenance alerts!`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [groundedContext, setGroundedContext] = useState<Record<string, string>>({});
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "Why is the battery charging right now?",
    "How much money did the MILP optimizer save today?",
    "Explain active anomaly alerts and maintenance actions.",
    "What are the primary TreeSHAP drivers for solar generation?"
  ]);

  const fetchShapData = async (dom = domain, h = selectedHour) => {
    try {
      const [gData, lData] = await Promise.all([
        apiClient.getSHAPGlobalImportance(dom),
        apiClient.getSHAPLocalWaterfall(dom, h)
      ]);
      setGlobalShap(gData);
      setLocalWaterfall(lData);
    } catch (e) {
      console.error('Error fetching SHAP data:', e);
    }
  };

  useEffect(() => {
    fetchShapData(domain, selectedHour);
  }, [domain, selectedHour]);

  const handleSendMessage = async (customText?: string) => {
    const text = customText || inputPrompt;
    if (!text.trim()) return;

    const newHistory = [...messages, { role: 'user', content: text }];
    setMessages(newHistory);
    setInputPrompt('');
    setChatLoading(true);

    try {
      const res: ChatResponse = await apiClient.sendChatMessage(text, newHistory);
      setMessages([...newHistory, { role: 'assistant', content: res.response }]);
      setGroundedContext(res.grounded_context_used);
      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setSuggestedQuestions(res.suggested_followups);
      }
    } catch (e) {
      setMessages([...newHistory, {
        role: 'assistant',
        content: "⚠️ Unable to connect to Assistant endpoint. Please verify backend service status."
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const domainColors = {
    solar: '#F59E0B',
    wind: '#06B6D4',
    demand: '#EC4899'
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Grounded GenAI Operational Co-Pilot Section */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI-REMS Grounded Operational GenAI Co-Pilot
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Context-Grounded LLM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Natural language microgrid intelligence answering operator queries backed by live physics, MILP schedules & TreeSHAP drivers
              </p>
            </div>
          </div>
        </div>

        {/* Chat History & Grounded Context Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chat Box */}
          <div className="lg:col-span-2 flex flex-col justify-between h-[440px] bg-slate-900/90 rounded-xl border border-slate-800 p-4 space-y-4">
            
            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-300 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[85%] ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-200'
                  }`}>
                    <div className="whitespace-pre-wrap font-sans">
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono animate-pulse">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span>Synthesizing grounded engineering response...</span>
                </div>
              )}
            </div>

            {/* Suggested Followups */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(q)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Ask co-pilot about battery dispatch, solar peak, cost savings, or equipment alerts..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={chatLoading || !inputPrompt.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* Real-Time Grounded Context Panel */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Live Context Injection Grounding
              </h4>

              <div className="space-y-2.5 text-xs">
                {Object.entries(groundedContext).length > 0 ? (
                  Object.entries(groundedContext).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                      <div className="text-[10px] font-semibold uppercase text-indigo-400 font-mono">{k}</div>
                      <div className="text-slate-200 mt-0.5">{v}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
                    Context auto-injected: Live Gujarat weather station, 24h multi-quantile forecasts, OR-Tools MILP schedule, and Isolation Forest alerts.
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300">
              ⚡ <strong>100% Factually Grounded:</strong> GenAI responses are anchored strictly to real-time physical telemetry and mathematical MILP optimization equations.
            </div>

          </div>

        </div>

      </div>

      {/* 2. TreeSHAP Feature Attribution Section */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-lg shadow-amber-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                TreeSHAP (Shapley Additive exPlanations) Model Explainability
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Game-Theoretic Feature Attribution
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Global feature importance rankings & localized hourly waterfall attribution explaining why AI forecasts predict generation peaks or drops
              </p>
            </div>
          </div>

          {/* Domain Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setDomain('solar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                domain === 'solar'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Solar PV</span>
            </button>
            <button
              onClick={() => setDomain('wind')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                domain === 'wind'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wind className="h-3.5 w-3.5" />
              <span>Wind Turbine</span>
            </button>
            <button
              onClick={() => setDomain('demand')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                domain === 'demand'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Factory className="h-3.5 w-3.5" />
              <span>Campus Demand</span>
            </button>
          </div>
        </div>

        {/* Global vs Local Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Global Feature Importance */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Global TreeSHAP Feature Gain Importance ({domain.toUpperCase()})
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Mean |SHAP Value|</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={globalShap}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                  <XAxis type="number" stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis type="category" dataKey="feature" stroke="#6B7280" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="importance_pct" name="Contribution (%)" fill={domainColors[domain]}>
                    {globalShap.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={domainColors[domain]} opacity={1.0 - index * 0.08} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Local Waterfall Inspector */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Local Waterfall Hour Inspector (Hour {selectedHour}:00)
                </h4>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Hour:</span>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                    className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-xs font-mono font-bold text-white">{selectedHour}:00</span>
                </div>
              </div>

              {localWaterfall && (
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400 font-medium">Domain Base Value E[f(x)]:</span>
                    <span className="font-mono font-bold text-slate-300">{localWaterfall.base_value_kw} kW</span>
                  </div>

                  <div className="flex justify-between items-baseline p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400 font-medium">Final Predicted Output f(x):</span>
                    <span className="font-mono font-bold text-white text-sm">{localWaterfall.predicted_p50_kw} kW</span>
                  </div>

                  <div className="text-[10px] uppercase font-semibold text-slate-400 mt-3 mb-1.5">
                    Feature Impact Drivers at Hour {selectedHour}:00:
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {localWaterfall.drivers.map((d: any, i: number) => {
                      const isPos = d.shap_value > 0;
                      return (
                        <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-950/70 border border-slate-800/80 text-[11px]">
                          <div>
                            <span className="font-mono text-slate-200 font-semibold">{d.feature}</span>
                            <span className="text-slate-400 ml-1.5">({d.feature_value})</span>
                          </div>
                          <span className={`font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPos ? `+${d.shap_value.toFixed(1)}` : `${d.shap_value.toFixed(1)}`} kW
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              Positive values push the prediction higher than the seasonal baseline; negative values reduce expected generation.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
