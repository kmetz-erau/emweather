'use client';

import type { WeatherData, AlertsData } from '@/types';
import { wmoCodeIcon, wmoCodeLabel, peakLoadColor } from '@/lib/calculations';

interface Props {
  label: string;
  weather: WeatherData;
  alerts: AlertsData | null;
}

function Stat({
  label, value, unit, highlight, tooltip,
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: 'warn' | 'danger' | 'cool' | 'green';
  tooltip?: string;
}) {
  const color =
    highlight === 'danger' ? 'text-red-400'
    : highlight === 'warn'  ? 'text-yellow-400'
    : highlight === 'cool'  ? 'text-blue-400'
    : highlight === 'green' ? 'text-green-400'
    : 'text-slate-100';

  return (
    <div className="flex flex-col gap-0.5" title={tooltip}>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">{label}</span>
      <span className={`text-base font-mono font-semibold leading-tight ${color}`}>
        {value}
        {unit && <span className="text-xs text-slate-400 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function windDir(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export default function SummaryCard({ label, weather, alerts }: Props) {
  const { current, daily } = weather;
  const today = daily[0];
  const alertCount = alerts?.alerts.length ?? 0;
  const hasWarning = alerts?.alerts.some(a => ['Extreme', 'Severe'].includes(a.severity));
  const riskClass = today ? peakLoadColor(today.peakLoadRisk) : '';

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 space-y-4">
      {/* Location header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-0.5">{label}</div>
          <div className="text-slate-200 font-mono text-sm font-medium leading-tight">{weather.location.name}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {weather.location.lat.toFixed(4)}°, {weather.location.lon.toFixed(4)}°
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl">{wmoCodeIcon(current.weatherCode)}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{wmoCodeLabel(current.weatherCode)}</div>
        </div>
      </div>

      {/* Primary thermal metrics */}
      <div>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">Thermal</div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <Stat label="Dry Bulb" value={current.tempF.toFixed(1)} unit="°F"
            highlight={current.tempF > 95 ? 'danger' : current.tempF < 20 ? 'cool' : undefined} />
          <Stat label="Feels Like" value={current.apparentTempF.toFixed(1)} unit="°F"
            highlight={current.apparentTempF > 100 ? 'danger' : current.apparentTempF < 10 ? 'cool' : undefined} />
          <Stat label="Wet Bulb" value={current.wetBulbF.toFixed(1)} unit="°F"
            highlight={current.wetBulbF > 88 ? 'danger' : current.wetBulbF > 78 ? 'warn' : undefined}
            tooltip="Stull (2011) — HVAC latent load indicator" />
          <Stat label="Dew Point" value={current.dewPointF.toFixed(1)} unit="°F"
            highlight={current.dewPointF > 70 ? 'warn' : undefined}
            tooltip="High dew point = high latent cooling load" />
          <Stat label="RH" value={current.humidity} unit="%" />
          <Stat label="Enthalpy" value={current.enthalpyBtu.toFixed(1)} unit=" BTU/lb"
            highlight={current.enthalpyBtu > 42 ? 'danger' : current.enthalpyBtu > 35 ? 'warn' : undefined}
            tooltip="Total heat content of moist air — ASHRAE HVAC load metric" />
        </div>
      </div>

      {/* Energy metrics */}
      <div className="pt-3 border-t border-[#21262d]">
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">Energy</div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <Stat label="HDD" value={current.hddToday.toFixed(1)}
            highlight={current.hddToday > 20 ? 'cool' : undefined} tooltip="Heating degree days (base 65°F)" />
          <Stat label="CDD" value={current.cddToday.toFixed(1)}
            highlight={current.cddToday > 15 ? 'danger' : undefined} tooltip="Cooling degree days (base 65°F)" />
          <Stat label="Solar GHI" value={current.ghiWm2} unit=" W/m²"
            highlight={current.ghiWm2 > 700 ? 'warn' : undefined}
            tooltip="Global Horizontal Irradiance — solar gain & PV yield driver" />
          <Stat label="Cloud Cover" value={current.cloudCover} unit="%" />
          <Stat label="ET₀" value={current.et0Today.toFixed(2)} unit=" mm/hr"
            tooltip="Reference evapotranspiration (FAO-56 Penman-Monteith)" />
          <Stat label="Pressure" value={current.pressureHpa.toFixed(0)} unit=" hPa" />
        </div>
      </div>

      {/* Wind */}
      <div className="pt-3 border-t border-[#21262d]">
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">Wind</div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          <Stat label="Speed 10m" value={current.windSpeedMph.toFixed(0)} unit=" mph" />
          <Stat label="Gusts" value={current.windGustsMph.toFixed(0)} unit=" mph"
            highlight={current.windGustsMph > 40 ? 'danger' : current.windGustsMph > 25 ? 'warn' : undefined} />
          <Stat label="Direction" value={windDir(current.windDirection)} />
        </div>
      </div>

      {/* Today's peak load risk */}
      {today && (
        <div className="pt-3 border-t border-[#21262d] flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest"
            title="Coincident temp + wet bulb + solar — demand charge risk indicator">
            Today Peak Load Risk
          </span>
          <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${riskClass}`}>
            {today.peakLoadRisk.toUpperCase()}
          </span>
        </div>
      )}

      {/* Precip + alerts row */}
      <div className="pt-3 border-t border-[#21262d] flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] font-mono text-slate-400">
          Precip today: <span className={current.precipTodayInches > 0.5 ? 'text-yellow-300' : 'text-slate-300'}>
            {current.precipTodayInches.toFixed(2)} in
          </span>
        </div>
        {alertCount === 0 ? (
          <div className="text-[10px] text-slate-600 font-mono">No active alerts</div>
        ) : (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium
            ${hasWarning ? 'bg-red-900/40 text-red-300 border border-red-700' : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700'}`}>
            ⚠ {alertCount} alert{alertCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
