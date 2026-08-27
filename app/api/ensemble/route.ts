import { NextRequest, NextResponse } from 'next/server';
import { wetBulbF } from '@/lib/calculations';
import type { EnsembleData, EnsembleDay } from '@/types';

const ENDPOINT = 'https://ensemble-api.open-meteo.com/v1/ensemble';
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))] ?? 0;
};
const pct = (n: number, total: number) => total ? Math.round(n / total * 100) : 0;
const round1 = (n: number) => Math.round(n * 10) / 10;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const lat = Number(q.get('lat')); const lon = Number(q.get('lon')); const location = q.get('name') ?? `${lat}, ${lon}`;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
  const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon), models: 'gfs_seamless', hourly: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m', temperature_unit: 'fahrenheit', precipitation_unit: 'inch', wind_speed_unit: 'mph', timezone: 'auto', forecast_days: '7' });
  try {
    const response = await fetch(`${ENDPOINT}?${params}`, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`Ensemble API returned ${response.status}`);
    const raw = await response.json(); const h = raw.hourly as Record<string, Array<number | string>>;
    const suffixes = Object.keys(h).filter(k => k.startsWith('temperature_2m')).map(k => k.slice('temperature_2m'.length));
    const dates = Array.from(new Set((h.time as string[]).map(t => t.slice(0, 10))));
    const daily: EnsembleDay[] = dates.map(date => {
      const indices = (h.time as string[]).map((t, i) => t.startsWith(date) ? i : -1).filter(i => i >= 0);
      const members = suffixes.map(suffix => {
        const temps = indices.map(i => Number(h[`temperature_2m${suffix}`]?.[i])).filter(Number.isFinite);
        const rhs = indices.map(i => Number(h[`relative_humidity_2m${suffix}`]?.[i]));
        const rain = indices.reduce((s, i) => s + (Number(h[`precipitation${suffix}`]?.[i]) || 0), 0);
        const winds = indices.map(i => Math.max(Number(h[`wind_speed_10m${suffix}`]?.[i]) || 0, Number(h[`wind_gusts_10m${suffix}`]?.[i]) || 0));
        const wetBulbs = temps.map((t, j) => wetBulbF(t, Number.isFinite(rhs[j]) ? rhs[j] : 50));
        return { low: Math.min(...temps), high: Math.max(...temps), rain, wind: Math.max(...winds), wetBulb: Math.max(...wetBulbs) };
      }).filter(m => Number.isFinite(m.low) && Number.isFinite(m.high));
      const lows = members.map(m => m.low); const highs = members.map(m => m.high);
      return { date, memberCount: members.length, freezeProbability: pct(members.filter(m => m.low <= 32).length, members.length), heavyRainProbability: pct(members.filter(m => m.rain >= 1).length, members.length), highWindProbability: pct(members.filter(m => m.wind >= 35).length, members.length), humidHeatProbability: pct(members.filter(m => m.wetBulb >= 78).length, members.length), tempLowP10F: round1(percentile(lows, .1)), tempLowP90F: round1(percentile(lows, .9)), tempHighP10F: round1(percentile(highs, .1)), tempHighP90F: round1(percentile(highs, .9)) };
    });
    const result: EnsembleData = { location, model: 'NOAA GFS Ensemble', daily, fetchedAt: Date.now() };
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Ensemble forecast unavailable.' }, { status: 502 }); }
}
