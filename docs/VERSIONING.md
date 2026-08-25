# API Versioning

This project adheres to strict, predictable API versioning to ensure frontend consumers and mobile apps do not break when internal features are updated.

## Version 1 (`/api/v1/`)
Currently, all API endpoints are mounted under `/api/v1/`.

### Backwards Compatibility
The `v1` namespace guarantees the following:
- **No breaking response format changes.** The JSON shape (envelopes like `data`, `meta`, `source`) will remain stable.
- **Additive fields only.** If new fields are added (e.g. `hijri_date`), they will simply appear alongside existing fields without breaking existing implementations.
- Bug fixes will be deployed seamlessly under `v1`.

### When will `v2` be created?
A `/api/v2/` namespace will be implemented if:
- Field names must change (e.g., `prayer_times` to `salah_times`).
- The envelope structure is significantly revised.
- Authentication changes drastically affect existing integrations.

If `v2` is introduced, `v1` will remain operational alongside it with a clearly documented deprecation migration path for developers.
