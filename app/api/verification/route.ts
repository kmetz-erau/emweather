import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams; const lat = Number(q.get('lat')); const lon = Number(q.get('lon')); const start = q.get('start'); const end = q.get('end');
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !start || !end) return NextResponse.json({ error: 'Coordinates and date range are required.' }, { status: 400 });
  const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon), start_date: start, end_date: end, daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', temperature_unit: 'fahrenheit', precipitation_unit: 'inch', timezone: 'auto' });
  try { const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, { next: { revalidate: 86400 } }); if (!r.ok) throw new Error(`Historical API returned ${r.status}`); const x = await r.json(); return NextResponse.json(x.daily); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Verification unavailable.' }, { status: 502 }); }
}
