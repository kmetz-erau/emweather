// ──────────────────────────────────────────────────────────────────────────────
// Weather calculations for energy management
// ──────────────────────────────────────────────────────────────────────────────

// ── Unit conversions ──────────────────────────────────────────────────────────

export function cToF(c: number): number { return c * 9 / 5 + 32; }
export function fToC(f: number): number { return (f - 32) * 5 / 9; }
export function msToMph(ms: number): number { return ms * 2.23694; }
export function mmToInches(mm: number): number { return mm / 25.4; }
export function mjToKwh(mj: number): number { return mj / 3.6; }  // MJ/m² → kWh/m²

// ── Psychrometrics ────────────────────────────────────────────────────────────

/**
 * Wet bulb temperature — Stull (2011) empirical formula.
 * Valid: −20°C ≤ T ≤ 50°C, 5% ≤ RH ≤ 99%
 */
export function wetBulbC(tempC: number, rhPct: number): number {
  const rh = Math.max(5, Math.min(99, rhPct));
  return (
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

export function wetBulbF(tempF: number, rhPct: number): number {
  return cToF(wetBulbC(fToC(tempF), rhPct));
}

/**
 * Saturation vapor pressure (kPa) via Magnus formula.
 */
function satVaporPressure(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Specific humidity (kg water / kg dry air).
 */
function specificHumidity(tempC: number, rhPct: number, pressureHpa: number): number {
  const es = satVaporPressure(tempC);
  const e = (rhPct / 100) * es;
  const pressureKpa = pressureHpa / 10;
  return (0.622 * e) / (pressureKpa - 0.378 * e);
}

/**
 * Enthalpy of moist air (BTU/lb dry air).
 * h = 0.240·T_db + W·(1061 + 0.444·T_db)
 * where T_db is in °F and W is humidity ratio (lb water / lb dry air).
 *
 * ASHRAE Fundamentals Handbook formulation.
 */
export function enthalpyBtu(tempF: number, rhPct: number, pressureHpa = 1013.25): number {
  const tempC = fToC(tempF);
  const W = specificHumidity(tempC, rhPct, pressureHpa); // kg/kg ≈ lb/lb
  return 0.240 * tempF + W * (1061 + 0.444 * tempF);
}

/**
 * Dew point from temperature and RH (Magnus approximation).
 */
export function dewPointC(tempC: number, rhPct: number): number {
  const a = 17.27;
  const b = 237.3;
  const alpha = (a * tempC) / (b + tempC) + Math.log(rhPct / 100);
  return (b * alpha) / (a - alpha);
}

export function dewPointF(tempF: number, rhPct: number): number {
  return cToF(dewPointC(fToC(tempF), rhPct));
}

// ── Degree days ───────────────────────────────────────────────────────────────

export function hddDay(meanTempF: number, base = 65): number {
  return Math.max(0, base - meanTempF);
}

export function cddDay(meanTempF: number, base = 65): number {
  return Math.max(0, meanTempF - base);
}

// ── Peak load risk ────────────────────────────────────────────────────────────

/**
 * Estimate peak electrical load risk for the day.
 * Combines dry bulb, wet bulb, and solar radiation.
 * Used to flag the hour/day with highest coincident demand charge risk.
 */
export function peakLoadRisk(
  tempMaxF: number,
  wetBulbMaxF: number,
  ghiKwh: number
): 'low' | 'moderate' | 'high' | 'extreme' {
  // Score out of 10: temp (0-4) + wb (0-3) + solar (0-3)
  const tScore = tempMaxF > 100 ? 4 : tempMaxF > 90 ? 3 : tempMaxF > 80 ? 2 : tempMaxF > 70 ? 1 : 0;
  const wbScore = wetBulbMaxF > 78 ? 3 : wetBulbMaxF > 70 ? 2 : wetBulbMaxF > 60 ? 1 : 0;
  const solScore = ghiKwh > 6 ? 3 : ghiKwh > 4 ? 2 : ghiKwh > 2 ? 1 : 0;
  const total = tScore + wbScore + solScore;
  if (total >= 8) return 'extreme';
  if (total >= 5) return 'high';
  if (total >= 3) return 'moderate';
  return 'low';
}

export function riskFromScore(score: number): 'low' | 'moderate' | 'high' | 'extreme' {
  if (score >= 80) return 'extreme';
  if (score >= 60) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

// ── Precipitation ─────────────────────────────────────────────────────────────

export function rollingPrecip(dailyInches: number[]): number[] {
  let sum = 0;
  return dailyInches.map(v => { sum += v; return Math.round(sum * 100) / 100; });
}

// ── Alert utilities ───────────────────────────────────────────────────────────

export function alertSeverityRank(severity: string): number {
  return ({ Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 } as Record<string, number>)[severity] ?? 0;
}

export function alertSeverityColor(severity: string): string {
  switch (severity) {
    case 'Extreme':  return 'text-red-400 border-red-500';
    case 'Severe':   return 'text-orange-400 border-orange-500';
    case 'Moderate': return 'text-yellow-400 border-yellow-500';
    case 'Minor':    return 'text-blue-400 border-blue-500';
    default:         return 'text-gray-400 border-gray-600';
  }
}

// ── WMO weather codes ─────────────────────────────────────────────────────────

export function wmoCodeLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2)  return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 49) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

export function wmoCodeIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2)  return '⛅';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '❓';
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function peakLoadColor(risk: string): string {
  switch (risk) {
    case 'extreme':  return 'text-red-400 bg-red-900/30 border-red-700';
    case 'high':     return 'text-orange-400 bg-orange-900/20 border-orange-700';
    case 'moderate': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
    default:         return 'text-slate-500 bg-transparent border-[#21262d]';
  }
}
