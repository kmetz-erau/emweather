import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherData } from '@/lib/weather';
import type { Coordinates } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');
  const name = searchParams.get('name') ?? `${lat}, ${lon}`;

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Missing or invalid lat/lon parameters' },
      { status: 400 }
    );
  }

  try {
    const coords: Coordinates = { lat, lon, name };
    const data = await fetchWeatherData(coords);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
