/**
 * Patches the generated JSON files to include the original `file_url` and `file_hash`
 * (from the ACJU downloaded dataset index) as requested by the user.
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'prayer-times', '2026');
const INDEX_CSV_PATH = path.join(process.cwd(), 'ACJU_Prayer_Times', 'index.csv');

// Parse CSV manually since it's simple
function parseCsv(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const headers = lines[0].split(',');
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV split respecting quotes (this relies on the format from downloader.mjs)
    const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!matches) continue;
    
    const record = {};
    matches.forEach((m, j) => {
      let val = m.replace(/^"|"$/g, '');
      if (headers[j]) {
        record[headers[j]] = val;
      }
    });
    records.push(record);
  }
  return records;
}

function main() {
  const csvText = fs.readFileSync(INDEX_CSV_PATH, 'utf-8');
  const indexData = parseCsv(csvText);
  
  // We want to map file_name to file_url and sha256
  const fileMetaMap = new Map();
  for (const record of indexData) {
    if (record.file_name) {
      fileMetaMap.set(record.file_name, {
        file_url: record.file_url,
        file_hash: record.sha256
      });
    }
  }

  // Iterate over all JSON files and patch them
  const locations = fs.readdirSync(DATA_DIR);
  let patchedCount = 0;
  
  for (const loc of locations) {
    const locPath = path.join(DATA_DIR, loc);
    if (!fs.statSync(locPath).isDirectory()) continue;
    
    const months = fs.readdirSync(locPath).filter(f => f.endsWith('.json'));
    for (const mon of months) {
      const jsonPath = path.join(locPath, mon);
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      
      const fileName = data.source.source_file;
      const meta = fileMetaMap.get(fileName);
      
      if (meta) {
        data.source.file_url = meta.file_url;
        data.source.file_hash = meta.file_hash;
        
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
        patchedCount++;
      } else {
        console.warn(`Missing meta for: ${fileName}`);
      }
    }
  }
  
  console.log(`Successfully patched ${patchedCount} JSON files with file_url and file_hash.`);
}

main();
