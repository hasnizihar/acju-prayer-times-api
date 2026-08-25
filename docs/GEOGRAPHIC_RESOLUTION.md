# Geographic Resolution Architecture

The ACJU Prayer Times API provides native geographic resolution to convert arbitrary GPS coordinates into valid ACJU prayer-time timetables.

## The Problem
Sri Lanka consists of 25 administrative districts. The ACJU publishes prayer times for 13 composite regions (e.g., combining Colombo, Gampaha, and Kalutara). However, some of these regions do not follow clean district boundaries (e.g., Padiyatalawa and Dehiaththakandiya are in the Ampara district but are assigned to the Badulla/Monaragala ACJU category). 

## Three-Layer Architecture
To prevent the API from guessing or creating opaque geographic errors, resolution happens strictly in three steps:

### 1. Sri Lanka Validation (`sriLankaGeoResolver.js`)
First, the coordinate is checked against Sri Lanka's boundaries (`data/geography/districts.geojson`).
* **If outside Sri Lanka**: Fails immediately with `400 LOCATION_OUTSIDE_SRI_LANKA`.
* **If within Sri Lanka**: The coordinate is resolved to an administrative District using a point-in-polygon check. 
* *(Note: The current `districts.geojson` contains placeholders. For production, official Survey Department District GeoJSON polygons should be loaded into this file.)*

### 2. ACJU Mapping (`acjuLocationResolver.js`)
The resolved District is passed into the ACJU mapping layer (`data/acju/location-mapping.json`), which serves as the canonical ruleset for how Sri Lankan districts map to ACJU categories.
* **If a mapping exists**: Returns the ACJU location slug and a `confidence` level (e.g., `high` or `mapped`).
* **If a mapping cannot be determined reliably**: Fails with `404 ACJU_LOCATION_UNRESOLVED`. We **never** silently guess an ACJU region.

### 3. Prayer Times
The resolved ACJU location slug (`batticaloa-ampara`) is seamlessly used to fetch the timetable.

## Example: `GET /api/v1/prayer-times/today?lat=7.2906&lng=81.6337`

```json
{
  "data": {
    "location": {
      "id": 13,
      "slug": "batticaloa-ampara",
      "name": "Batticaloa District, Ampara District",
      "resolution": {
        "method": "coordinates",
        "district": "Batticaloa",
        "confidence": "high"
      }
    },
    "date": "2026-08-25",
    "prayer_times": {
      "fajr": "04:34",
      "sunrise": "06:08",
      "dhuhr": "12:21",
      "asr": "15:47",
      "maghrib": "18:28",
      "isha": "19:39"
    }
  }
}
```

## Mapping Confidence Levels
* **`high`**: The district natively corresponds exactly to the ACJU region (e.g. Colombo district -> Colombo/Gampaha/Kalutara).
* **`mapped`**: The district maps to an ACJU region, but contains known geographic anomalies that might affect edge-case precision (e.g. Ampara -> Batticaloa/Ampara, despite Padiyatalawa being physically in Ampara but logically in Badulla).
