'use client';

import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DailyForecast } from '@/types';

interface Props {
  loc1Forecasts: DailyForecast[];
  loc2Forecasts: DailyForecast[];
  loc1Name: string;
  loc2Name: string;
}

function short(name: string) { return name.split(',')[0].slice(0, 14); }

function buildData(f1: DailyForecast[], f2: DailyForecast[], n1: string, n2: string) {
  const s1 = short(n1), s2 = short(n2);
  return f1.map((d, i) => ({
    date: d.dateLabel,
    [`${s1}_max`]:       d.tempMaxF,
    [`${s1}_min`]:       d.tempMinF,
    [`${s2}_max`]:       f2[i]?.tempMaxF ?? null,
    [`${s2}_min`]:       f2[i]?.tempMinF ?? null,
    [`${s1}_wb`]:        d.wetBulbMaxF,
    [`${s2}_wb`]:        f2[i]?.wetBulbMaxF ?? null,
    [`${s1}_dp`]:        d.dewPointMeanF,
    [`${s2}_dp`]:        f2[i]?.dewPointMeanF ?? null,
    [`${s1}_rh`]:        d.humidityMean,
    [`${s2}_rh`]:        f2[i]?.humidityMean ?? null,
    [`${s1}_enthalpy`]:  d.enthalpyMaxBtu,
    [`${s2}_enthalpy`]:  f2[i]?.enthalpyMaxBtu ?? null,
    [`${s1}_precip`]:    d.precipInches,
    [`${s2}_precip`]:    f2[i]?.precipInches ?? null,
    [`${s1}_hdd65`]:     d.hdd65,
    [`${s1}_cdd65`]:     d.cdd65,
    [`${s2}_hdd65`]:     f2[i]?.hdd65 ?? null,
    [`${s2}_cdd65`]:     f2[i]?.cdd65 ?? null,
    [`${s1}_ghi`]:       d.ghiDailyKwh,
    [`${s2}_ghi`]:       f2[i]?.ghiDailyKwh ?? null,
    [`${s1}_et0`]:       d.et0Mm,
    [`${s2}_et0`]:       f2[i]?.et0Mm ?? null,
    [`${s1}_wind10`]:    d.windSpeedMax,
    [`${s2}_wind10`]:    f2[i]?.windSpeedMax ?? null,
    [`${s1}_wind100`]:   d.windSpeed100mMax,
    [`${s2}_wind100`]:   f2[i]?.windSpeed100mMax ?? null,
  }));
}

const GC  = '#21262d'; // grid color
const TC  = '#6b7280'; // tick color
const TT  = { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: '#e6edf3' };
const LS  = { fontSize: 10, fontFamily: 'monospace', color: '#8b949e' };
const L1P = '#58a6ff'; const L1S = '#79c0ff';
const L2P = '#f85149'; const L2S = '#ffa198';
const HDD_C = '#79c0ff'; const CDD_C = '#ff7b72';

function XAx() {
  return <XAxis dataKey="date" tick={{ fill: TC, fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: GC }} tickLine={false} />;
}
function YAx({ domain, unit }: { domain?: [number | string, number | string]; unit?: string }) {
  return <YAxis domain={domain} tick={{ fill: TC, fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: GC }} tickLine={false} unit={unit} />;
}
function Grid() { return <CartesianGrid strokeDasharray="3 3" stroke={GC} />; }

function Shell({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{title}</div>
        {note && <div className="text-[10px] text-slate-600 font-mono">{note}</div>}
      </div>
      {children}
    </div>
  );
}

type ChartGroup = 'thermal' | 'humidity' | 'energy' | 'solar' | 'wind';

const CHART_GROUPS: { key: ChartGroup; label: string }[] = [
  { key: 'thermal',  label: 'Temperature' },
  { key: 'humidity', label: 'Humidity & Dew Point' },
  { key: 'energy',   label: 'Degree Days' },
  { key: 'solar',    label: 'Solar & ET₀' },
  { key: 'wind',     label: 'Wind' },
];

