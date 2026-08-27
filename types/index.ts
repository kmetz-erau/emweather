// Core types for the weather dashboard

export interface Coordinates {
  lat: number;
  lon: number;
  name: string;
}

// Open-Meteo API response shapes
export interface OpenMeteoCurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  is_day: number;
  dew_point_2m: number;
  surface_pressure: number;
  cloud_cover: number;
  shortwave_radiation: number;    // W/m² GHI
  et0_fao_evapotranspiration: number; // mm/hr
}

export interface OpenMeteoDailyData {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  relative_humidity_2m_max: number[];
  relative_humidity_2m_min: number[];
  dew_point_2m_max: number[];
  dew_point_2m_min: number[];
  weather_code: number[];
  wind_speed_10m_max: number[];
  wind_speed_100m_max: number[];
  wind_direction_10m_dominant: number[];
  sunrise: string[];
  sunset: string[];
  daylight_duration: number[];          // seconds
  sunshine_duration: number[];          // seconds
  shortwave_radiation_sum: number[];    // MJ/m² daily GHI
  et0_fao_evapotranspiration: number[]; // mm/day
  snowfall_sum: number[];               // cm
  snow_depth_max?: number[];            // m (not always available)
  precipitation_hours: number[];
  soil_moisture_0_to_1cm?: number[];
  soil_moisture_1_to_3cm?: number[];
}

export interface OpenMeteoHourlyData {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  precipitation: number[];
  dew_point_2m: number[];
  surface_pressure: number[];
  shortwave_radiation: number[];        // W/m² GHI
  direct_normal_irradiance: number[];   // W/m² DNI
  diffuse_radiation: number[];          // W/m² DHI
  wind_speed_100m: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  cloud_cover: number[];
  et0_fao_evapotranspiration: number[];
  soil_moisture_0_to_1cm?: number[];
}

export interface OperationalHour {
  time: string;
  tempF: number;
  humidity: number;
  precipInches: number;
  windMph: number;
  gustMph: number;
  wetBulbF: number;
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: OpenMeteoCurrentWeather;
  hourly: OpenMeteoHourlyData;
  daily: OpenMeteoDailyData;
}

// Historical API response (subset of fields)
export interface OpenMeteoHistoricalResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    et0_fao_evapotranspiration: number[];
    shortwave_radiation_sum: number[];
    precipitation_sum: number[];
  };
}

// Processed weather data used by the UI
export interface DailyForecast {
  date: string;
  dateLabel: string;
  tempMaxF: number;
  tempMinF: number;
  tempMeanF: number;
  humidityMax: number;
  humidityMin: number;
  humidityMean: number;
  dewPointMaxF: number;
  dewPointMinF: number;
  dewPointMeanF: number;
  precipInches: number;
  precipCumulative: number;
  precipHours: number;
  snowfallCm: number;
  hdd65: number;
  cdd65: number;
  hdd60: number;
  cdd60: number;
  hdd70: number;
  cdd70: number;
  wetBulbMaxF: number;
  wetBulbMinF: number;
  enthalpyMaxBtu: number;    // BTU/lb at peak conditions
  enthalpyMinBtu: number;
  ghiDailyKwh: number;       // kWh/m²/day (from MJ/m²)
  et0Mm: number;             // mm/day reference ET
  windSpeedMax: number;      // mph at 10m
  windSpeed100mMax: number;  // mph at 100m
  windDirection: number;     // degrees dominant
  daylightHours: number;
  sunshineHours: number;
  cloudCoverMean?: number;
  weatherCode: number;
  peakLoadRisk: 'low' | 'moderate' | 'high' | 'extreme'; // derived
  confidence: 'low' | 'medium' | 'high'; // lead-time planning confidence, not an ensemble probability
  tempSpreadF: number; // conservative planning range proxy
  precipProbability: number;
}

export type RiskSeverity = 'low' | 'moderate' | 'high' | 'extreme';

export interface OperationalRisk {
  type: string;
  severity: RiskSeverity;
  score: number;
  timing: string;
  evidence: string[];
  actions: string[];
}

export interface LocationRiskProfile {
  location: string;
  overall: RiskSeverity;
  risks: OperationalRisk[];
}

export interface OperationsBriefing {
  overallStatus: 'normal' | 'watch' | 'action';
  executiveSummary: string;
  locations: Array<{
    name: string;
    summary: string;
    recommendedActions: string[];
  }>;
  confidence: 'low' | 'medium' | 'high';
  generatedBy: 'ai' | 'rules';
  generatedAt: number;
}

export interface CurrentConditions {
  tempF: number;
  apparentTempF: number;
  wetBulbF: number;
  dewPointF: number;
  humidity: number;
  enthalpyBtu: number;       // BTU/lb moist air
  precipTodayInches: number;
  hddToday: number;
  cddToday: number;
  weatherCode: number;
  windSpeedMph: number;
  windGustsMph: number;
  windDirection: number;
  windSpeed100mMph: number;
  isDay: boolean;
  ghiWm2: number;            // current solar irradiance W/m²
  cloudCover: number;        // %
  pressureHpa: number;
  et0Today: number;          // mm/hr current ET₀
}

// Season-to-date degree day accumulations (from historical API)
export interface SeasonDegreedays {
  hdd65Std: number;   // season-to-date HDD base 65°F
  cdd65Std: number;   // season-to-date CDD base 65°F
  periodDays: number;
  startDate: string;
  et0SeasonMm: number;  // season-to-date ET₀ mm
  ghiSeasonKwh: number; // season-to-date GHI kWh/m²
}

export interface WeatherData {
  location: Coordinates;
  current: CurrentConditions;
  daily: DailyForecast[];
  season: SeasonDegreedays | null;
  timezone: string;
  fetchedAt: number;
  riskProfile: LocationRiskProfile;
  hourly: OperationalHour[];
}

export interface EnsembleDay {
  date: string;
  memberCount: number;
  freezeProbability: number;
  heavyRainProbability: number;
  highWindProbability: number;
  humidHeatProbability: number;
  tempLowP10F: number;
  tempLowP90F: number;
  tempHighP10F: number;
  tempHighP90F: number;
}

export interface EnsembleData {
  location: string;
  model: string;
  daily: EnsembleDay[];
  fetchedAt: number;
}

// NWS Alerts
export interface NWSAlert {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  status: string;
  effective: string;
  expires: string;
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  url: string;
}

export interface AlertsData {
  location: string;
  alerts: NWSAlert[];
  fetchedAt: number;
}

// Geocoding
export interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
  state?: string;
  country?: string;
}

// UI state
export interface LocationInput {
  raw: string;
  resolved: Coordinates | null;
  loading: boolean;
  error: string | null;
}

export interface DashboardState {
  loc1: LocationInput;
  loc2: LocationInput;
  weather1: WeatherData | null;
  weather2: WeatherData | null;
  alerts1: AlertsData | null;
  alerts2: AlertsData | null;
  loading: boolean;
  error: string | null;
}
