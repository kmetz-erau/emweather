'use client';

import type { WeatherData } from '@/types';

interface Props {
  weather1: WeatherData;
  weather2: WeatherData;
  loc1Name: string;
  loc2Name: string;
  buildingUA?: number; // BTU/hr·°F — optional user-input UA factor
}

function MetricRow({
  label, v1, v2, unit, note, highlight,
}: {
  label: string;
  v1: string | number;
  v2: string | number;
  unit?: string;
  note?: string;
  highlight?: (v: string | number) => boolean;
}) {
  const fmt = (v: string | number) => `${v}${unit ?? ''}`;
  return (
    <tr className="border-b border-[#21262d]/60 hover:bg-white/[0.02] transition-colors">
      <td className="px-3 py-2">
        <div className="text-xs font-mono text-slate-300">{label}</div>
        {note && <div className="text-[10px] font-mono text-slate-600">{note}</div>}
      </td>
      <td className={`px-3 py-2 text-sm font-mono text-right ${highlight?.(v1) ? 'text-yellow-300' : 'text-slate-200'}`}>
        {fmt(v1)}
      </td>
      <td className={`px-3 py-2 text-sm font-mono text-right ${highlight?.(v2) ? 'text-yellow-300' : 'text-slate-200'}`}>
        {fmt(v2)}
      </td>
    </tr>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-[#21262d]">
      <td colSpan={3} className="px-3 pt-4 pb-1">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{children}</span>
      </td>
    </tr>
  );
}

export default function EnergyMetricsPanel({ weather1, weather2, loc1Name, loc2Name }: Props) {
  const s = (name: string) => name.split(',')[0].slice(0, 20);
  const d1 = weather1.daily;
  const d2 = weather2.daily;

  // 7-day totals from forecast
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const hdd65_7d_1 = sum(d1.map(d => d.hdd65));
  const cdd65_7d_1 = sum(d1.map(d => d.cdd65));
  const hdd65_7d_2 = sum(d2.map(d => d.hdd65));
  const cdd65_7d_2 = sum(d2.map(d => d.cdd65));
  const hdd60_7d_1 = sum(d1.map(d => d.hdd60));
  const hdd70_7d_1 = sum(d1.map(d => d.hdd70));
  const hdd60_7d_2 = sum(d2.map(d => d.hdd60));
  const hdd70_7d_2 = sum(d2.map(d => d.hdd70));
  const cdd60_7d_1 = sum(d1.map(d => d.cdd60));
  const cdd70_7d_1 = sum(d1.map(d => d.cdd70));
  const cdd60_7d_2 = sum(d2.map(d => d.cdd60));
  const cdd70_7d_2 = sum(d2.map(d => d.cdd70));
  const ghi_7d_1 = sum(d1.map(d => d.ghiDailyKwh));
  const ghi_7d_2 = sum(d2.map(d => d.ghiDailyKwh));
  const et0_7d_1 = sum(d1.map(d => d.et0Mm));
  const et0_7d_2 = sum(d2.map(d => d.et0Mm));
  const precip_7d_1 = sum(d1.map(d => d.precipInches));
  const precip_7d_2 = sum(d2.map(d => d.precipInches));

  const season1 = weather1.season;
  const season2 = weather2.season;
  const seasonLabel = season1 ? `Jan 1 – yesterday (${season1.periodDays}d)` : 'Season-to-date';

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#21262d]">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-0.5">
          Energy Manager Summary
        </div>
        <div className="text-slate-400 font-mono text-xs">
          7-day forecast totals · Season-to-date actuals · Multi-base degree days
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#21262d]">
              <th className="px-3 py-2 text-left text-[10px] font-mono text-slate-500 uppercase tracking-widest w-1/2">Metric</th>
              <th className="px-3 py-2 text-right text-[10px] font-mono text-blue-400 uppercase tracking-widest">{s(loc1Name)}</th>
              <th className="px-3 py-2 text-right text-[10px] font-mono text-red-400 uppercase tracking-widest">{s(loc2Name)}</th>
            </tr>
          </thead>
          <tbody>

            <SectionHead>7-Day Forecast — Degree Days (base 65°F)</SectionHead>
            <MetricRow label="HDD 65 — 7-day total" v1={hdd65_7d_1.toFixed(1)} v2={hdd65_7d_2.toFixed(1)} />
            <MetricRow label="CDD 65 — 7-day total" v1={cdd65_7d_1.toFixed(1)} v2={cdd65_7d_2.toFixed(1)} />

            <SectionHead>7-Day Forecast — Balance Point Sensitivity</SectionHead>
            <MetricRow label="HDD base 60°F" note="Low-setpoint / passive house" v1={hdd60_7d_1.toFixed(1)} v2={hdd60_7d_2.toFixed(1)} />
            <MetricRow label="HDD base 65°F" note="Standard ENERGY STAR / utility" v1={hdd65_7d_1.toFixed(1)} v2={hdd65_7d_2.toFixed(1)} />
            <MetricRow label="HDD base 70°F" note="High-setpoint / older stock" v1={hdd70_7d_1.toFixed(1)} v2={hdd70_7d_2.toFixed(1)} />
            <MetricRow label="CDD base 60°F" v1={cdd60_7d_1.toFixed(1)} v2={cdd60_7d_2.toFixed(1)} />
            <MetricRow label="CDD base 65°F" v1={cdd65_7d_1.toFixed(1)} v2={cdd65_7d_2.toFixed(1)} />
            <MetricRow label="CDD base 70°F" note="Aggressive cooling setpoint" v1={cdd70_7d_1.toFixed(1)} v2={cdd70_7d_2.toFixed(1)} />

            <SectionHead>7-Day Forecast — Solar & Water</SectionHead>
            <MetricRow label="GHI — 7-day total" note="kWh/m² solar resource" v1={ghi_7d_1.toFixed(2)} unit=" kWh/m²" v2={ghi_7d_2.toFixed(2)} />
            <MetricRow label="ET₀ — 7-day total" note="mm reference evapotranspiration" v1={et0_7d_1.toFixed(1)} unit=" mm" v2={et0_7d_2.toFixed(1)} />
            <MetricRow label="Precipitation — 7-day total" v1={precip_7d_1.toFixed(2)} unit=" in" v2={precip_7d_2.toFixed(2)} />

            {(season1 || season2) && <>
              <SectionHead>Season-to-Date Actuals — {seasonLabel}</SectionHead>
              <MetricRow
                label="HDD 65 — season total"
                note="Compare to utility bill baseline"
                v1={season1 ? season1.hdd65Std.toFixed(0) : '—'}
                v2={season2 ? season2.hdd65Std.toFixed(0) : '—'}
              />
              <MetricRow
                label="CDD 65 — season total"
                v1={season1 ? season1.cdd65Std.toFixed(0) : '—'}
                v2={season2 ? season2.cdd65Std.toFixed(0) : '—'}
              />
              <MetricRow
                label="GHI — season total"
                note="kWh/m² cumulative solar"
                v1={season1 ? season1.ghiSeasonKwh.toFixed(0) : '—'}
                unit=" kWh/m²"
                v2={season2 ? season2.ghiSeasonKwh.toFixed(0) : '—'}
              />
              <MetricRow
                label="ET₀ — season total"
                note="mm cumulative reference ET"
                v1={season1 ? season1.et0SeasonMm.toFixed(0) : '—'}
                unit=" mm"
                v2={season2 ? season2.et0SeasonMm.toFixed(0) : '—'}
              />
            </>}

            <SectionHead>This Week — Peak Load Risk Days</SectionHead>
            {['extreme', 'high', 'moderate', 'low'].map(risk => {
              const n1 = d1.filter(d => d.peakLoadRisk === risk).length;
              const n2 = d2.filter(d => d.peakLoadRisk === risk).length;
              const color = risk === 'extreme' ? 'text-red-400' : risk === 'high' ? 'text-orange-400' : risk === 'moderate' ? 'text-yellow-400' : 'text-slate-500';
              return (
                <tr key={risk} className="border-b border-[#21262d]/60">
                  <td className="px-3 py-2"><span className={`text-xs font-mono font-medium ${color}`}>{risk.toUpperCase()} risk days</span></td>
                  <td className={`px-3 py-2 text-sm font-mono text-right ${n1 > 0 && risk !== 'low' ? color : 'text-slate-400'}`}>{n1}</td>
                  <td className={`px-3 py-2 text-sm font-mono text-right ${n2 > 0 && risk !== 'low' ? color : 'text-slate-400'}`}>{n2}</td>
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-[#21262d] text-[10px] text-slate-600 font-mono">
        Peak load risk = coincident T_max + wet bulb + GHI score. Degree day bases: 60°F, 65°F, 70°F.
        Season-to-date from Open-Meteo ERA5 historical archive.
      </div>
    </div>
  );
}
