'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AlertsData, Coordinates, WeatherData } from '@/types';
import SummaryCard from '@/components/SummaryCard';
import ForecastTable from '@/components/ForecastTable';
import OperationsBriefingPanel from '@/components/OperationsBriefingPanel';
import RiskIntelligencePanel from '@/components/RiskIntelligencePanel';
import ForecastChangePanel from '@/components/ForecastChangePanel';
import EnsemblePanel from '@/components/EnsemblePanel';

const PRESCOTT: Coordinates = { lat: 34.54, lon: -112.4685, name: 'Prescott, Arizona, US' };

export default function PrescottPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const query = `lat=${PRESCOTT.lat}&lon=${PRESCOTT.lon}&name=${encodeURIComponent(PRESCOTT.name)}`;
      const [weatherRes, alertsRes] = await Promise.all([fetch(`/api/weather?${query}`), fetch(`/api/alerts?${query}`)]);
      if (!weatherRes.ok) { const body = await weatherRes.json(); throw new Error(body.error ?? `Weather API error ${weatherRes.status}`); }
      setWeather(await weatherRes.json());
      setAlerts(alertsRes.ok ? await alertsRes.json() : { location: PRESCOTT.name, alerts: [], fetchedAt: Date.now() });
      setLastFetch(Date.now());
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load Prescott weather'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return <div className="min-h-screen bg-[#0d1117] text-slate-200">
    <header className="border-b border-[#21262d] bg-[#0d1117] sticky top-0 z-10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-mono text-base font-semibold text-slate-100">WeatherOps · Prescott</h1><p className="text-[10px] font-mono text-slate-500 mt-0.5">Prescott campus weather and operational intelligence</p></div>
        <div className="flex flex-wrap items-center gap-2"><a href="/" className="px-3 py-1.5 text-xs font-mono border border-[#30363d] rounded text-slate-400 hover:text-slate-200">Daytona Beach</a><a href="/compare" className="px-3 py-1.5 text-xs font-mono border border-[#30363d] rounded text-slate-400 hover:text-slate-200">Compare Campuses</a><a href="/energy" className="px-3 py-1.5 text-xs font-mono border border-blue-800 rounded text-blue-300">Energy Outlook</a><a href="/documentation" className="px-3 py-1.5 text-xs font-mono border border-[#30363d] rounded text-slate-400">Documentation</a><button onClick={fetchData} disabled={loading} className="px-3 py-1.5 text-xs font-mono border border-[#30363d] rounded bg-[#21262d] disabled:opacity-40">{loading ? '⟳ Loading…' : '↺ Refresh'}</button></div>
      </div>
    </header>
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {loading && <div className="py-16 text-center text-slate-500 font-mono text-sm animate-pulse">Fetching Prescott forecast and risk data…</div>}
      {error && <div className="bg-red-900/20 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300 font-mono">{error}</div>}
      {weather && !loading && <>
        <section><div className="flex justify-between items-end mb-3"><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Current Conditions</div>{lastFetch && <span className="text-[10px] text-slate-600 font-mono">Updated {new Date(lastFetch).toLocaleTimeString()}</span>}</div><SummaryCard label="PRESCOTT" weather={weather} alerts={alerts} /></section>
        <section><OperationsBriefingPanel weather={[weather]} alerts={[alerts]} /></section>
        <section><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">Explainable Campus Risks</div><RiskIntelligencePanel weather={[weather]} /></section>
        <section><ForecastChangePanel weather={[weather]} /></section>
        <section><EnsemblePanel locations={[PRESCOTT]} /></section>
        <section><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">Prescott 7-Day Forecast</div><ForecastTable label="PRESCOTT" locationName={weather.location.name} forecasts={weather.daily} /></section>
      </>}
      <footer className="border-t border-[#21262d] pt-4 pb-6 text-[10px] text-slate-600 font-mono">Forecast: Open-Meteo · Alerts: National Weather Service · Campus location: Prescott, Arizona</footer>
    </main>
  </div>;
}
