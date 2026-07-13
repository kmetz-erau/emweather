import type {
  Coordinates,
  WeatherData,
  OpenMeteoResponse,
  OpenMeteoHistoricalResponse,
  DailyForecast,
  CurrentConditions,
  SeasonDegreedays,
} from '@/types';
import {
  cToF,
  msToMph,
  mmToInches,
  mjToKwh,
  wetBulbF,
  enthalpyBtu,
  dewPointF,
  hddDay,
  cddDay,
  peakLoadRisk,
  formatDateLabel,
} from './calculations';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_HISTORICAL = 'https://archive-api.open-meteo.com/v1/archive';

const CURRENT_VARS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
  'precipitation', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m',
  'wind_direction_10m', 'is_day', 'dew_point_2m', 'surface_pressure',
  'cloud_cover', 'shortwave_radiation', 'et0_fao_evapotranspiration',
].join(',');

const HOURLY_VARS = [
  'temperature_2m', 'relative_humidity_2m', 'dew_point_2m',
  'precipitation', 'surface_pressure', 'shortwave_radiation',
  'direct_normal_irradiance', 'diffuse_radiation',
  'wind_speed_100m', 'cloud_cover', 'et0_fao_evapotranspiration',
].join(',');

const DAILY_VARS = [
  'temperature_2m_max', 'temperature_2m_min',
  'relative_humidity_2m_max', 'relative_humidity_2m_min',
  'dew_point_2m_max', 'dew_point_2m_min',
  'precipitation_sum', 'precipitation_hours',
  'snowfall_sum',
  'weather_code',
  'wind_speed_10m_max', 'wind_speed_100m_max', 'wind_direction_10m_dominant',
  'sunrise', 'sunset', 'daylight_duration', 'sunshine_duration',
  'shortwave_radiation_sum',
  'et0_fao_evapotranspiration',
].join(',');

// ── Seasonal start: heating season = July 1, cooling season = Jan 1 ──────────
function seasonStart(now: Date): string {
  const month = now.getMonth() + 1; // 1-based
  const year = now.getFullYear();
  // Heating season runs Jul–Jun; cooling season runs Jan–Dec
  // Simple rule: use Jan 1 of current year for CDD, Jul 1 prior year for HDD
  // We'll fetch the whole year-to-date from Jan 1
  return `${year}-01-01`;
}

function yesterday(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Fetch season-to-date from Open-Meteo historical archive ──────────────────
async function fetchSeasonalData(coords: Coordinates): Promise<SeasonDegreedays | null> {
  try {
    const now = new Date();
    const startDate = seasonStart(now);
    const endDate = yesterday(now);

    // Guard: don't request if start >= end
    if (startDate >= endDate) return null;

    const params = new URLSearchParams({
      latitude: coords.lat.toString(),
      longitude: coords.lon.toString(),
      start_date: startDate,
      end_date: endDate,
      daily: [
        'temperature_2m_max', 'temperature_2m_min',
        'et0_fao_evapotranspiration', 'shortwave_radiation_sum',
        'precipitation_sum',
      ].join(','),
      temperature_unit: 'celsius',
      timezone: 'auto',
    });

    const res = await fetch(`${OPEN_METEO_HISTORICAL}?${params}`, {
      next: { revalidate: 86400 }, // Historical data: cache 24h
    });

    if (!res.ok) return null;

    const raw: OpenMeteoHistoricalResponse = await res.json();
    const d = raw.daily;

    let hdd65 = 0, cdd65 = 0, et0Total = 0, ghiTotal = 0;
    for (let i = 0; i < d.time.length; i++) {
      const maxF = cToF(d.temperature_2m_max[i] ?? 0);
      const minF = cToF(d.temperature_2m_min[i] ?? 0);
      const meanF = (maxF + minF) / 2;
      hdd65 += hddDay(meanF, 65);
      cdd65 += cddDay(meanF, 65);
      et0Total += d.et0_fao_evapotranspiration[i] ?? 0;
      ghiTotal += mjToKwh(d.shortwave_radiation_sum[i] ?? 0);
    }

    return {
      hdd65Std: Math.round(hdd65 * 10) / 10,
      cdd65Std: Math.round(cdd65 * 10) / 10,
      periodDays: d.time.length,
      startDate,
      et0SeasonMm: Math.round(et0Total * 10) / 10,
      ghiSeasonKwh: Math.round(ghiTotal * 10) / 10,
    };
  } catch {
    return null;
  }
}

// ── Main forecast fetch ───────────────────────────────────────────────────────
export async function fetchWeatherData(coords: Coordinates): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: coords.lat.toString(),
    longitude: coords.lon.toString(),
    current: CURRENT_VARS,
    hourly: HOURLY_VARS,
    daily: DAILY_VARS,
    temperature_unit: 'celsius',
    wind_speed_unit: 'ms',
    precipitation_unit: 'mm',
    timezone: 'auto',
    forecast_days: '7',
  });

  const [forecastRes, season] = await Promise.all([
    fetch(`${OPEN_METEO_BASE}?${params}`, { next: { revalidate: 1800 } }),
    fetchSeasonalData(coords),
  ]);

  if (!forecastRes.ok) {
    throw new Error(`Open-Meteo error: ${forecastRes.status} ${forecastRes.statusText}`);
  }

  const raw: OpenMeteoResponse = await forecastRes.json();
  return processWeatherData(raw, coords, season);
}

