'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Coordinates, WeatherData, AlertsData } from '@/types';
import LocationInput from '@/components/LocationInput';
import SummaryCard from '@/components/SummaryCard';
import ForecastTable from '@/components/ForecastTable';
import WeatherCharts from '@/components/WeatherCharts';
import AlertsPanel from '@/components/AlertsPanel';
import EnergyMetricsPanel from '@/components/EnergyMetricsPanel';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg h-[480px] flex items-center justify-center">
      <span className="text-slate-600 font-mono text-xs">Loading map…</span>
    </div>
  ),
});

const DEFAULT_LOC1: Coordinates = { lat: 34.5400, lon: -112.4685, name: 'Prescott, Arizona, US' };
const DEFAULT_LOC2: Coordinates = { lat: 29.2108, lon: -81.0228, name: 'Daytona Beach, Florida, US' };

interface DashboardData {
  weather: WeatherData | null;
  alerts: AlertsData | null;
  loading: boolean;
  error: string | null;
}

const emptyData = (): DashboardData => ({ weather: null, alerts: null, loading: false, error: null });

export default function DashboardPage() {
  const [loc1, setLoc1] = useState<Coordinates>(DEFAULT_LOC1);
  const [loc2, setLoc2] = useState<Coordinates>(DEFAULT_LOC2);
  const [data1, setData1] = useState<DashboardData>(emptyData());
  const [data2, setData2] = useState<DashboardData>(emptyData());
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const fetchDataForLocation = useCallback(
    async (coords: Coordinates, setData: (d: DashboardData) => void) => {
      setData({ weather: null, alerts: null, loading: true, error: null });
      try {
        const [weatherRes, alertsRes] = await Promise.all([
          fetch(`/api/weather?lat=${coords.lat}&lon=${coords.lon}&name=${encodeURIComponent(coords.name)}`),
          fetch(`/api/alerts?lat=${coords.lat}&lon=${coords.lon}&name=${encodeURIComponent(coords.name)}`),
        ]);

        if (!weatherRes.ok) {
          const err = await weatherRes.json();
          throw new Error(err.error ?? `Weather API error ${weatherRes.status}`);
        }

        const weather: WeatherData = await weatherRes.json();
        const alerts: AlertsData = alertsRes.ok
          ? await alertsRes.json()
          : { location: coords.name, alerts: [], fetchedAt: Date.now() };

        setData({ weather, alerts, loading: false, error: null });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setData({ weather: null, alerts: null, loading: false, error: msg });
      }
    },
    []
  );

  const fetchAll = useCallback(async () => {
    setGlobalError(null);
    await Promise.all([
      fetchDataForLocation(loc1, setData1),
      fetchDataForLocation(loc2, setData2),
    ]);
    setLastFetch(Date.now());
  }, [loc1, loc2, fetchDataForLocation]);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocResolved = useCallback(
    (which: 1 | 2) => (coords: Coordinates) => {
      if (which === 1) setLoc1(coords); else setLoc2(coords);
    }, []
  );

  const handleLocError = useCallback(
    (which: 1 | 2) => (msg: string) => {
      if (which === 1) setData1(d => ({ ...d, error: msg }));
      else setData2(d => ({ ...d, error: msg }));
    }, []
  );

  const isLoading = data1.loading || data2.loading;
  const bothReady = !!data1.weather && !!data2.weather;

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200">
      {/* ── Header ── */}
      <header className="border-b border-[#21262d] bg-[#0d1117] sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-base font-semibold text-slate-100 tracking-tight">WeatherOps</h1>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 tracking-wide">
              Energy management console · Temp · Humidity · Enthalpy · Solar · ET₀ · Degree Days · NWS Alerts
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-[10px] font-mono text-slate-600 hidden sm:block">
                Updated {new Date(lastFetch).toLocaleTimeString()}
              </span>
            )}
            <button onClick={fetchAll} disabled={isLoading}
              className="px-3 py-1.5 text-xs font-mono border border-[#30363d] rounded bg-[#21262d]
                text-slate-400 hover:text-slate-200 hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {isLoading ? '⟳ Loading…' : '↺ Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Location inputs ── */}
        <section className="bg-[#161b22] border border-[#21262d] rounded-lg p-4">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">Locations</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <LocationInput label="Location 1" placeholder="e.g. Baltimore, MD or 39.29,-76.61"
                onResolved={handleLocResolved(1)} onError={handleLocError(1)} resolved={loc1} accentColor="blue" />
              {data1.error && <p className="mt-1 text-xs text-red-400 font-mono">{data1.error}</p>}
            </div>
            <div>
              <LocationInput label="Location 2" placeholder="e.g. Austin, TX or 30.26,-97.74"
                onResolved={handleLocResolved(2)} onError={handleLocError(2)} resolved={loc2} accentColor="red" />
              {data2.error && <p className="mt-1 text-xs text-red-400 font-mono">{data2.error}</p>}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#21262d]">
            <button onClick={fetchAll} disabled={isLoading}
              className="px-4 py-2 text-xs font-mono font-medium rounded bg-blue-600 hover:bg-blue-500
                text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {isLoading ? 'Fetching…' : 'Fetch Weather for Both Locations'}
            </button>
          </div>
        </section>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <span className="animate-pulse text-slate-500 font-mono text-sm">
              Fetching forecast + season-to-date data…
            </span>
          </div>
        )}

        {globalError && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300 font-mono">
            {globalError}
          </div>
        )}

        {/* ── Current conditions ── */}
        {(data1.weather || data2.weather) && !isLoading && (
          <section>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">Current Conditions</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data1.weather
                ? <SummaryCard label="LOC 1" weather={data1.weather} alerts={data1.alerts} />
                : data1.error ? <ErrorCard label="LOC 1" error={data1.error} /> : null}
              {data2.weather
                ? <SummaryCard label="LOC 2" weather={data2.weather} alerts={data2.alerts} />
                : data2.error ? <ErrorCard label="LOC 2" error={data2.error} /> : null}
            </div>
          </section>
        )}

        {/* ── Energy manager summary ── */}
        {bothReady && !isLoading && (
          <section>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">
              Energy Manager Summary
            </div>
            <EnergyMetricsPanel
              weather1={data1.weather!}
              weather2={data2.weather!}
              loc1Name={loc1.name}
              loc2Name={loc2.name}
            />
          </section>
        )}

        {/* ── Radar + map ── */}
        {bothReady && <LocationMap loc1={loc1} loc2={loc2} />}

        {/* ── Charts ── */}
        {bothReady && (
          <section>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">
              7-Day Forecast Charts
            </div>
            <WeatherCharts
              loc1Forecasts={data1.weather!.daily}
              loc2Forecasts={data2.weather!.daily}
              loc1Name={loc1.name}
              loc2Name={loc2.name}
            />
          </section>
        )}

        {/* ── Forecast tables ── */}
        {(data1.weather || data2.weather) && !isLoading && (
          <section>
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">
              7-Day Forecast Tables
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data1.weather && (
                <ForecastTable label="LOC 1" locationName={data1.weather.location.name} forecasts={data1.weather.daily} />
              )}
              {data2.weather && (
                <ForecastTable label="LOC 2" locationName={data2.weather.location.name} forecasts={data2.weather.daily} />
              )}
            </div>
          </section>
        )}

        {/* ── Alerts ── */}
        {(data1.alerts || data2.alerts) && !isLoading && (
          <AlertsPanel alerts1={data1.alerts} alerts2={data2.alerts} loc1Name={loc1.name} loc2Name={loc2.name} />
        )}

        {/* ── Footer ── */}
        <footer className="border-t border-[#21262d] pt-4 pb-6 text-[10px] text-slate-600 font-mono space-y-1">
          <p>
            Forecast: <a href="https://open-meteo.com" className="text-slate-500 hover:text-slate-400">Open-Meteo</a> ·
            Historical: Open-Meteo ERA5 archive ·
            Alerts: <a href="https://api.weather.gov" className="text-slate-500 hover:text-slate-400">NWS</a> (US only) ·
            Radar: <a href="https://www.rainviewer.com" className="text-slate-500 hover:text-slate-400">RainViewer</a>
          </p>
          <p>
            Wet bulb: Stull (2011) · Enthalpy: ASHRAE Fundamentals · ET₀: FAO-56 Penman-Monteith ·
            Degree days: base 60/65/70°F · Peak load risk: coincident T + WB + GHI score
          </p>
        </footer>
      </main>
    </div>
  );
}

function ErrorCard({ label, error }: { label: string; error: string }) {
  return (
    <div className="bg-[#161b22] border border-red-800/50 rounded-lg p-4">
      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">{label}</div>
      <p className="text-sm text-red-400 font-mono">{error}</p>
    </div>
  );
}