export default function WeatherCharts({ loc1Forecasts, loc2Forecasts, loc1Name, loc2Name }: Props) {
  const [group, setGroup] = useState<ChartGroup>('thermal');
  const s1 = short(loc1Name), s2 = short(loc2Name);
  const data = buildData(loc1Forecasts, loc2Forecasts, loc1Name, loc2Name);

  return (
    <div>
      {/* Group tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {CHART_GROUPS.map(g => (
          <button key={g.key} onClick={() => setGroup(g.key)}
            className={`px-3 py-1.5 text-[10px] font-mono rounded border transition-colors ${
              group === g.key
                ? 'border-blue-600 bg-blue-900/30 text-blue-300'
                : 'border-[#30363d] text-slate-500 hover:text-slate-300'
            }`}>
            {g.label}
          </button>
        ))}
      </div>

      {group === 'thermal' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Shell title="Temperature Forecast °F — Max & Min">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_max`} stroke={L1P} strokeWidth={2} dot={false} name={`${s1} Max`} />
                <Line type="monotone" dataKey={`${s1}_min`} stroke={L1S} strokeWidth={1.5} strokeDasharray="4 2" dot={false} name={`${s1} Min`} />
                <Line type="monotone" dataKey={`${s2}_max`} stroke={L2P} strokeWidth={2} dot={false} name={`${s2} Max`} />
                <Line type="monotone" dataKey={`${s2}_min`} stroke={L2S} strokeWidth={1.5} strokeDasharray="4 2" dot={false} name={`${s2} Min`} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>

          <Shell title="Wet Bulb Temperature °F — Daily Max" note="HVAC latent load indicator">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx />
                {/* OSHA heat illness thresholds */}
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_wb`} stroke={L1P} strokeWidth={2} dot={false} name={`${s1} WB`} />
                <Line type="monotone" dataKey={`${s2}_wb`} stroke={L2P} strokeWidth={2} dot={false} name={`${s2} WB`} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>

          <Shell title="Enthalpy BTU/lb — Peak Daily (ASHRAE load metric)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_enthalpy`} stroke={L1P} strokeWidth={2} dot={false} name={s1} />
                <Line type="monotone" dataKey={`${s2}_enthalpy`} stroke={L2P} strokeWidth={2} dot={false} name={s2} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>

          <Shell title="Daily Precipitation inches">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barGap={2}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Bar dataKey={`${s1}_precip`} fill={L1P} fillOpacity={0.8} name={s1} radius={[2,2,0,0]} />
                <Bar dataKey={`${s2}_precip`} fill={L2P} fillOpacity={0.8} name={s2} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Shell>
        </div>
      )}

      {group === 'humidity' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Shell title="Relative Humidity % — Daily Mean">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_rh`} stroke={L1P} strokeWidth={2} dot={false} name={s1} />
                <Line type="monotone" dataKey={`${s2}_rh`} stroke={L2P} strokeWidth={2} dot={false} name={s2} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>

          <Shell title="Dew Point °F — Daily Mean" note="Latent cooling load driver">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_dp`} stroke={L1P} strokeWidth={2} dot={false} name={s1} />
                <Line type="monotone" dataKey={`${s2}_dp`} stroke={L2P} strokeWidth={2} dot={false} name={s2} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>
        </div>
      )}

      {group === 'energy' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Shell title="Heating Degree Days (base 65°F)" note="HDD: max(0, 65−T_mean)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barGap={2}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Bar dataKey={`${s1}_hdd65`} fill={HDD_C} fillOpacity={0.85} name={s1} radius={[2,2,0,0]} />
                <Bar dataKey={`${s2}_hdd65`} fill="#a5d6ff" fillOpacity={0.6} name={s2} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Shell>

          <Shell title="Cooling Degree Days (base 65°F)" note="CDD: max(0, T_mean−65)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barGap={2}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Bar dataKey={`${s1}_cdd65`} fill={CDD_C} fillOpacity={0.85} name={s1} radius={[2,2,0,0]} />
                <Bar dataKey={`${s2}_cdd65`} fill="#ffa198" fillOpacity={0.6} name={s2} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Shell>
        </div>
      )}

      {group === 'solar' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Shell title="Global Horizontal Irradiance kWh/m²/day" note="Solar gain & PV yield driver">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barGap={2}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Bar dataKey={`${s1}_ghi`} fill="#f0c040" fillOpacity={0.85} name={s1} radius={[2,2,0,0]} />
                <Bar dataKey={`${s2}_ghi`} fill="#f0c04066" fillOpacity={0.9} name={s2} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Shell>

          <Shell title="Reference Evapotranspiration ET₀ mm/day" note="FAO-56 Penman-Monteith">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_et0`} stroke="#4ade80" strokeWidth={2} dot={false} name={s1} />
                <Line type="monotone" dataKey={`${s2}_et0`} stroke="#86efac" strokeWidth={2} strokeDasharray="4 2" dot={false} name={s2} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>
        </div>
      )}

      {group === 'wind' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Shell title="Wind Speed Max mph — 10m Hub Height">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_wind10`} stroke={L1P} strokeWidth={2} dot={false} name={s1} />
                <Line type="monotone" dataKey={`${s2}_wind10`} stroke={L2P} strokeWidth={2} dot={false} name={s2} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>

          <Shell title="Wind Speed Max mph — 100m (Stack Effect / Generation)" note="Relevant for natural ventilation & on-site wind">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <Grid /><XAx /><YAx />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={LS} />
                <Line type="monotone" dataKey={`${s1}_wind100`} stroke={L1P} strokeWidth={2} dot={false} name={s1} />
                <Line type="monotone" dataKey={`${s2}_wind100`} stroke={L2P} strokeWidth={2} dot={false} name={s2} />
              </LineChart>
            </ResponsiveContainer>
          </Shell>
        </div>
      )}
    </div>
  );
}
