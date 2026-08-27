# WeatherOps — Two-Location Weather Dashboard

A production-ready weather operations console for side-by-side comparison of two locations. Built for facilities management, agriculture, and outdoor field operations.

## Architecture

```
Open-Meteo API  ──▶  /api/weather   ──▶  lib/weather.ts    ──▶  WeatherData
NWS Alerts API  ──▶  /api/alerts    ──▶  lib/alerts.ts     ──▶  AlertsData
Open-Meteo Geo  ──▶  /api/geocode   ──▶  lib/geocode.ts    ──▶  Coordinates
```

**Data flow:**
1. User enters a place name or lat/lon in the UI
2. `/api/geocode` resolves it via Open-Meteo's geocoding API (no key required)
3. `/api/weather` fetches 7-day forecast from Open-Meteo using resolved coordinates
4. `/api/alerts` queries NWS `/alerts/active?point=lat,lon` (US locations only)
5. All calculations (wet bulb, HDD/CDD, unit conversions) happen server-side in `lib/calculations.ts`
6. The client renders charts, tables, and alerts from the processed JSON

**Calculations performed server-side:**
- **Wet bulb temperature**: Stull (2011) empirical formula — valid for −20 °C to 50 °C, 5–99% RH
- **HDD/CDD**: Standard base 65°F using daily mean = (T_max + T_min) / 2
- **Rolling precipitation**: Cumulative sum across the 7-day forecast window
- **Unit conversions**: °C → °F, m/s → mph, mm → inches

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Map | Leaflet + dynamic import (no SSR) |
| Hosting | Vercel |
| Weather API | Open-Meteo (no key required) |
| Alerts API | National Weather Service (US only) |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables are required. All APIs used are free and keyless.

## Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect the GitHub repo to Vercel via the dashboard — zero configuration needed.

**No environment variables required.**

## Features

- **Current conditions**: dry bulb temp, wet bulb temp, relative humidity, precipitation, HDD, CDD, wind
- **7-day forecast tables**: all metrics with color-coded thresholds for quick scanning
- **4 charts**: temperature (max/min both locations), RH, daily precipitation, HDD/CDD
- **NWS alerts**: active watches/warnings/advisories with severity, timing, and description
- **Leaflet map**: both locations plotted with a dashed connector line
- **Fixed campus locations**: Prescott, Arizona and Daytona Beach, Florida
- **Caching**: weather 30 min, alerts 5 min, geocoding 24 h via Next.js `revalidate`
- **Campus operations briefing**: Ollama-powered summary with a deterministic fallback
- **Ask WeatherOps**: natural-language questions grounded in loaded forecast and alert data
- **Explainable operational risks**: cooling, heat, rain, wind, freeze, condensation, thunderstorm, and fire-weather scores
- **Forecast change detection**: compares the current forecast with the prior browser snapshot
- **Planning confidence**: labeled lead-time confidence and temperature-range proxy
- **Probabilistic forecast**: GFS ensemble threshold probabilities and percentile ranges
- **Forecast learning**: browser snapshots, forecast-change detection, and verification against observations
- **Decision tools**: maintenance-window optimization and hourly event-weather screening
- **Documentation page**: in-app architecture, formulas, limitations, configuration, and deployment guide

## Ollama Cloud Setup

Copy `.env.example` to `.env.local` for local development, or add these variables in Vercel project settings:

```bash
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_API_KEY=your_secret_api_key
OLLAMA_MODEL=gpt-oss:20b
```

Never commit `.env.local` or an API key. Without `OLLAMA_API_KEY`, the dashboard remains functional and uses its deterministic briefing; only natural-language questions are unavailable.

The AI receives only weather, calculated risks, and NWS alert data already loaded by the dashboard. Operational scores are calculated in code so the model explains evidence instead of inventing risk values.

## Project Structure

```
app/
  page.tsx              — Main dashboard (client component)
  layout.tsx            — Root layout and metadata
  globals.css           — Tailwind + Leaflet CSS
  api/
    weather/route.ts    — Open-Meteo proxy + processing
    alerts/route.ts     — NWS alerts proxy
    geocode/route.ts    — Open-Meteo geocoding proxy
lib/
  weather.ts            — Open-Meteo fetch + data processing
  alerts.ts             — NWS alerts fetch + formatting
  calculations.ts       — Wet bulb, HDD/CDD, unit conversions
  geocode.ts            — Place name → lat/lon resolution
components/
  SummaryCard.tsx       — Current conditions card
  ForecastTable.tsx     — 7-day tabular forecast
  WeatherCharts.tsx     — Recharts visualization panel
  AlertsPanel.tsx       — NWS alerts display
  DecisionToolsPanel.tsx — Maintenance and event planning tools
  LocationMap.tsx       — Leaflet map (dynamic, no SSR)
types/
  index.ts              — TypeScript interfaces
```

## Alert Coverage

NWS alerts work for US locations only. For non-US coordinates, the alerts panel shows "No alerts (outside NWS coverage area)" without an error.

## Data Sources

- [Open-Meteo](https://open-meteo.com) — free, open-source weather API, no key required
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api) — free, US government, no key required
- Map tiles: standard OpenStreetMap
