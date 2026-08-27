'use client';

import { useState } from 'react';
import type { DailyForecast } from '@/types';
import { wmoCodeIcon, peakLoadColor } from '@/lib/calculations';

interface Props {
  forecasts: DailyForecast[];
  locationName: string;
  label: string;
}

type TableView = 'thermal' | 'energy' | 'solar' | 'wind';

const VIEWS: { key: TableView; label: string }[] = [
  { key: 'thermal', label: 'Thermal' },
  { key: 'energy',  label: 'Degree Days' },
  { key: 'solar',   label: 'Solar & ET₀' },
  { key: 'wind',    label: 'Wind & Snow' },
];

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-slate-500 whitespace-nowrap font-medium">
      {children}
    </th>
  );
}

function Td({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={`px-3 py-2 whitespace-nowrap ${className}`}>{children}</td>;
}

export default function ForecastTable({ forecasts, locationName, label }: Props) {
  const [view, setView] = useState<TableView>('thermal');

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#21262d] flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{label}</div>
          <div className="text-slate-300 font-mono text-sm font-medium mt-0.5">{locationName}</div>
        </div>
        {/* View tabs */}
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                view === v.key
                  ? 'border-blue-600 bg-blue-900/30 text-blue-300'
                  : 'border-[#30363d] text-slate-500 hover:text-slate-300'
              }`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-[#21262d]">
              <Th>Date</Th>
              <Th></Th>
              {view === 'thermal' && <>
                <Th>Max °F</Th><Th>Min °F</Th>
                <Th>WB Max</Th><Th>Dew Pt</Th>
                <Th>RH %</Th><Th>Enthalpy</Th>
                <Th>Precip in</Th><Th>Cumul in</Th>
                <Th>Confidence</Th><Th>Risk</Th>
              </>}
              {view === 'energy' && <>
                <Th>Mean °F</Th>
                <Th>HDD 60</Th><Th>HDD 65</Th><Th>HDD 70</Th>
                <Th>CDD 60</Th><Th>CDD 65</Th><Th>CDD 70</Th>
                <Th>Precip h</Th>
              </>}
              {view === 'solar' && <>
                <Th>GHI kWh</Th><Th>Daylight h</Th><Th>Sunshine h</Th>
                <Th>ET₀ mm</Th><Th>Precip in</Th><Th>Snow cm</Th>
              </>}
              {view === 'wind' && <>
                <Th>Wind 10m</Th><Th>Wind 100m</Th><Th>Direction</Th>
                <Th>Snow cm</Th><Th>Precip in</Th>
              </>}
            </tr>
          </thead>
          <tbody>
            {forecasts.map((day, i) => (
              <tr key={day.date}
                className={`border-b border-[#21262d]/60 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'} hover:bg-white/[0.04] transition-colors`}>
                <Td className="text-slate-300">{day.dateLabel}</Td>
                <Td className="px-1">{wmoCodeIcon(day.weatherCode)}</Td>

                {view === 'thermal' && <>
                  <Td className={day.tempMaxF > 95 ? 'text-red-400' : day.tempMaxF < 20 ? 'text-blue-400' : 'text-slate-200'}>
                    {day.tempMaxF.toFixed(1)}
                  </Td>
                  <Td className={day.tempMinF < 20 ? 'text-blue-400' : 'text-slate-300'}>{day.tempMinF.toFixed(1)}</Td>
                  <Td className={day.wetBulbMaxF > 88 ? 'text-red-400' : day.wetBulbMaxF > 78 ? 'text-yellow-400' : 'text-slate-300'}>
                    {day.wetBulbMaxF.toFixed(1)}
                  </Td>
                  <Td className={day.dewPointMeanF > 70 ? 'text-yellow-300' : 'text-slate-400'}>
                    {day.dewPointMeanF.toFixed(1)}
                  </Td>
                  <Td className="text-slate-300">{day.humidityMean}</Td>
                  <Td className={day.enthalpyMaxBtu > 42 ? 'text-red-400' : day.enthalpyMaxBtu > 35 ? 'text-yellow-400' : 'text-slate-400'}>
                    {day.enthalpyMaxBtu.toFixed(1)}
                  </Td>
                  <Td className={day.precipInches > 1 ? 'text-yellow-300' : day.precipInches > 0.1 ? 'text-slate-200' : 'text-slate-500'}>
                    {day.precipInches.toFixed(2)}
                  </Td>
                  <Td className="text-slate-500">{day.precipCumulative.toFixed(2)}</Td>
                  <Td title={`Planning range proxy ±${day.tempSpreadF.toFixed(1)}°F; confidence declines with lead time`} className={day.confidence === 'high' ? 'text-emerald-400' : day.confidence === 'medium' ? 'text-yellow-400' : 'text-orange-400'}>{day.confidence.toUpperCase()} · ±{day.tempSpreadF.toFixed(1)}°</Td>
                  <Td>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${peakLoadColor(day.peakLoadRisk)}`}>
                      {day.peakLoadRisk.slice(0,3).toUpperCase()}
                    </span>
                  </Td>
                </>}

                {view === 'energy' && <>
                  <Td className="text-slate-300">{day.tempMeanF.toFixed(1)}</Td>
                  <Td className={day.hdd60 > 0 ? 'text-blue-300' : 'text-slate-600'}>{day.hdd60 > 0 ? day.hdd60.toFixed(1) : '—'}</Td>
                  <Td className={day.hdd65 > 0 ? 'text-blue-400' : 'text-slate-600'}>{day.hdd65 > 0 ? day.hdd65.toFixed(1) : '—'}</Td>
                  <Td className={day.hdd70 > 0 ? 'text-blue-200' : 'text-slate-600'}>{day.hdd70 > 0 ? day.hdd70.toFixed(1) : '—'}</Td>
                  <Td className={day.cdd60 > 0 ? 'text-orange-300' : 'text-slate-600'}>{day.cdd60 > 0 ? day.cdd60.toFixed(1) : '—'}</Td>
                  <Td className={day.cdd65 > 0 ? 'text-red-400' : 'text-slate-600'}>{day.cdd65 > 0 ? day.cdd65.toFixed(1) : '—'}</Td>
                  <Td className={day.cdd70 > 0 ? 'text-red-200' : 'text-slate-600'}>{day.cdd70 > 0 ? day.cdd70.toFixed(1) : '—'}</Td>
                  <Td className={day.precipHours > 6 ? 'text-yellow-400' : 'text-slate-500'}>{day.precipHours.toFixed(0)}</Td>
                </>}

                {view === 'solar' && <>
                  <Td className={day.ghiDailyKwh > 6 ? 'text-yellow-300' : day.ghiDailyKwh > 3 ? 'text-slate-200' : 'text-slate-500'}>
                    {day.ghiDailyKwh.toFixed(2)}
                  </Td>
                  <Td className="text-slate-300">{day.daylightHours.toFixed(1)}</Td>
                  <Td className="text-slate-400">{day.sunshineHours.toFixed(1)}</Td>
                  <Td className={day.et0Mm > 8 ? 'text-orange-400' : 'text-slate-400'}>{day.et0Mm.toFixed(1)}</Td>
                  <Td className={day.precipInches > 0.1 ? 'text-slate-200' : 'text-slate-600'}>{day.precipInches.toFixed(2)}</Td>
                  <Td className={day.snowfallCm > 0 ? 'text-blue-300' : 'text-slate-600'}>{day.snowfallCm > 0 ? day.snowfallCm.toFixed(1) : '—'}</Td>
                </>}

                {view === 'wind' && <>
                  <Td className={day.windSpeedMax > 30 ? 'text-yellow-400' : 'text-slate-300'}>{day.windSpeedMax.toFixed(0)} mph</Td>
                  <Td className={day.windSpeed100mMax > 35 ? 'text-yellow-400' : 'text-slate-400'}>{day.windSpeed100mMax.toFixed(0)} mph</Td>
                  <Td className="text-slate-500">{windDirLabel(day.windDirection)}</Td>
                  <Td className={day.snowfallCm > 0 ? 'text-blue-300' : 'text-slate-600'}>{day.snowfallCm > 0 ? day.snowfallCm.toFixed(1) : '—'}</Td>
                  <Td className={day.precipInches > 0.1 ? 'text-slate-200' : 'text-slate-600'}>{day.precipInches.toFixed(2)}</Td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function windDirLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
