const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { formatInTimeZone } = require('date-fns-tz');
const rateLimit = require('express-rate-limit');
const { resolveSriLankaLocation } = require('./utils/sriLankaGeoResolver');
const { resolveACJULocation } = require('./utils/acjuLocationResolver');

const app = express();
app.use(cors());
app.use(express.json());

// Trust proxy for accurate rate-limiting if deployed behind a load balancer
app.set('trust proxy', 1);

const createLimiter = (maxRequests, windowMins = 1) => rateLimit({
  windowMs: windowMins * 60 * 1000, 
  max: maxRequests, 
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: `Too many requests, please try again later.`
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generousLimiter = createLimiter(300); // 300 req/min for /health, /locations
const moderateLimiter = createLimiter(100); // 100 req/min for /locations/resolve, /today
const strictLimiter = createLimiter(30);    // 30 req/min for /date ranges, large queries

// Cache middleware
const cacheMiddleware = (req, res, next) => {
  if (req.path.includes('/today')) {
    res.set('Cache-Control', 'public, max-age=300'); // 5 mins
  } else if (req.path.includes('/health') || req.path.includes('/resolve')) {
    res.set('Cache-Control', 'no-store');
  } else if (req.path.match(/\/\d{4}\/\d{2}$/)) { // Monthly (e.g. /2026/08)
    res.set('Cache-Control', 'public, max-age=604800'); // 7 days (cache heavily)
  } else {
    res.set('Cache-Control', 'public, max-age=86400'); // 1 day
  }
  next();
};

// Root health check for uptime monitors
app.get('/health', (req, res) => res.json({ status: "ok" }));

// Redirect root to GitHub repository for documentation
app.get('/', (req, res) => {
  res.redirect('https://github.com/hasnizihar/acju-prayer-times-api');
});

app.use('/api/v1/health', generousLimiter);
app.use('/api/v1/locations$', generousLimiter);
app.use('/api/v1/locations/resolve', moderateLimiter);
app.use('/api/v1/locations/:slug', generousLimiter);
app.use('/api/v1/prayer-times/today', moderateLimiter);
app.use('/api/v1/prayer-times/:slug', strictLimiter);
app.use('/api/v1/prayer-times/:slug/:date', strictLimiter);
app.use('/api/v1/prayer-times/:slug/:year/:month', strictLimiter);

app.use('/api/v1', cacheMiddleware);

// Allow providing a mocked/injected supabase client for testing
let supabase;
app.use((req, res, next) => {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      if (process.env.NODE_ENV !== 'test') {
        return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Database configuration missing.' }});
      }
    } else {
      supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    }
  }
  req.supabase = supabase;
  next();
});

// For testing injection
app.setSupabaseClient = (client) => {
  supabase = client;
};

// Response Formatter
const formatResponse = (data, meta = {}, documentSource = null) => {
  const baseMeta = {
    ...meta,
    source: {
      name: "All Ceylon Jamiyyathul Ulama",
      abbreviation: "ACJU",
      url: "https://www.acju.lk/prayer-times/",
      ...(documentSource && { document: documentSource })
    }
  };
  return {
    data,
    meta: baseMeta
  };
};

const sendError = (res, status, code, message) => {
  return res.status(status).json({
    error: { code, message }
  });
};

// 1. Get all active locations
app.get('/api/v1/locations', async (req, res) => {
  const { data, error } = await req.supabase
    .from('locations')
    .select('id, slug, name, districts')
    .eq('is_active', true)
    .order('name');

  if (error) return sendError(res, 500, 'DATABASE_ERROR', 'Failed to retrieve locations.');
  
  res.json(formatResponse(data, { count: data.length }));
});

// 1.5 Geo Resolver Endpoint
app.get('/api/v1/locations/resolve', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return sendError(res, 400, 'MISSING_COORDINATES', 'Latitude and longitude parameters are required.');
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return sendError(res, 400, 'INVALID_COORDINATES', 'Coordinates must be valid numbers.');
  }

  try {
    const slLocation = resolveSriLankaLocation(latitude, longitude);
    
    if (!slLocation || !slLocation.district) {
      return sendError(res, 404, 'ACJU_LOCATION_UNRESOLVED', 'The coordinates are within Sri Lanka, but a district mapping could not be determined.');
    }

    const acjuMapping = resolveACJULocation(slLocation.district, slLocation.ds_division);
    if (!acjuMapping) {
      return sendError(res, 404, 'ACJU_LOCATION_UNRESOLVED', 'The coordinates are within Sri Lanka, but an ACJU prayer-time region could not be determined.');
    }

    res.json(formatResponse({
      country: { code: 'LK', name: 'Sri Lanka' },
      coordinates: { latitude, longitude },
      resolved: {
        method: "coordinates",
        district: slLocation.district,
        ds_division: slLocation.ds_division || null,
        acju_location: {
          slug: acjuMapping.acju_slug
        },
        confidence: acjuMapping.confidence
      }
    }));
  } catch (err) {
    if (err.code === 'LOCATION_OUTSIDE_SRI_LANKA') {
      return sendError(res, 400, 'LOCATION_OUTSIDE_SRI_LANKA', 'This API currently supports locations within Sri Lanka only.');
    }
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to resolve location.');
  }
});

