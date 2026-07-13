import requests, csv, os
from datetime import datetime, timezone

LOCATIONS = [
    {"name": os.environ["LOC1_NAME"], "lat": os.environ["LOC1_LAT"], "lon": os.environ["LOC1_LON"]},
    {"name": os.environ["LOC2_NAME"], "lat": os.environ["LOC2_LAT"], "lon": os.environ["LOC2_LON"]},
]

CURRENT_VARS = ",".join([
    "temperature_2m","relative_humidity_2m","apparent_temperature",
    "precipitation","weather_code","wind_speed_10m","wind_gusts_10m",
    "wind_direction_10m","dew_point_2m","surface_pressure",
    "cloud_cover","shortwave_radiation","et0_fao_evapotranspiration",
])

DAILY_VARS = ",".join([
    "temperature_2m_max","temperature_2m_min",
    "precipitation_sum","et0_fao_evapotranspiration",
    "shortwave_radiation_sum","hdd_heating_degree_days_base_65",
    "cdd_cooling_degree_days_base_65","et0_fao_evapotranspiration",
    "wind_speed_10m_max","snowfall_sum",
])

CSV_PATH = "data/weather_log.csv"

HEADERS = [
    "timestamp_utc","date","location","lat","lon",
    # current
    "temp_f","apparent_temp_f","dew_point_f","humidity_pct",
    "precip_today_in","wind_mph","wind_gusts_mph","wind_dir_deg",
    "pressure_hpa","cloud_cover_pct","ghi_wm2","et0_mm_hr",
    "weather_code",
    # today's daily summary
    "temp_max_f","temp_min_f","precip_total_in",
    "et0_daily_mm","ghi_daily_kwh",
    "wind_max_mph","snowfall_cm",
]

def c_to_f(c): return round(c * 9/5 + 32, 1)
def ms_to_mph(ms): return round(ms * 2.23694, 1)
def mm_to_in(mm): return round(mm / 25.4, 3)
def mj_to_kwh(mj): return round(mj / 3.6, 2)

def fetch_location(loc):
    params = {
        "latitude": loc["lat"], "longitude": loc["lon"],
        "current": CURRENT_VARS,
        "daily": ",".join([
            "temperature_2m_max","temperature_2m_min",
            "precipitation_sum","et0_fao_evapotranspiration",
            "shortwave_radiation_sum","wind_speed_10m_max","snowfall_sum",
        ]),
        "temperature_unit": "celsius",
        "wind_speed_unit": "ms",
        "precipitation_unit": "mm",
        "timezone": "auto",
        "forecast_days": "1",
    }
    r = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def build_row(loc, data):
    now = datetime.now(timezone.utc)
    cur = data["current"]
    day = data["daily"]

    return {
        "timestamp_utc":   now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "date":            now.strftime("%Y-%m-%d"),
        "location":        loc["name"],
        "lat":             loc["lat"],
        "lon":             loc["lon"],
        # current
        "temp_f":          c_to_f(cur["temperature_2m"]),
        "apparent_temp_f": c_to_f(cur["apparent_temperature"]),
        "dew_point_f":     c_to_f(cur["dew_point_2m"]),
        "humidity_pct":    cur["relative_humidity_2m"],
        "precip_today_in": mm_to_in(cur["precipitation"]),
        "wind_mph":        ms_to_mph(cur["wind_speed_10m"]),
        "wind_gusts_mph":  ms_to_mph(cur.get("wind_gusts_10m", 0)),
        "wind_dir_deg":    cur["wind_direction_10m"],
        "pressure_hpa":    round(cur["surface_pressure"], 1),
        "cloud_cover_pct": cur["cloud_cover"],
        "ghi_wm2":         round(cur["shortwave_radiation"], 0),
        "et0_mm_hr":       round(cur["et0_fao_evapotranspiration"], 3),
        "weather_code":    cur["weather_code"],
        # daily
        "temp_max_f":      c_to_f(day["temperature_2m_max"][0]),
        "temp_min_f":      c_to_f(day["temperature_2m_min"][0]),
        "precip_total_in": mm_to_in(day["precipitation_sum"][0]),
        "et0_daily_mm":    round(day["et0_fao_evapotranspiration"][0], 2),
        "ghi_daily_kwh":   mj_to_kwh(day["shortwave_radiation_sum"][0]),
        "wind_max_mph":    ms_to_mph(day["wind_speed_10m_max"][0]),
        "snowfall_cm":     round(day["snowfall_sum"][0], 1),
    }

def main():
    os.makedirs("data", exist_ok=True)
    file_exists = os.path.exists(CSV_PATH)

    rows = []
    for loc in LOCATIONS:
        try:
            data = fetch_location(loc)
            row = build_row(loc, data)
            rows.append(row)
            print(f"✓ {loc['name']}: {row['temp_f']}°F")
        except Exception as e:
            print(f"✗ {loc['name']}: {e}")

    if not rows:
        print("No data fetched — skipping commit")
        return

    with open(CSV_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        if not file_exists or os.path.getsize(CSV_PATH) == 0:
            writer.writeheader()
        writer.writerows(rows)

    print(f"Appended {len(rows)} rows to {CSV_PATH}")

if __name__ == "__main__":
    main()
