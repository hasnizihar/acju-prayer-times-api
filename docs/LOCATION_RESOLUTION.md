# Location Resolution Contract

The ACJU Prayer Times API provides a native, highly accurate geographic resolver to convert arbitrary GPS coordinates into a valid ACJU prayer-time timetable.

## What does the API accept?
The API natively accepts `lat` (latitude) and `lng` (longitude) query parameters via two endpoints:
- `GET /api/v1/locations/resolve?lat=&lng=`
- `GET /api/v1/prayer-times/today?lat=&lng=`

## What does it return?
When successfully resolved, the API returns a structured metadata block detailing exactly how it matched the coordinates to an ACJU location.

```json
{
  "country": {
    "code": "LK",
    "name": "Sri Lanka"
  },
  "coordinates": {
    "latitude": 7.2906,
    "longitude": 81.6337
  },
  "resolved": {
    "method": "coordinates",
    "district": "Batticaloa",
    "ds_division": "Manmunai North",
    "acju_location": {
      "slug": "batticaloa-ampara"
    },
    "confidence": "high"
  }
}
```

### Confidence Levels
- **`high`**: The location maps cleanly to a definitive ACJU region with no geographic ambiguity.
- **`verified`**: The location belongs to a district with known exceptions (e.g. Ampara), but the API used the Divisional Secretariat (DS) boundaries to explicitly verify the correct ACJU mapping.
- **`mapped`**: The location mapped to a district with exceptions, but the DS division could not be definitively matched. The API falls back to the most probable district default.

## What happens when it can't determine the region?
If the coordinates fall within Sri Lanka, but our authoritative mapping layer does not contain a rule for the matched administrative boundaries, the API intentionally refuses to guess:
```http
404 ACJU_LOCATION_UNRESOLVED
```

## What happens outside Sri Lanka?
Because this API exclusively serves Sri Lankan ACJU data, any coordinates failing the Sri Lankan territorial bounds check will fail instantly:
```http
400 LOCATION_OUTSIDE_SRI_LANKA
```

## Does the API use Google Maps, Mapbox, or external Geocoding?
**No.** All geographic resolution is performed strictly offline using the OCHA/Survey Department of Sri Lanka bounding geometries (`ADM2` and `ADM3` level GeoJSONs) via a high-performance point-in-polygon algorithm. This guarantees zero latency overhead and absolute privacy.

## Is user GPS stored?
**No.** Latitude and longitude data is held strictly in memory for the duration of the request and is immediately discarded. It is not written to the Supabase database, logged, or shared with third parties.
