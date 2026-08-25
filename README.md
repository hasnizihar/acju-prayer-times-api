# ACJU Prayer Times API

> An independent REST API providing programmatic access to prayer-time data published by the All Ceylon Jamiyyathul Ulama (ACJU), with Sri Lanka geographic location resolution.

## Independent Project

Developed by **KR Hasni Zihar**. Prayer-time data is sourced from the **All Ceylon Jamiyyathul Ulama (ACJU)**. This project is not an official ACJU API unless explicitly authorized by ACJU.

## Data Source

The prayer-time data is sourced from the **All Ceylon Jamiyyathul Ulama (ACJU)** official prayer-time publications:

https://www.acju.lk/prayer-times/

ACJU is the source of the underlying prayer-time schedules. This project extracts, validates, normalizes, and exposes that information through a developer-oriented API.

For the original source material, refer to the ACJU website.

---

### What is it?
The ACJU Prayer Times API is a public, developer-first REST API for Sri Lanka. It provides structured, validated daily prayer times (sourced from ACJU) via a modern, scalable backend.

### What does it provide?
- Daily, monthly, and date-range prayer times for all 13 ACJU prayer-time regions.
- **Native GPS Resolution:** It automatically and deterministically maps user coordinates (latitude/longitude) to the correct ACJU region, bridging the gap between raw GPS data and administrative Sri Lankan boundaries (ADM2/ADM3).

### How do I use it?
The killer feature of this API is **GPS-based resolution**. Developers do not need to hardcode Sri Lankan districts, geographic bounds, or ACJU regions into their apps.

Just pass the user's coordinates:
```http
GET /api/v1/prayer-times/today?lat=7.2906&lng=81.6337
```

### What does it return?
The API returns precisely typed prayer times (using `Asia/Colombo` timezone), complete with geographic resolution metadata indicating how the region was mapped.

```json
{
  "data": {
    "location": {
      "slug": "batticaloa-ampara",
      "name": "Batticaloa & Ampara",
      "resolution": {
        "method": "coordinates",
        "district": "Batticaloa",
        "ds_division": "Manmunai North",
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
  },
  "source": {
    "provider": "ACJU",
    "source_page": "https://www.acju.lk/prayer-times/"
  }
}
```

### Where is the documentation?
Detailed documentation is available in the `/docs` directory:
- [OpenAPI Specification](openapi.yaml)
- [API Reference](docs/API.md)
- [Location Resolution Contract](docs/LOCATION_RESOLUTION.md)
- [Data Methodology & Source](docs/DATA_SOURCE.md)
- [Data Quality & Anomalies](docs/DATA_QUALITY.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)

---

## Available Endpoints

* **`GET /health`** - Lightweight infrastructure health check
* **`GET /api/v1/metadata`** - Dataset metadata, provider info, and versioning
* **`GET /api/v1/health`** - API status & data counts
* **`GET /api/v1/locations`** - List all 13 locations
* **`GET /api/v1/locations/resolve?lat=&lng=`** - Resolve GPS coordinates to an ACJU location
* **`GET /api/v1/locations/:slug`** - Get single location details
* **`GET /api/v1/prayer-times/today?lat=&lng=`** - Today's times (via coordinates or `?location=`)
* **`GET /api/v1/prayer-times/today/all`** - Today's times for ALL locations
* **`GET /api/v1/prayer-times/:location/:date`** - Exact date query
* **`GET /api/v1/prayer-times/:location/:year/:month`** - Whole month query
* **`GET /api/v1/prayer-times/:location?from=X&to=Y`** - Custom date range query

## Features
- **Public & Keyless**: No authentication required for reading data.
- **Strictly Typed**: PostgreSQL `DATE` types enforce correct calendar days.
- **Traceability**: Every record attributes ACJU as the source data provider.
- **Rate Limited**: Intelligent tiered rate limits (30 - 300 req/min).
- **Cached**: Optimized `Cache-Control` headers for fast, scalable retrieval.

Geographic resolution is deterministic and based on Sri Lankan administrative boundaries with explicitly documented ACJU region mappings. Boundary geometry is provided by the [geoBoundaries](https://www.geoboundaries.org) Open Database (derived from OCHA and Survey Department of Sri Lanka data).