// 2. Get single location
app.get('/api/v1/locations/:slug', async (req, res) => {
  const { data, error } = await req.supabase
    .from('locations')
    .select('id, slug, name, districts')
    .eq('slug', req.params.slug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Prayer-time location was not found.');
  }
  
  res.json(formatResponse(data));
});

// 0. Base API Metadata Endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: "ACJU Prayer Times API",
    version: "1.0.0",
    status: "operational",
    docs: "/docs" // Optional future OpenAPI viewer
  });
});

// 0.1 Detailed Metadata Endpoint
app.get('/api/v1/metadata', (req, res) => {
  res.json({
    data: {
      provider: "ACJU",
      country: "LK",
      timezone: "Asia/Colombo",
      current_year: 2026,
      locations: 13,
      monthly_sources: 156,
      last_verified: "2026-08-25",
      api_version: "1.0.0"
    }
  });
});

// 0.1 Health Endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    const { count: locCount } = await req.supabase.from('locations').select('*', { count: 'exact', head: true });
    const { count: sourceCount } = await req.supabase.from('monthly_sources').select('*', { count: 'exact', head: true });
    const { count: validCount } = await req.supabase.from('prayer_times').select('*', { count: 'exact', head: true }).not('date', 'is', null);
    const { count: anomalyCount } = await req.supabase.from('prayer_times').select('*', { count: 'exact', head: true }).is('date', null);

    res.json({
      status: "ok",
      database: "connected",
      provider: "ACJU",
      timezone: "Asia/Colombo",
      available_years: [2026],
      locations: locCount || 0,
      monthly_sources: sourceCount || 0,
      valid_prayer_records: validCount || 0,
      source_anomalies: anomalyCount || 0
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Database connection failed." });
  }
});

// Alias for /prayer-times/today/all
app.get('/api/v1/prayer-times/today/all', async (req, res) => {
  let dateParam = formatInTimeZone(new Date(), 'Asia/Colombo', 'yyyy-MM-dd');
  
  const { data: prayerData, error: prayerErr } = await req.supabase
    .from('prayer_times')
    .select('date, fajr, sunrise, dhuhr, asr, maghrib, isha, locations(id, slug, name), monthly_sources(pdf_url, file_name)')
    .eq('date', dateParam)
    .not('date', 'is', null); // Exclude anomalous records just in case

  if (prayerErr) return sendError(res, 500, 'DATABASE_ERROR', 'Failed to retrieve prayer times.');
  if (!prayerData || prayerData.length === 0) return sendError(res, 404, 'DATA_NOT_AVAILABLE', 'Prayer times are not available for this date.');

  // Sort by location name
  prayerData.sort((a, b) => {
    const nameA = (a.locations && a.locations.name) ? a.locations.name : '';
    const nameB = (b.locations && b.locations.name) ? b.locations.name : '';
    return nameA.localeCompare(nameB);
  });

  const locationsList = prayerData.map(p => ({
    location: p.locations,
    prayer_times: {
      fajr: p.fajr.substring(0, 5),
      sunrise: p.sunrise.substring(0, 5),
      dhuhr: p.dhuhr.substring(0, 5),
      asr: p.asr.substring(0, 5),
      maghrib: p.maghrib.substring(0, 5),
      isha: p.isha.substring(0, 5),
    }
  }));

  res.json(formatResponse(
    { date: dateParam, locations: locationsList }, 
    { count: locationsList.length }
  ));
});

