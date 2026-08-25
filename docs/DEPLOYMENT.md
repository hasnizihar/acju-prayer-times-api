# Deployment Guide

The API is structured as an Express.js application backed by a Supabase PostgreSQL database. It is designed to be easily deployable to any standard Node.js hosting provider (Vercel, Render, Railway, Heroku, DigitalOcean, etc.).

## 1. Database Deployment (Supabase)
The database schema must be hosted on a PostgreSQL instance. The provided migration scripts are tailored for Supabase.

1. Create a [Supabase project](https://supabase.com).
2. Install the Supabase CLI locally.
3. Link the project: `npx supabase link --project-ref <your_project_ref>`
4. Push the schema: `npx supabase db push`
5. Populate the data: Add your service role key to `.env` and run `node scripts/import_data.mjs`.

## 2. Environment Variables
Your production hosting environment must have the following environment variables configured:

```env
# Required for API endpoints to fetch data
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_public_anon_key

# (Optional) Port for the Express server to listen on
PORT=3000
```

> **SECURITY WARNING:** NEVER provide the `SUPABASE_SERVICE_ROLE_KEY` to the public-facing API deployment. The Express backend uses only the `SUPABASE_ANON_KEY` to read the data.

## 3. Server Deployment
Deploy the repository and configure the start command to:
```bash
npm start
```
(which executes `node api/server.js`).

### Rate Limiting Note
If you are deploying behind a reverse proxy or load balancer (which is true for most PaaS like Vercel/Railway), the Express setting `app.set('trust proxy', 1)` is already configured in `api/app.js` to ensure the `express-rate-limit` middleware correctly identifies client IPs instead of rate-limiting the load balancer itself.
