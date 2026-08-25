import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { isValidDateStr } from './date_validator.mjs';

const DATA_DIR = path.join(process.cwd(), 'data', 'prayer-times', '2026');

// Required environment variables for importing
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ MISSING CREDENTIALS");
  console.error("Please provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  console.error("Cannot proceed with database import.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== ACJU Prayer Times Data Importer ===\n");
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Data directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  // 1. Pre-flight Validation
  console.log("--- Validating Data Files ---");
  const locations = fs.readdirSync(DATA_DIR).filter(d => fs.statSync(path.join(DATA_DIR, d)).isDirectory());
  
  if (locations.length !== 13) {
    console.error(`❌ Expected 13 locations, found ${locations.length}`);
    process.exit(1);
  }

  let totalMonths = 0;
  let totalDays = 0;
  let anomalousDays = 0;
  const allData = [];

  for (const locSlug of locations) {
    const locPath = path.join(DATA_DIR, locSlug);
    const months = fs.readdirSync(locPath).filter(f => f.endsWith('.json'));
    
    if (months.length !== 12) {
      console.error(`❌ Expected 12 months for ${locSlug}, found ${months.length}`);
      process.exit(1);
    }
    
    for (const monFile of months) {
      const data = JSON.parse(fs.readFileSync(path.join(locPath, monFile), 'utf-8'));
      
      // Basic checks
      if (!data.location_id || !data.days || data.days.length < 28) {
        console.error(`❌ Invalid data in ${locSlug}/${monFile}`);
        process.exit(1);
      }
      
      totalMonths++;
      totalDays += data.days.length;
      allData.push(data);
    }
  }

  if (totalMonths !== 156) {
    console.error(`❌ Expected 156 monthly files, found ${totalMonths}`);
    process.exit(1);
  }
  
  if (totalDays !== 4758) {
    console.error(`❌ Expected 4758 prayer records, found ${totalDays}`);
    process.exit(1);
  }

  console.log(`✅ Validation Passed: 13 Locations, 156 Months, 4758 Records\n`);

  // 2. Database Upserts
  console.log("--- Importing to Supabase ---");
  
  const stats = {
    locations: { inserted: 0, updated: 0 },
    sources: { inserted: 0, updated: 0 },
    prayers: { inserted: 0, updated: 0 }
  };

  // Insert Locations
  const locationMap = new Map(); // slug -> id
  const uniqueLocations = new Map(); // slug -> location_name
  for (const d of allData) {
    if (!uniqueLocations.has(d.location_id)) {
      uniqueLocations.set(d.location_id, d.location_name);
    }
  }

  for (const [slug, name] of uniqueLocations.entries()) {
    const { data: locData, error: locErr } = await supabase
      .from('locations')
      .upsert({ slug, name }, { onConflict: 'slug' })
      .select('id')
      .single();
      
    if (locErr) {
      console.error(`❌ Failed to import location ${slug}:`, locErr.message);
      process.exit(1);
    }
    locationMap.set(slug, locData.id);
    stats.locations.inserted++; // Technically inserted/updated
  }
  
  console.log(`✅ Locations processed: ${stats.locations.inserted}`);

  // Insert Monthly Sources & Prayer Times
  for (const data of allData) {
    const locId = locationMap.get(data.location_id);
    
    // Upsert monthly source
    const { data: sourceData, error: sourceErr } = await supabase
      .from('monthly_sources')
      .upsert({
        location_id: locId,
        year: data.year,
        month: data.month,
        file_name: data.source.source_file,
        pdf_url: data.source.file_url || null,
        file_hash: data.source.file_hash || null,
        source_page: data.source.source_page || 'https://www.acju.lk/prayer-times/'
      }, { onConflict: 'location_id, year, month' })
      .select('id')
      .single();
      
    if (sourceErr) {
      console.error(`❌ Failed to import source ${data.location_id} / ${data.month}:`, sourceErr.message);
      process.exit(1);
    }
    
    stats.sources.inserted++;

    // Batch upsert prayer times for the month
    const prayerRecords = data.days.map(day => {
      const isValid = isValidDateStr(day.date);
      if (!isValid) anomalousDays++;
      return {
        location_id: locId,
        date: isValid ? day.date : null,
        source_date_label: !isValid ? day.date : null,
        fajr: day.prayer_times.fajr,
        sunrise: day.prayer_times.sunrise,
        dhuhr: day.prayer_times.dhuhr,
        asr: day.prayer_times.asr,
        maghrib: day.prayer_times.maghrib,
        isha: day.prayer_times.isha,
        source_id: sourceData.id
      };
    });

    const { error: prayerErr } = await supabase
      .from('prayer_times')
      .upsert(prayerRecords, { onConflict: 'location_id, date, source_date_label' });
      
    if (prayerErr) {
      console.error(`❌ Failed to import prayers for ${data.location_id} / ${data.month}:`, prayerErr.message);
      process.exit(1);
    }
    
    stats.prayers.inserted += prayerRecords.length;
    process.stdout.write(`\rImporting records... [${stats.prayers.inserted}/${totalDays}]`);
  }

  // Insert Dataset Version
  const { error: versionErr } = await supabase
    .from('dataset_versions')
    .upsert({
      provider: 'ACJU',
      year: 2026,
      version: 1,
      record_count: stats.prayers.inserted,
      status: 'Validated'
    }, { onConflict: 'provider, year, version' });

  if (versionErr) {
    console.warn(`\n⚠️ Failed to record dataset_version:`, versionErr.message);
  } else {
    console.log(`\n✅ Dataset version recorded (ACJU 2026, Version 1).`);
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Locations imported/updated: ${stats.locations.inserted}`);
  console.log(`Monthly Sources imported/updated: ${stats.sources.inserted}`);
  console.log(`Prayer Records imported/updated: ${stats.prayers.inserted}`);
  console.log(`Of which anomalous/invalid source dates preserved: ${anomalousDays}`);
  console.log(`\nThe database is now populated and ready for the API!`);
}

main().catch(e => {
  console.error("Fatal Import Error:", e);
  process.exit(1);
});
