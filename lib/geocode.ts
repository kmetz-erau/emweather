import type { GeocodeResult, Coordinates } from '@/types';

// Resolve a place name or "lat,lon" string to coordinates
export async function geocodeLocation(input: string): Promise<Coordinates> {
  const trimmed = input.trim();

  // Check if user entered lat,lon directly
  const latLonMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (latLonMatch) {
    const lat = parseFloat(latLonMatch[1]);
    const lon = parseFloat(latLonMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon, name: `${lat.toFixed(4)}, ${lon.toFixed(4)}` };
    }
  }

  // Use Open-Meteo geocoding API (no key required)
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    throw new Error(`Geocoding API error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`Location not found: "${trimmed}"`);
  }

  const result: GeocodeResult = data.results[0];
  const parts = [result.name];
  if (result.state) parts.push(result.state);
  if (result.country) parts.push(result.country);

  return {
    lat: result.lat,
    lon: result.lon,
    name: parts.join(', '),
  };
}
