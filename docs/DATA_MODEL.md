# Data Model

The PostgreSQL database relies on three core tables structured in a relational hierarchy:

```text
locations
    │
    └── monthly_sources
            │
            └── prayer_times
```

## 1. `locations`
Contains the administrative regions used by ACJU to group districts with identical prayer times.
- `id` (PK): Auto-incrementing integer.
- `slug` (Unique): URL-friendly string (e.g. `batticaloa-ampara`).
- `name`: Human-readable label.

## 2. `monthly_sources`
Acts as the provenance bridge, storing metadata about the specific ACJU document the data was parsed from.
- `id` (PK): Auto-incrementing integer.
- `location_id` (FK): Links to `locations.id`.
- `year`, `month`: The period the document covers.
- `file_name`, `pdf_url`, `source_page`: Attribution links.

## 3. `prayer_times`
Contains the actual daily prayer time records.
- `id` (PK): Auto-incrementing integer.
- `location_id` (FK): Links to `locations.id`.
- `source_id` (FK): Links to `monthly_sources.id`.
- `date`: Strict PostgreSQL `DATE` field (e.g. `2026-08-25`). Nullable to accommodate anomalies.
- `source_date_label`: Text field containing the raw date string from ACJU (e.g. `"2026-02-29"`). Only used for anomalies.
- `fajr`, `sunrise`, `dhuhr`, `asr`, `maghrib`, `isha`: Times stored as `TIME` datatype.

## Unique Constraints
To prevent duplicate records without compromising PostgreSQL's handling of `NULL` values, the database utilizes two partial unique indexes on `prayer_times`:

1. **Valid Dates Index**: `UNIQUE(location_id, date) WHERE date IS NOT NULL;`
2. **Anomaly Index**: `UNIQUE(location_id, source_date_label) WHERE date IS NULL;`

These ensure that an import script can be run idempotently (re-run safely without generating duplicate rows) even when handling impossible calendar dates.
