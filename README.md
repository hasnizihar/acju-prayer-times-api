# SalahSL API

SalahSL API is a developer-friendly REST API for accessing Sri Lankan prayer times using data sourced from the All Ceylon Jamiyyathul Ulama (ACJU).

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

> This is an independent project and is not an official ACJU API. Prayer-time data is sourced from published documents.

## Overview

SalahSL API provides an independent JSON REST API that maps Sri Lankan geographic coordinates to appropriate prayer-time regions, returning accurate daily and monthly prayer times. The API is designed for multiple projects and can serve as a backend for mobile apps, widgets, and web applications.

## Production API

**Base URL:**
`https://salahsl.vercel.app`

## Documentation

**API Guide & Playground:**
`https://salahsl.vercel.app/guide`

## Quick Start

Get today's prayer times for a specific coordinate (e.g. Kandy):

```bash
curl "https://salahsl.vercel.app/api/v1/prayer-times/today?lat=7.2906&lng=81.6337"
```

**Example Response:**

```json
{
  "data": {
    "location": {
      "id": 5,
      "slug": "kandy-matale-nuwara-eliya",
      "name": "Kandy, Matale, Nuwara Eliya",
      "resolution": {
        "method": "coordinates",
        "district": "Kandy",
        "ds_division": "Kandy Four Gravets",
        "confidence": "high"
      }
    },
    "date": "2026-08-25",
    "prayer_times": {
      "fajr": "04:37",
      "sunrise": "05:56",
      "dhuhr": "12:07",
      "asr": "15:15",
      "maghrib": "18:16",
      "isha": "19:26"
    }
  },
  "meta": {
    "source": {
      "name": "All Ceylon Jamiyyathul Ulama",
      "abbreviation": "ACJU",
      "url": "https://www.acju.lk/prayer-times/"
    }
  }
}
```

## API Endpoints

All data endpoints are prefixed with `/api/v1`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Root infrastructure health check |
| `GET` | `/api/v1/health` | API status and database connectivity |
| `GET` | `/api/v1/metadata` | General dataset metadata |
| `GET` | `/api/v1/locations` | List all available prayer-time regions |
| `GET` | `/api/v1/locations/resolve?lat=&lng=` | Resolve coordinates to a region |
| `GET` | `/api/v1/locations/:slug` | Get details for a specific region |
| `GET` | `/api/v1/prayer-times/today?lat=&lng=` | Today's times via GPS coordinates |
| `GET` | `/api/v1/prayer-times/today?location=` | Today's times via location slug |
| `GET` | `/api/v1/prayer-times/today/all` | Today's times for all locations |
| `GET` | `/api/v1/prayer-times/:slug/:date` | Times for a specific date (YYYY-MM-DD) |
| `GET` | `/api/v1/prayer-times/:slug/:year/:month` | All times for a specific month |
| `GET` | `/api/v1/prayer-times/:slug?from=X&to=Y` | Times for a custom date range |

## Location Resolution

The API includes built-in geographic resolution. When querying endpoints using `?lat=` and `?lng=`, the system:
1. Maps the coordinate to a Sri Lankan District and Divisional Secretariat (DS).
2. Maps the District/DS to the correct ACJU prayer-time region.
3. Returns a `resolution` metadata object indicating confidence.

If coordinates fall outside Sri Lanka, the API will return a `400 Bad Request`.

## Data Source & Attribution

Prayer-time data is sourced from:
**All Ceylon Jamiyyathul Ulama (ACJU)**

- Source URL: https://www.acju.lk/prayer-times/
- The API normalizes this data into a digital format.
- **SalahSL API** is the software/service layer, and **ACJU** is the source of the prayer-time data.
- This project does not imply official endorsement, ownership, or affiliation with ACJU.

## Environment Variables

For local development and deploying the documentation site, the following environment variables are used:

- `NEXT_PUBLIC_API_BASE_URL`: The base URL used by the frontend documentation application to communicate with the API. In production, this is set to `https://salahsl.vercel.app`.
- `SUPABASE_URL`: Supabase project URL (used by backend API).
- `SUPABASE_ANON_KEY`: Supabase anon key (used by backend API).

## Local Development

```bash
# Install dependencies
npm install

# Start the API server
npm run dev

# Start the documentation site
npm run build && cd acju-prayer-times-docs && npm run start
```

## Project Structure

```
project/
├── acju-prayer-times-docs/ # Next.js documentation and playground
├── api/                    # Express.js REST API
├── data/                   # Raw data and extraction outputs
├── docs/                   # Additional markdown documentation
├── scripts/                # Data extraction and utility scripts
├── supabase/               # Database schema and migrations
├── tests/                  # API integration tests
└── README.md               # Main repository documentation
```

## Deployment

The API is deployed on Vercel as a serverless Node.js application. 
The documentation portal is deployed as a separate Next.js Vercel build within the same monorepo setup using the `vercel.json` rewrites.

## Versioning

The API uses semantic versioning and is currently at **v1.0.0**. 

## License

The source code for SalahSL API is released under the MIT License. Geographic data and prayer-time datasets may be subject to their respective third-party licenses and attribution requirements. See the `LICENSE` file for details.
