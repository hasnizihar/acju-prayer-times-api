# Contributing

Thank you for your interest in improving the SalahSL API!

This project aims to provide the Sri Lankan developer community with a pristine, well-documented, machine-readable dataset for prayer times.

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hasnizihar/salahsl-api.git
   cd salahsl-api
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in your Supabase connection strings.
   *Note: You will need a local or remote PostgreSQL database instance configured with the schema in `supabase/migrations/`.*
4. **Run tests:**
   ```bash
   npm test
   ```
   *Integration tests require a live database connection configured in your `.env`.*
5. **Start the API:**
   ```bash
   npm start
   ```

## Adding/Updating Dataset Years

The current JSON dataset is located in `data/prayer-times/`. To add a new year:
1. Extract the JSON payload into the new year folder.
2. Update the `import_data.mjs` script (or write a versioned wrapper) to parse the new year's directory structure.
3. Add tests verifying the new year's accessibility.
4. Verify the database using `node scripts/verify_database.mjs`.

## Coding Standards
- All code must pass existing Jest integration tests.
- Keep the REST API independent of the database ORM syntax where possible.
- Any new endpoints must be fully documented in `openapi.yaml`.

## Submitting Pull Requests
- Create a feature branch.
- Add/update tests corresponding to your changes.
- Ensure GitHub Actions CI tests pass.
- Submit a PR with a clear summary of your changes.
