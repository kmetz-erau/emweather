'use client';
import { useEffect, useState } from 'react';
import type { WeatherData } from '@/types';

type Snapshot = { savedAt: number; locations: Record<string, Array<{ date: string; maxF: number; rainIn: number; risk: string }>> };
type Change = { location: string; date: string; message: string; important: boolean };
const KEY = 'weatherops_forecast_snapshot_v2';
export default function ForecastChangePanel({ weather }: { weather: WeatherData[] }) {
  const [changes, setChanges] = useState<Change[]>([]); const [priorTime, setPriorTime] = useState<number | null>(null);
  useEffect(() => {
    const current: Snapshot = { savedAt: Date.now(), locations: Object.fromEntries(weather.map(w => [w.location.name, w.daily.map(d => ({ date: d.date, maxF: d.tempMaxF, rainIn: d.precipInches, risk: d.peakLoadRisk }))])) };
    try { const raw = localStorage.getItem(KEY); const prior: Snapshot | null = raw ? JSON.parse(raw) : null;
      if (prior) { setPriorTime(prior.savedAt); const found: Change[] = [];
        for (const w of weather) for (const d of w.daily) { const p = prior.locations[w.location.name]?.find(x => x.date === d.date); if (!p) continue; const t = d.tempMaxF - p.maxF; const rain = d.precipInches - p.rainIn;
          if (Math.abs(t) >= 3) found.push({ location: w.location.name, date: d.dateLabel, message: `High-temperature forecast ${t > 0 ? 'increased' : 'decreased'} ${Math.abs(t).toFixed(1)}°F`, important: Math.abs(t) >= 6 });
          if (Math.abs(rain) >= .2) found.push({ location: w.location.name, date: d.dateLabel, message: `Precipitation forecast ${rain > 0 ? 'increased' : 'decreased'} ${Math.abs(rain).toFixed(2)} in`, important: Math.abs(rain) >= .75 });
          if (p.risk !== d.peakLoadRisk) found.push({ location: w.location.name, date: d.dateLabel, message: `Weather load-risk category changed from ${p.risk} to ${d.peakLoadRisk}`, important: ['high','extreme'].includes(d.peakLoadRisk) }); }
        setChanges(found.slice(0, 12)); }
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch { /* optional browser storage */ }
  }, [weather]);
  return <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4"><div className="flex justify-between mb-3"><div><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Forecast Change Detection</div><p className="text-xs text-slate-400 mt-1">Changes since this browser’s previous forecast snapshot</p></div>{priorTime && <span className="text-[10px] font-mono text-slate-600">Compared with {new Date(priorTime).toLocaleString()}</span>}</div>{!priorTime ? <p className="text-xs text-slate-500">Baseline saved. Changes will appear after the next forecast update.</p> : changes.length === 0 ? <p className="text-xs text-emerald-400">No material forecast changes detected.</p> : <div className="grid md:grid-cols-2 gap-2">{changes.map((c, i) => <div key={i} className={`rounded border px-3 py-2 ${c.important ? 'border-orange-800 bg-orange-950/20' : 'border-[#30363d] bg-[#0d1117]'}`}><p className="text-[10px] font-mono text-slate-500">{c.location.split(',')[0]} · {c.date}</p><p className="text-xs text-slate-300 mt-1">{c.message}</p></div>)}</div>}</div>;
}
