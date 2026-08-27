import type { AlertsData, OperationsBriefing, WeatherData } from '@/types';

export function ruleBriefing(weather: WeatherData[], alerts: Array<AlertsData | null>): OperationsBriefing {
  const locations = weather.map((w, i) => {
    const top = w.riskProfile.risks.filter(r => r.severity !== 'low').slice(0, 3);
    const activeAlerts = alerts[i]?.alerts.length ?? 0;
    const summary = top.length
      ? `${top.map(r => `${r.severity} ${r.type.toLowerCase()} risk ${r.timing}`).join('; ')}.${activeAlerts ? ` ${activeAlerts} active NWS alert${activeAlerts === 1 ? '' : 's'}.` : ''}`
      : `No elevated operational weather risks identified in the seven-day forecast.${activeAlerts ? ` ${activeAlerts} active NWS alert${activeAlerts === 1 ? '' : 's'} still requires review.` : ''}`;
    return {
      name: w.location.name,
      summary,
      recommendedActions: Array.from(new Set(top.flatMap(r => r.actions))).slice(0, 5),
    };
  });
  const topSeverity = weather.flatMap(w => w.riskProfile.risks).reduce((n, r) => Math.max(n, r.score), 0);
  const overallStatus = topSeverity >= 60 ? 'action' : topSeverity >= 35 ? 'watch' : 'normal';
  return {
    overallStatus,
    executiveSummary: overallStatus === 'action'
      ? 'At least one elevated weather risk warrants facilities review.'
      : overallStatus === 'watch' ? 'Conditions are generally manageable, with several items to monitor.' : 'No significant operational weather issues are indicated.',
    locations,
    confidence: weather.some(w => w.daily.slice(0, 3).some(d => d.confidence === 'low')) ? 'medium' : 'high',
    generatedBy: 'rules',
    generatedAt: Date.now(),
  };
}

export function compactWeather(w: WeatherData) {
  const energyHours = w.hourly.map(h => ({ ...h,
    coolingPressure: Math.round(Math.max(0, Math.min(100, ((h.tempF - 65) * 2.2 + h.ghiWm2 / 22) * .55 + ((h.dewPointF - 55) * 3 + (h.enthalpyBtu - 28) * 2) * .45))),
  }));
  const peakEnergyHour = energyHours.length ? energyHours.reduce((a, b) => b.coolingPressure > a.coolingPressure ? b : a) : null;
  return {
    location: w.location.name,
    current: w.current,
    forecast: w.daily.map(d => ({
      date: d.date, maxF: d.tempMaxF, minF: d.tempMinF, wetBulbMaxF: d.wetBulbMaxF,
      dewPointMaxF: d.dewPointMaxF, rainIn: d.precipInches, snowCm: d.snowfallCm,
      windMph: d.windSpeedMax, confidence: d.confidence, risks: d.peakLoadRisk,
    })),
    operationalRisks: w.riskProfile.risks,
    energySignals: {
      peakCoolingPressure: peakEnergyHour ? { time: peakEnergyHour.time, score: peakEnergyHour.coolingPressure, tempF: peakEnergyHour.tempF, wetBulbF: peakEnergyHour.wetBulbF, dewPointF: peakEnergyHour.dewPointF, enthalpyBtu: peakEnergyHour.enthalpyBtu, ghiWm2: peakEnergyHour.ghiWm2 } : null,
      economizerOpportunityHours: w.hourly.filter(h => h.tempF >= 45 && h.tempF <= 65 && h.enthalpyBtu <= 28 && h.dewPointF <= 55).length,
      dewPointHoursAbove70F: w.hourly.filter(h => h.dewPointF >= 70).length,
      enthalpyHoursAbove35: w.hourly.filter(h => h.enthalpyBtu >= 35).length,
      wetBulbHoursAbove75F: w.hourly.filter(h => h.wetBulbF >= 75).length,
    },
  };
}
