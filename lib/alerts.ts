import type { AlertsData, NWSAlert } from '@/types';
import { alertSeverityRank } from './calculations';

const NWS_BASE = 'https://api.weather.gov';

export async function fetchAlerts(lat: number, lon: number, locationName: string): Promise<AlertsData> {
  // NWS alerts require US coordinates; gracefully handle international locations
  try {
    const url = `${NWS_BASE}/alerts/active?point=${lat},${lon}&status=actual`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WeatherDashboard/1.0 (weather-dashboard@example.com)',
        Accept: 'application/geo+json',
      },
      next: { revalidate: 300 }, // cache 5 minutes
    });

    if (res.status === 404 || res.status === 400) {
      // Outside NWS coverage (non-US location)
      return { location: locationName, alerts: [], fetchedAt: Date.now() };
    }

    if (!res.ok) {
      throw new Error(`NWS alerts error: ${res.status}`);
    }

    const data = await res.json();
    const features = data.features ?? [];

    const alerts: NWSAlert[] = features.map((f: any) => {
      const p = f.properties;
      return {
        id: f.id ?? p.id,
        event: p.event ?? 'Alert',
        severity: p.severity ?? 'Unknown',
        urgency: p.urgency ?? 'Unknown',
        status: p.status ?? 'Actual',
        effective: p.effective ?? p.sent ?? '',
        expires: p.expires ?? p.ends ?? '',
        headline: p.headline ?? '',
        description: (p.description ?? '').slice(0, 500),
        instruction: (p.instruction ?? '').slice(0, 300),
        areaDesc: p.areaDesc ?? '',
        url: `https://www.weather.gov/`,
      };
    });

    // Sort by severity descending
    alerts.sort((a, b) => alertSeverityRank(b.severity) - alertSeverityRank(a.severity));

    return { location: locationName, alerts, fetchedAt: Date.now() };
  } catch (err) {
    // Don't fail the whole dashboard for alert issues
    console.error('Alerts fetch error:', err);
    return { location: locationName, alerts: [], fetchedAt: Date.now() };
  }
}

export function formatAlertTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}