// Alias for /prayer-times/today?location=... pattern mentioned in requirements
app.get('/api/v1/prayer-times/today', async (req, res) => {
  let locationSlug = req.query.location;
  const { lat, lng } = req.query;
  let resolutionMeta = null;
  
  if (!locationSlug && (lat && lng)) {
    try {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (isNaN(latitude) || isNaN(longitude)) {
        return sendError(res, 400, 'INVALID_COORDINATES', 'Coordinates must be valid numbers.');
      }
      const slLocation = resolveSriLankaLocation(latitude, longitude);
      if (!slLocation || !slLocation.district) {
        return sendError(res, 404, 'ACJU_LOCATION_UNRESOLVED', 'The coordinates are within Sri Lanka, but a district mapping could not be determined.');
      }
      const acjuMapping = resolveACJULocation(slLocation.district, slLocation.ds_division);
      if (!acjuMapping) {
        return sendError(res, 404, 'ACJU_LOCATION_UNRESOLVED', 'The coordinates are within Sri Lanka, but an ACJU prayer-time region could not be determined.');
      }
      locationSlug = acjuMapping.acju_slug;
      resolutionMeta = {
        method: "coordinates",
        district: slLocation.district,
        ds_division: slLocation.ds_division || null,
        confidence: acjuMapping.confidence
      };
    } catch (err) {
      if (err.code === 'LOCATION_OUTSIDE_SRI_LANKA') {
        return sendError(res, 400, 'LOCATION_OUTSIDE_SRI_LANKA', 'This API currently supports locations within Sri Lanka only.');
      }
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to resolve location.');
    }
  }

  if (!locationSlug) {
    return sendError(res, 400, 'INVALID_REQUEST', 'Missing location or lat/lng query parameters.');
  }
  
  let dateParam = formatInTimeZone(new Date(), 'Asia/Colombo', 'yyyy-MM-dd');
  
  const { data: locData, error: locErr } = await req.supabase
    .from('locations')
    .select('id, slug, name')
    .eq('slug', locationSlug)
    .eq('is_active', true)
    .single();

  if (locErr || !locData) return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Prayer-time location was not found.');
  
  // Attach resolution meta to locData if present
  if (resolutionMeta) {
    locData.resolution = resolutionMeta;
  }

  const { data: prayerData, error: prayerErr } = await req.supabase
    .from('prayer_times')
    .select('date, fajr, sunrise, dhuhr, asr, maghrib, isha, monthly_sources(pdf_url, file_name)')
    .eq('location_id', locData.id)
    .eq('date', dateParam)
    .single();

  if (prayerErr || !prayerData) return sendError(res, 404, 'DATA_NOT_AVAILABLE', 'Prayer times are not available for this date.');

  const result = {
    location: locData,
    date: prayerData.date,
    prayer_times: {
      fajr: prayerData.fajr.substring(0, 5),
      sunrise: prayerData.sunrise.substring(0, 5),
      dhuhr: prayerData.dhuhr.substring(0, 5),
      asr: prayerData.asr.substring(0, 5),
      maghrib: prayerData.maghrib.substring(0, 5),
      isha: prayerData.isha.substring(0, 5),
    }
  };

  const sourceMeta = {};
  if (prayerData.monthly_sources) {
    sourceMeta.file_url = prayerData.monthly_sources.pdf_url;
    sourceMeta.file_name = prayerData.monthly_sources.file_name;
  }

  res.json(formatResponse(result, {}, sourceMeta));
});

// 2. Get times by specific date
app.get('/api/v1/prayer-times/:slug/:date', async (req, res) => {
  let dateParam = req.params.date;
  const locationSlug = req.params.slug;
  
  if (dateParam === 'today') {
    // Determine today's date in Sri Lanka
    dateParam = formatInTimeZone(new Date(), 'Asia/Colombo', 'yyyy-MM-dd');
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return sendError(res, 400, 'INVALID_DATE', 'Date must use YYYY-MM-DD format.');
  }

  // Fetch location first to ensure it exists
  const { data: locData, error: locErr } = await req.supabase
    .from('locations')
    .select('id, slug, name')
    .eq('slug', locationSlug)
    .eq('is_active', true)
    .single();

  if (locErr || !locData) {
    return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Prayer-time location was not found.');
  }

  // Fetch prayer times and associated source
  const { data: prayerData, error: prayerErr } = await req.supabase
    .from('prayer_times')
    .select('date, fajr, sunrise, dhuhr, asr, maghrib, isha, monthly_sources(pdf_url, file_name)')
    .eq('location_id', locData.id)
    .eq('date', dateParam)
    .single();

  if (prayerErr || !prayerData) {
    return sendError(res, 404, 'DATA_NOT_AVAILABLE', 'Prayer times are not available for this date.');
  }

  const result = {
    location: locData,
    date: prayerData.date,
    prayer_times: {
      fajr: prayerData.fajr.substring(0, 5),
      sunrise: prayerData.sunrise.substring(0, 5),
      dhuhr: prayerData.dhuhr.substring(0, 5),
      asr: prayerData.asr.substring(0, 5),
      maghrib: prayerData.maghrib.substring(0, 5),
      isha: prayerData.isha.substring(0, 5),
    }
  };

  const sourceMeta = {};
  if (prayerData.monthly_sources) {
    sourceMeta.file_url = prayerData.monthly_sources.pdf_url;
    sourceMeta.file_name = prayerData.monthly_sources.file_name;
  }

  res.json(formatResponse(result, {}, sourceMeta));
});

