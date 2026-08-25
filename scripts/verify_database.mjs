import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ MISSING CREDENTIALS");
  console.error("Please provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== ACJU Prayer Times Database Verification ===\n");

  let hasErrors = false;

  // 1. Check Table Counts
  console.log("--- Checking Record Counts ---");
  
  const { count: locCount, error: locErr } = await supabase.from('locations').select('*', { count: 'exact', head: true });
  if (locErr) { console.error("Error fetching locations count:", locErr); process.exit(1); }
  
  const { count: sourceCount, error: sourceErr } = await supabase.from('monthly_sources').select('*', { count: 'exact', head: true });
  if (sourceErr) { console.error("Error fetching sources count:", sourceErr); process.exit(1); }

  const { count: prayerCount, error: prayerErr } = await supabase.from('prayer_times').select('*', { count: 'exact', head: true });
  if (prayerErr) { console.error("Error fetching prayers count:", prayerErr); process.exit(1); }

  const { count: validPrayerCount, error: validPrayerErr } = await supabase.from('prayer_times').select('*', { count: 'exact', head: true }).not('date', 'is', null);
  if (validPrayerErr) { console.error("Error fetching valid prayers count:", validPrayerErr); process.exit(1); }

  const { count: anomalousCount, error: anomalousErr } = await supabase.from('prayer_times').select('*', { count: 'exact', head: true }).is('date', null);
  if (anomalousErr) { console.error("Error fetching anomalous prayers count:", anomalousErr); process.exit(1); }

  console.log(`Locations: ${locCount} / 13`);
  console.log(`Monthly sources: ${sourceCount} / 156`);
  console.log(`Prayer records: ${prayerCount} / 4758`);
  console.log(`  - Valid dates: ${validPrayerCount}`);
  console.log(`  - Anomalous dates: ${anomalousCount}`);
  
  if (locCount !== 13 || sourceCount !== 156 || prayerCount !== 4758 || anomalousCount !== 13) {
    console.error(`❌ Data counts do not match expected values!`);
    hasErrors = true;
  } else {
    console.log(`✅ Counts match expected values.`);
  }

  // 2. Check for Orphans (Required fields and constraints usually prevent this, but good to check)
  console.log("\n--- Checking Data Integrity ---");
  
  const { data: orphanPrayers, error: orphanErr } = await supabase
    .from('prayer_times')
    .select('id, location_id')
    .is('location_id', null)
    .limit(1);
    
  if (orphanErr) {
    console.error("Error checking orphans:", orphanErr);
  } else if (orphanPrayers.length > 0) {
    console.error(`❌ Found orphan prayer records with NULL location_id!`);
    hasErrors = true;
  } else {
    console.log(`✅ No orphan prayer records found.`);
  }

  // 3. Duplicate checks are handled by the UNIQUE constraint during import.
  // Verify that all 12 months exist for all 13 locations.
  const { data: monthlySources } = await supabase.from('monthly_sources').select('location_id, month');
  const monthMap = new Map();
  
  if (monthlySources) {
    for (const row of monthlySources) {
      if (!monthMap.has(row.location_id)) monthMap.set(row.location_id, new Set());
      monthMap.get(row.location_id).add(row.month);
    }
    
    let missingMonths = 0;
    for (const [locId, months] of monthMap.entries()) {
      if (months.size !== 12) {
        console.error(`❌ Location ID ${locId} has ${months.size} months instead of 12!`);
        missingMonths++;
        hasErrors = true;
      }
    }
    if (missingMonths === 0 && monthMap.size === 13) {
      console.log(`✅ Every location has exactly 12 months of source data.`);
    }
  }

  console.log(`\n=== VERIFICATION COMPLETE ===`);
  if (hasErrors) {
    console.error(`❌ Database verification FAILED. Please review the errors above.`);
    process.exit(1);
  } else {
    console.log(`🎉 Database verification PASSED. The database is in a healthy, complete state.`);
  }
}

main().catch(e => {
  console.error("Fatal Verification Error:", e);
  process.exit(1);
});
