# Data Source & Extraction

This API is independently developed by **KR Hasni Zihar**.

### Ownership & Attribution

| Component | Ownership / Attribution |
| :--- | :--- |
| **API source code** | KR Hasni Zihar (MIT License) |
| **Prayer-time source data** | All Ceylon Jamiyyathul Ulama (ACJU) |
| **Geographic boundary data** | geoBoundaries (derived from OCHA / Survey Dept) |

**Original prayer-time data source:** [ACJU Prayer Times Page](https://www.acju.lk/prayer-times/)

This repository serves as a machine-readable REST API built upon the public PDF and JPG documents published by the ACJU. 

## Dataset Scope
- **Regions:** 13 administrative location groupings across Sri Lanka.
- **Months:** 12 months.
- **Year:** 2026.
- **Source Documents:** 156 PDF files (and their JPG counterparts).

## Extraction Methodology
1. **Scraping:** All 156 PDF files were individually downloaded from the ACJU website's WordPress instance.
2. **Parsing:** The PDFs were processed using `pdfjs-dist` to cleanly extract the tabular data containing `Date`, `Fajr`, `Sunrise`, `Dhuhr`, `Asr`, `Maghrib`, and `Isha`.
3. **Normalization:** The extracted texts were parsed into proper 24-hour time strings (`HH:mm`).
4. **Validation:** Values were checked to ensure logical chronological progression (Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha).

## Provenance
Every database record holds a `source_id` foreign key that joins back to the `monthly_sources` table. This allows the API to attach the exact `file_name` and `pdf_url` of the original ACJU document to API responses.

If a developer questions a specific time (e.g., "Why does your API say 04:34 for August 1st?"), they can query the API for the source document and manually verify it matches the printed ACJU PDF.

> **Disclaimer:** This API is an independent open-source project using prayer-time data published by ACJU. It is not operated, maintained, or officially endorsed by the ACJU.
