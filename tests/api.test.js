require('dotenv').config();
const request = require('supertest');
const app = require('../api/app');

// Determine if we have a live database configured
const hasDatabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
const testLabel = hasDatabase ? '' : ' [REQUIRES_REMOTE_DATABASE - SKIPPED]';

describe(`ACJU Prayer Times API${testLabel}`, () => {

  beforeAll(() => {
    // If not testing against a real database, we don't need to mock it,
    // but the endpoints will return 500 SERVER_ERROR as per our app.js logic 
    // when missing configuration in non-test mode. However, in test mode without mock,
    // it will return 500. So we skip the tests.
  });

  const runTest = hasDatabase ? test : test.skip;

  runTest('0. GET /api/v1/health returns system status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.valid_prayer_records).toBe(4745);
    expect(res.body.source_anomalies).toBe(13);
  });

  runTest('1. GET /api/v1/locations returns all locations', async () => {
    const res = await request(app).get('/api/v1/locations');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(13);
    
    // Check structure
    expect(res.body.data[0]).toHaveProperty('slug');
    expect(res.body.data[0]).toHaveProperty('name');
  });

  runTest('2. GET /api/v1/locations/batticaloa-ampara returns specific location', async () => {
    const res = await request(app).get('/api/v1/locations/batticaloa-ampara');
    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe('batticaloa-ampara');
  });

  runTest('3. GET /api/v1/locations/invalid-location returns 404', async () => {
    const res = await request(app).get('/api/v1/locations/invalid-location-slug-123');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LOCATION_NOT_FOUND');
  });

  runTest('3a. GET /api/v1/locations/resolve with valid GPS returns ACJU region', async () => {
    // 7.2906, 81.6337 -> Batticaloa & Ampara bounding box matches
    const res = await request(app).get('/api/v1/locations/resolve?lat=7.2906&lng=81.6337');
    expect(res.status).toBe(200);
    expect(res.body.data.country.code).toBe('LK');
    expect(res.body.data.resolved.acju_location.slug).toBe('batticaloa-ampara');
  });

  runTest('3b. GET /api/v1/locations/resolve outside SL returns 400', async () => {
    // coordinates for London
    const res = await request(app).get('/api/v1/locations/resolve?lat=51.5072&lng=0.1276');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LOCATION_OUTSIDE_SRI_LANKA');
  });

  runTest('4. GET /api/v1/prayer-times/today?location=batticaloa-ampara works', async () => {
    const res = await request(app).get('/api/v1/prayer-times/today?location=batticaloa-ampara');
    // It might return 404 DATA_NOT_AVAILABLE if today's date (e.g. 2024 or 2027) is not in the DB yet,
    // since our DB only has 2026 data.
    if (res.status === 200) {
      expect(res.body.data.location.slug).toBe('batticaloa-ampara');
    } else {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DATA_NOT_AVAILABLE');
    }
  });

  runTest('4b. GET /api/v1/prayer-times/today/all works', async () => {
    const res = await request(app).get('/api/v1/prayer-times/today/all');
    if (res.status === 200) {
      expect(res.body.data.locations).toBeInstanceOf(Array);
      expect(res.body.data.locations.length).toBeGreaterThan(0);
      expect(res.body.meta.count).toBeGreaterThan(0);
    } else {
      expect(res.status).toBe(404);
    }
  });

  runTest('5. GET /api/v1/prayer-times/batticaloa-ampara/2026-08-01 returns exact values', async () => {
    const res = await request(app).get('/api/v1/prayer-times/batticaloa-ampara/2026-08-01');
    expect(res.status).toBe(200);
    expect(res.body.data.location.slug).toBe('batticaloa-ampara');
    expect(res.body.data.date).toBe('2026-08-01');
    
    // Verify against JSON dataset (Fajr: 04:34, Sunrise: 05:56)
    expect(res.body.data.prayer_times.fajr).toBe('04:34');
    expect(res.body.data.prayer_times.sunrise).toBe('05:56');
    
    // Check ACJU attribution
    expect(res.body.meta.source.abbreviation).toBe('ACJU');
  });

  runTest('6. GET /api/v1/prayer-times/batticaloa-ampara/invalid-date returns 400', async () => {
    const res = await request(app).get('/api/v1/prayer-times/batticaloa-ampara/invalid-date');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE');
  });

  runTest('7. GET /api/v1/prayer-times/batticaloa-ampara/2026/08 returns monthly data', async () => {
    const res = await request(app).get('/api/v1/prayer-times/batticaloa-ampara/2026/08');
    expect(res.status).toBe(200);
    expect(res.body.data.days).toBeInstanceOf(Array);
    expect(res.body.data.days.length).toBe(31);
    expect(res.body.meta.count).toBe(31);
    
    // Check file url is present
    expect(res.body.meta.source.document).toHaveProperty('file_url');
  });

  runTest('8. GET /api/v1/prayer-times/batticaloa-ampara/2026/13 returns 400 invalid month', async () => {
    const res = await request(app).get('/api/v1/prayer-times/batticaloa-ampara/2026/13');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE');
  });

  runTest('9. GET /api/v1/prayer-times/batticaloa-ampara?from=2026-08-01&to=2026-08-05 returns date range', async () => {
    const res = await request(app).get('/api/v1/prayer-times/batticaloa-ampara?from=2026-08-01&to=2026-08-05');
    expect(res.status).toBe(200);
    expect(res.body.data.days.length).toBe(5);
  });
  
  runTest('10. GET /api/v1/prayer-times/batticaloa-ampara/2099-01-01 returns 404 unavailable', async () => {
    const res = await request(app).get('/api/v1/prayer-times/batticaloa-ampara/2099-01-01');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DATA_NOT_AVAILABLE');
  });
});
