# Data Quality & Anomalies

## The February 2026 Anomaly

The ACJU February 2026 source documents contain a `29-Feb-2026` row for all 13 locations, even though **2026 is not a leap year** (February only has 28 days in 2026).

This indicates that the ACJU dataset was likely copied or modeled from 2024 (a leap year) and the extra day was not removed when publishing the 2026 tables.

### How this API handles the anomaly
Instead of silently deleting the record or mutating the database schema to store invalid strings as dates, this project takes a strict data engineering approach:

1. **Strict Types:** The canonical `date` column is a strict PostgreSQL `DATE`.
2. **Anomaly Preservation:** When the importer encounters an invalid date string from the source JSON, it sets the database row's `date` to `NULL`, but preserves the original printed date in a secondary text column called `source_date_label` (e.g. `"2026-02-29"`).

### Impact on API Consumers
These 13 anomalous records are **safely excluded** from all calendar-based queries (e.g. `/today`, `/today/all`, date ranges, and specific date lookups).

If you request `GET /api/v1/prayer-times/colombo/2026-02-29`, the API will return a `400 INVALID_DATE` because it is an impossible calendar date, preventing your front-end from needing to become a calendar detective.
