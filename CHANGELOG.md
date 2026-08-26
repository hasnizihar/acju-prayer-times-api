# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-08-26
### Added
- Initial `/api/v1/` REST API structure.
- Public read-only endpoints (`/health`, `/locations`, `/prayer-times/today`, `/prayer-times/today/all`, `/prayer-times/{slug}/{date}`, `/prayer-times/{slug}/{year}/{month}`).
- Core dataset covering 13 administrative locations in Sri Lanka.
- 156 monthly source mappings pointing to original ACJU PDFs.
- 4,758 total extracted daily source rows.
- Partial unique indexes applied to perfectly handle 13 anomaly dates (e.g., February 29th, 2026).
- Express rate-limiting middleware (100req/min).
- Caching headers (`Cache-Control`) for historical and future dates.
- Comprehensive `openapi.yaml` specification.
- Full suite of API integration tests.
