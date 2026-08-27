'use client';
import { useMemo, useState } from 'react';
import type { OperationalHour, WeatherData } from '@/types';

const activities = {
  'Roof inspection': { min: 40, max: 95, wind: 20, gust: 28, rain: 0 },
  'Exterior painting': { min: 50, max: 90, wind: 15, gust: 22, rain: 0, humidity: 80 },
  'Crane or lift work': { min: 20, max: 100, wind: 15, gust: 25, rain: .03 },
  'Grounds work': { min: 35, max: 95, wind: 22, gust: 32, rain: .08 },
  'Drone survey': { min: 40, max: 95, wind: 12, gust: 18, rain: 0 },
};
type Activity = keyof typeof activities;
const qualifies = (h: OperationalHour, a: Activity) => { const c = activities[a]; return h.tempF >= c.min && h.tempF <= c.max && h.windMph <= c.wind && h.gustMph <= c.gust && h.precipInches <= c.rain && (!('humidity' in c) || h.humidity <= Number(c.humidity)); };
const displayTime = (t: string) => new Date(t).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' });

export default function DecisionToolsPanel({ weather }: { weather: WeatherData[] }) {
  const [activity, setActivity] = useState<Activity>('Roof inspection'); const [campus, setCampus] = useState(0);
  const [eventDate, setEventDate] = useState(weather[0].daily[1]?.date ?? weather[0].daily[0].date); const [eventHour, setEventHour] = useState('14');
  const windows = useMemo(() => { const good = weather[campus].hourly.filter(h => qualifies(h, activity)); const groups: OperationalHour[][] = [];
    for (const h of good) { const last = groups.at(-1); if (!last || new Date(h.time).getTime() - new Date(last.at(-1)!.time).getTime() > 3600000) groups.push([h]); else last.push(h); }
    return groups.filter(g => g.length >= 2).slice(0, 5);
  }, [weather, campus, activity]);
  const eventHourData = weather[campus].hourly.find(h => h.time.startsWith(`${eventDate}T${eventHour.padStart(2, '0')}:`));
  const eventRisks = eventHourData ? [eventHourData.precipInches > .05 && 'precipitation', eventHourData.gustMph >= 25 && 'strong gusts', eventHourData.wetBulbF >= 78 && 'humid heat', eventHourData.tempF <= 32 && 'freezing conditions'].filter(Boolean) as string[] : [];
  return <div className="grid xl:grid-cols-2 gap-4"><div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4"><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Maintenance Window Optimizer</div><div className="grid grid-cols-2 gap-2 mt-3"><select value={campus} onChange={e => setCampus(Number(e.target.value))} className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs"><option value={0}>Prescott</option><option value={1}>Daytona Beach</option></select><select value={activity} onChange={e => setActivity(e.target.value as Activity)} className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs">{Object.keys(activities).map(a => <option key={a}>{a}</option>)}</select></div><div className="mt-3 space-y-2">{windows.length ? windows.map((g, i) => <div key={i} className="rounded border border-emerald-900 bg-emerald-950/10 p-2"><p className="text-xs text-emerald-300">{displayTime(g[0].time)}–{new Date(g.at(-1)!.time).toLocaleTimeString('en-US', { hour: 'numeric' })}</p><p className="text-[10px] text-slate-500 mt-1">{g.length} qualifying hours · verify conditions before work</p></div>) : <p className="text-xs text-orange-300">No two-hour window meets the selected thresholds.</p>}</div></div>
  <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4"><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Event Weather Planner</div><div className="grid grid-cols-3 gap-2 mt-3"><select value={campus} onChange={e => setCampus(Number(e.target.value))} className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs"><option value={0}>Prescott</option><option value={1}>Daytona</option></select><input type="date" value={eventDate} min={weather[campus].daily[0].date} max={weather[campus].daily.at(-1)!.date} onChange={e => setEventDate(e.target.value)} className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs"/><select value={eventHour} onChange={e => setEventHour(e.target.value)} className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs">{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{new Date(2000,0,1,i).toLocaleTimeString('en-US',{hour:'numeric'})}</option>)}</select></div>{eventHourData ? <div className={`mt-3 rounded border p-3 ${eventRisks.length ? 'border-orange-800 bg-orange-950/20' : 'border-emerald-900 bg-emerald-950/10'}`}><p className={`text-sm ${eventRisks.length ? 'text-orange-300' : 'text-emerald-300'}`}>{eventRisks.length ? `Monitor: ${eventRisks.join(', ')}` : 'No selected threshold exceedances'}</p><p className="text-xs text-slate-400 mt-2">{eventHourData.tempF}°F · WB {eventHourData.wetBulbF}°F · wind {eventHourData.windMph} mph · gust {eventHourData.gustMph} mph · rain {eventHourData.precipInches.toFixed(2)} in/hr</p></div> : <p className="mt-3 text-xs text-slate-500">Select a time within the available hourly forecast.</p>}<p className="mt-2 text-[10px] text-slate-600">This screening does not replace NWS alerts, radar monitoring, or campus event authority.</p></div>
  </div>;
}