// 5. Monthly prayer times
app.get('/api/v1/prayer-times/:slug/:year/:month', async (req, res) => {
  const locationSlug = req.params.slug;
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);
  
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return sendError(res, 400, 'INVALID_DATE', 'Year and month must be valid numbers.');
  }
  
  // Format dates for the query
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`; // 31 works safely for <= comparison

  // Fetch location first to ensure it exists
  const { data: locData, error: locErr } = await req.supabase
    .from('locations')
    .select('id, slug, name')
    .eq('slug', locationSlug)
    .eq('is_active', true)
    .single();

  if (locErr || !locData) {
    return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Prayer-time location was not found.');
  }
  
  const { data: prayerData, error: prayerErr } = await req.supabase
    .from('prayer_times')
    .select('date, fajr, sunrise, dhuhr, asr, maghrib, isha, monthly_sources(pdf_url, file_name)')
    .eq('location_id', locData.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (prayerErr) {
    return sendError(res, 500, 'DATABASE_ERROR', 'Failed to retrieve prayer times.');
  }

  if (!prayerData || prayerData.length === 0) {
    return sendError(res, 404, 'DATA_NOT_AVAILABLE', 'Prayer times are not available for this month.');
  }

  const days = prayerData.map(p => ({
    date: p.date,
    prayer_times: {
      fajr: p.fajr.substring(0, 5),
      sunrise: p.sunrise.substring(0, 5),
      dhuhr: p.dhuhr.substring(0, 5),
      asr: p.asr.substring(0, 5),
      maghrib: p.maghrib.substring(0, 5),
      isha: p.isha.substring(0, 5),
    }
  }));

  const sourceMeta = {};
  if (prayerData[0].monthly_sources) {
    sourceMeta.file_url = prayerData[0].monthly_sources.pdf_url;
    sourceMeta.file_name = prayerData[0].monthly_sources.file_name;
  }

  res.json(formatResponse(
    { location: locData, days },
    { location: locationSlug, year, month, count: days.length },
    sourceMeta
  ));
});

// 6. Date Range Endpoint
app.get('/api/v1/prayer-times/:slug', async (req, res) => {
  // If location only is provided but with query parameters from/to
  const locationSlug = req.params.slug;
  const { from, to } = req.query;

  if (locationSlug === 'today') {
     // Safety catch if routing fails to differentiate
     return sendError(res, 400, 'INVALID_REQUEST', 'Missing location parameter for today.');
  }
  
  if (!from || !to) {
     return sendError(res, 400, 'INVALID_REQUEST', 'Missing from/to query parameters for date range.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return sendError(res, 400, 'INVALID_DATE', 'Dates must use YYYY-MM-DD format.');
  }
  
  if (new Date(from) > new Date(to)) {
    return sendError(res, 400, 'INVALID_RANGE', 'From date must be before or equal to To date.');
  }
  
  // Calculate difference in days to prevent massive queries
  const diffTime = Math.abs(new Date(to) - new Date(from));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  if (diffDays > 366) {
     return sendError(res, 400, 'INVALID_RANGE', 'Date range cannot exceed 1 year.');
  }

  // Fetch location
  const { data: locData, error: locErr } = await req.supabase
    .from('locations')
    .select('id, slug, name')
    .eq('slug', locationSlug)
    .eq('is_active', true)
    .single();

  if (locErr || !locData) {
    return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Prayer-time location was not found.');
  }
  
  const { data: prayerData, error: prayerErr } = await req.supabase
    .from('prayer_times')
    .select('date, fajr, sunrise, dhuhr, asr, maghrib, isha')
    .eq('location_id', locData.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (prayerErr) {
    return sendError(res, 500, 'DATABASE_ERROR', 'Failed to retrieve prayer times.');
  }

  if (!prayerData || prayerData.length === 0) {
    return sendError(res, 404, 'DATA_NOT_AVAILABLE', 'Prayer times are not available for this range.');
  }

  const days = prayerData.map(p => ({
    date: p.date,
    prayer_times: {
      fajr: p.fajr.substring(0, 5),
      sunrise: p.sunrise.substring(0, 5),
      dhuhr: p.dhuhr.substring(0, 5),
      asr: p.asr.substring(0, 5),
      maghrib: p.maghrib.substring(0, 5),
      isha: p.isha.substring(0, 5),
    }
  }));

  res.json(formatResponse(
    { location: locData, days },
    { location: locationSlug, from, to, count: days.length }
  ));
});

module.exports = app;