// ── Processing ────────────────────────────────────────────────────────────────
function processWeatherData(
  raw: OpenMeteoResponse,
  location: Coordinates,
  season: SeasonDegreedays | null
): WeatherData {
  const cur = raw.current;
  const pressureHpa = cur.surface_pressure ?? 1013.25;
  const tempF = cToF(cur.temperature_2m);
  const rh = cur.relative_humidity_2m;

  const current: CurrentConditions = {
    tempF:              round1(tempF),
    apparentTempF:      round1(cToF(cur.apparent_temperature)),
    wetBulbF:           round1(wetBulbF(tempF, rh)),
    dewPointF:          round1(cToF(cur.dew_point_2m)),
    humidity:           Math.round(rh),
    enthalpyBtu:        round2(enthalpyBtu(tempF, rh, pressureHpa)),
    precipTodayInches:  round2(mmToInches(cur.precipitation ?? 0)),
    hddToday:           round1(hddDay(tempF)),
    cddToday:           round1(cddDay(tempF)),
    weatherCode:        cur.weather_code,
    windSpeedMph:       round1(msToMph(cur.wind_speed_10m)),
    windGustsMph:       round1(msToMph(cur.wind_gusts_10m ?? 0)),
    windDirection:      cur.wind_direction_10m,
    windSpeed100mMph:   0, // not in current; available in hourly
    isDay:              cur.is_day === 1,
    ghiWm2:             Math.round(cur.shortwave_radiation ?? 0),
    cloudCover:         Math.round(cur.cloud_cover ?? 0),
    pressureHpa:        round1(pressureHpa),
    et0Today:           round2(cur.et0_fao_evapotranspiration ?? 0),
  };

  // Try to get 100m wind from most recent hourly value
  const hourlyLen = raw.hourly.time.length;
  if (hourlyLen > 0 && raw.hourly.wind_speed_100m?.length) {
    // Find the closest hourly index to now
    const nowIso = raw.current ? new Date().toISOString().slice(0, 13) : '';
    const idx = raw.hourly.time.findIndex(t => t.startsWith(nowIso));
    const hi = idx >= 0 ? idx : 0;
    current.windSpeed100mMph = round1(msToMph(raw.hourly.wind_speed_100m[hi] ?? 0));
  }

  // Daily forecasts
  const d = raw.daily;
  let cumulativePrecip = 0;

  const daily: DailyForecast[] = d.time.map((dateStr, i) => {
    const maxF  = cToF(d.temperature_2m_max[i]);
    const minF  = cToF(d.temperature_2m_min[i]);
    const meanF = (maxF + minF) / 2;
    const humMax = d.relative_humidity_2m_max[i];
    const humMin = d.relative_humidity_2m_min[i];
    const humMean = (humMax + humMin) / 2;
    const dpMaxF = cToF(d.dew_point_2m_max[i] ?? 0);
    const dpMinF = cToF(d.dew_point_2m_min[i] ?? 0);
    const precipIn = mmToInches(d.precipitation_sum[i] ?? 0);
    cumulativePrecip += precipIn;
    const ghiKwh = mjToKwh(d.shortwave_radiation_sum[i] ?? 0);
    const wbMax  = wetBulbF(maxF, humMin);  // worst case: hot + low humidity
    const wbMin  = wetBulbF(minF, humMax);
    const daylightSec = d.daylight_duration[i] ?? 0;
    const sunshineSec = d.sunshine_duration[i] ?? 0;

    return {
      date: dateStr,
      dateLabel: formatDateLabel(dateStr),
      tempMaxF:     round1(maxF),
      tempMinF:     round1(minF),
      tempMeanF:    round1(meanF),
      humidityMax:  Math.round(humMax),
      humidityMin:  Math.round(humMin),
      humidityMean: Math.round(humMean),
      dewPointMaxF: round1(dpMaxF),
      dewPointMinF: round1(dpMinF),
      dewPointMeanF: round1((dpMaxF + dpMinF) / 2),
      precipInches:     round2(precipIn),
      precipCumulative: round2(cumulativePrecip),
      precipHours:  d.precipitation_hours[i] ?? 0,
      snowfallCm:   round1(d.snowfall_sum[i] ?? 0),
      hdd65:  round1(hddDay(meanF, 65)),
      cdd65:  round1(cddDay(meanF, 65)),
      hdd60:  round1(hddDay(meanF, 60)),
      cdd60:  round1(cddDay(meanF, 60)),
      hdd70:  round1(hddDay(meanF, 70)),
      cdd70:  round1(cddDay(meanF, 70)),
      wetBulbMaxF: round1(wbMax),
      wetBulbMinF: round1(wbMin),
      enthalpyMaxBtu: round2(enthalpyBtu(maxF, humMax, pressureHpa)),
      enthalpyMinBtu: round2(enthalpyBtu(minF, humMin, pressureHpa)),
      ghiDailyKwh:  round2(ghiKwh),
      et0Mm:        round2(d.et0_fao_evapotranspiration[i] ?? 0),
      windSpeedMax:    round1(msToMph(d.wind_speed_10m_max[i] ?? 0)),
      windSpeed100mMax: round1(msToMph(d.wind_speed_100m_max[i] ?? 0)),
      windDirection:   d.wind_direction_10m_dominant[i] ?? 0,
      daylightHours:   round2(daylightSec / 3600),
      sunshineHours:   round2(sunshineSec / 3600),
      weatherCode:  d.weather_code[i],
      peakLoadRisk: peakLoadRisk(maxF, wbMax, ghiKwh),
    };
  });

  return { location, current, daily, season, timezone: raw.timezone, fetchedAt: Date.now() };
}

function round1(n: number) { return Math.round(n * 10) / 10; }
function round2(n: number) { return Math.round(n * 100) / 100; }
