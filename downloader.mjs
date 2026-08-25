/**
 * ACJU Prayer Times Complete Downloader
 * Downloads all prayer-times files from https://www.acju.lk/prayer-times/
 * Extracts URLs directly from the HTML source (static WordPress media links)
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SOURCE_URL = 'https://www.acju.lk/prayer-times/';
const BASE_DIR = path.join(process.cwd(), 'ACJU_Prayer_Times');

// Location mapping: URL prefix -> folder name
const LOCATION_MAP = {
  '01-COLOMBO-DISTRICT-GAMPAHA-DISTRICT-KALUTARA-DISTRICT': 'Colombo_Gampaha_Kalutara',
  '02-JAFFNA-DISTRICT-NALLUR': 'Jaffna_Nallur',
  '03-MULLAITIVU-DISTRICT-KILINOCHCHI-DISTRICT-VAVUNIYA-DISTRICT': 'Mullaitivu_Kilinochchi_Vavuniya',
  '04-MANNAR-DISTRICT-PUTTALAM-DISTRICT': 'Mannar_Puttalam',
  '05-ANURADHAPURA-DISTRICT-POLONNARUWA-DISTRICT': 'Anuradhapura_Polonnaruwa',
  '06-KURUNEGALA-DISTRICT': 'Kurunegala',
  '07-KANDY-DISTRICT-MATALE-DISTRICT-NUWARA-ELIYA-DISTRICT': 'Kandy_Matale_Nuwara_Eliya',
  '08-BATTICALOA-DISTRICT-AMPARA-DISTRICT': 'Batticaloa_Ampara',
  '09-TRINCOMALEE-DISTRICT': 'Trincomalee',
  '10-BADULLA-DISTRICT-MONARAGALA-DISTRICT-PADIYATALAWA-DEHIATHTHAKANDIYA.': 'Badulla_Monaragala_Padiyatalawa_Dehiaththakandiya',
  '10-BADULLA-DISTRICT-MONARAGALA-DISTRICT-PADIYATALAWA-DEHIATHTHAKANDIYA': 'Badulla_Monaragala_Padiyatalawa_Dehiaththakandiya',
  '11-RATNAPURA-DISTRICT-KEGALLE-DISTRICT': 'Ratnapura_Kegalle',
  '12-GALLE-DISTRICT-MATARA-DISTRICT': 'Galle_Matara',
  '13-HAMBANTOTA-DISTRICT': 'Hambantota',
};

// Month mapping from URL suffixes
const MONTH_MAP = {
  '1-Jan': 'January', '2-Feb': 'February', '3-Mar': 'March',
  '4-Apr': 'April', '4-May': 'May', '5-May': 'May',
  '6-June': 'June', '7-July': 'July', '8-Aug': 'August',
  '9-Sep': 'September', '10-Oct': 'October', '11-Nov': 'November',
  '11Nov': 'November', '12-Dec': 'December',
};

const MONTHS_LIST = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LOCATION_FOLDERS = Object.values(LOCATION_MAP).filter((v, i, a) => a.indexOf(v) === i);

// State
const indexRows = [];
const missingRows = [];
const hashMap = new Map(); // sha256 -> first file info
const stats = { checked: 0, success: 0, missing: 0, failed: 0, duplicates: 0, pdfs: 0, images: 0, totalBytes: 0 };

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 30000, headers: { 'User-Agent': 'ACJU-Prayer-Archiver/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchUrl(url);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function validateFile(buf, ext) {
  if (!buf || buf.length < 4) return false;
  if (ext === '.pdf') return buf.slice(0, 4).toString() === '%PDF';
  if (ext === '.jpg' || ext === '.jpeg') return buf[0] === 0xFF && buf[1] === 0xD8;
  if (ext === '.png') return buf[0] === 0x89 && buf[1] === 0x50;
  return true;
}

function parseUrlInfo(url) {
  const filename = path.basename(new URL(url).pathname);
  const ext = path.extname(filename).toLowerCase();
  const base = filename.replace(/-scaled\.(jpg|jpeg|png)$/i, '.$1').replace(/\.(pdf|jpg|jpeg|png)$/i, '');

  let locationKey = null, monthKey = null;
  for (const [prefix, folder] of Object.entries(LOCATION_MAP)) {
    if (base.startsWith(prefix)) {
      locationKey = folder;
      const rest = base.slice(prefix.length).replace(/^[-.]/, '');
      for (const [mk, mv] of Object.entries(MONTH_MAP)) {
        if (rest === mk || rest.replace(/-/g, '') === mk.replace(/-/g, '')) {
          monthKey = mv;
          break;
        }
      }
      break;
    }
  }
  return { locationKey, monthKey, ext, filename };
}

async function downloadFile(url, locationFolder, month, filename) {
  const ext = path.extname(filename).toLowerCase();
  const safeName = filename.replace(/[<>:"/\\|?*]/g, '_');
  const dirPath = path.join(BASE_DIR, locationFolder, month);
  const filePath = path.join(dirPath, safeName);
  fs.mkdirSync(dirPath, { recursive: true });

  let result;
  try {
    result = await fetchWithRetry(url);
  } catch (e) {
    return { status: 'failed', error: e.message, httpStatus: 0 };
  }

  if (result.status !== 200) {
    return { status: 'failed', error: `HTTP ${result.status}`, httpStatus: result.status };
  }

  if (!validateFile(result.body, ext)) {
    return { status: 'failed', error: 'Invalid file signature', httpStatus: result.status };
  }

  const sha256 = crypto.createHash('sha256').update(result.body).digest('hex');
  const isDuplicate = hashMap.has(sha256);
  if (!isDuplicate) hashMap.set(sha256, { url, file: safeName, location: locationFolder, month });

  fs.writeFileSync(filePath, result.body);
  return { status: 'success', httpStatus: result.status, size: result.body.length, sha256, isDuplicate, filePath };
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== ACJU Prayer Times Complete Downloader ===\n');
  console.log('Step 1: Fetching page source...');

  let html;
  try {
    const res = await fetchWithRetry(SOURCE_URL);
    html = res.body.toString('utf-8');
    console.log(`  Page fetched: ${html.length} bytes\n`);
  } catch (e) {
    console.error('Failed to fetch source page:', e.message);
    process.exit(1);
  }

  // Extract all prayer-times file URLs
  const urlRegex = /href="(https:\/\/www\.acju\.lk\/wp-content\/uploads\/[^"]*?\.(pdf|jpe?g|png))"/gi;
  const allUrls = new Set();
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    const url = match[1];
    // Skip logo/non-prayer files
    if (url.includes('Transparent-Logo') || url.includes('cropped-')) continue;
    allUrls.add(url);
  }

  console.log(`Step 2: Discovered ${allUrls.size} file URLs\n`);

  // Group URLs by location+month
  const grouped = new Map(); // "location|month" -> [{url, ext, filename}]
  const ungrouped = [];

  for (const url of allUrls) {
    const info = parseUrlInfo(url);
    if (info.locationKey && info.monthKey) {
      const key = `${info.locationKey}|${info.monthKey}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ url, ...info });
    } else {
      ungrouped.push({ url, ...info });
    }
  }

  console.log(`  Grouped: ${grouped.size} location/month combinations`);
  console.log(`  Ungrouped: ${ungrouped.length} files\n`);

  // Create base directory
  fs.mkdirSync(BASE_DIR, { recursive: true });

  // Download all grouped files
  console.log('Step 3: Downloading files...\n');
  let count = 0;
  const total = allUrls.size;

  for (const [key, files] of grouped) {
    const [locationFolder, month] = key.split('|');
    for (const file of files) {
      count++;
      const tag = file.ext === '.pdf' ? 'PDF' : 'IMG';
      process.stdout.write(`  [${count}/${total}] ${tag} ${locationFolder}/${month}...`);

      const result = await downloadFile(file.url, locationFolder, month, file.filename);
      
      if (result.status === 'success') {
        stats.success++;
        stats.totalBytes += result.size;
        if (file.ext === '.pdf') stats.pdfs++; else stats.images++;
        if (result.isDuplicate) stats.duplicates++;
        
        indexRows.push({
          location: locationFolder, month, file_name: file.filename,
          file_type: file.ext.replace('.', ''), file_url: file.url,
          source_page: SOURCE_URL, http_status: result.httpStatus,
          file_size: result.size, download_status: 'success',
          sha256: result.sha256, notes: result.isDuplicate ? 'duplicate content' : ''
        });
        console.log(` OK (${(result.size / 1024).toFixed(0)} KB)`);
      } else {
        stats.failed++;
        indexRows.push({
          location: locationFolder, month, file_name: file.filename,
          file_type: file.ext.replace('.', ''), file_url: file.url,
          source_page: SOURCE_URL, http_status: result.httpStatus,
          file_size: 0, download_status: 'failed',
          sha256: '', notes: result.error
        });
        missingRows.push({
          location: locationFolder, month, attempted_url: file.url,
          status: result.httpStatus, error: result.error, notes: 'Download failed'
        });
        console.log(` FAILED: ${result.error}`);
      }
      stats.checked++;
      await delay(300); // polite delay
    }
  }

  // Handle ungrouped files (bonus/extra files)
  for (const file of ungrouped) {
    count++;
    const loc = file.locationKey || 'Other';
    const mon = file.monthKey || 'Unknown';
    process.stdout.write(`  [${count}/${total}] EXTRA ${file.filename}...`);

    const result = await downloadFile(file.url, loc, mon, file.filename);
    if (result.status === 'success') {
      stats.success++;
      stats.totalBytes += result.size;
      if (file.ext === '.pdf') stats.pdfs++; else stats.images++;
      indexRows.push({
        location: loc, month: mon, file_name: file.filename,
        file_type: file.ext.replace('.', ''), file_url: file.url,
        source_page: SOURCE_URL, http_status: result.httpStatus,
        file_size: result.size, download_status: 'success',
        sha256: result.sha256, notes: 'extra/ungrouped file'
      });
      console.log(` OK (${(result.size / 1024).toFixed(0)} KB)`);
    } else {
      stats.failed++;
      missingRows.push({
        location: loc, month: mon, attempted_url: file.url,
        status: result.httpStatus, error: result.error, notes: 'Extra file download failed'
      });
      console.log(` FAILED: ${result.error}`);
    }
    stats.checked++;
    await delay(300);
  }

  // Check for missing location/month combinations
  console.log('\nStep 4: Checking for missing combinations...\n');
  for (const loc of LOCATION_FOLDERS) {
    for (const mon of MONTHS_LIST) {
      const key = `${loc}|${mon}`;
      if (!grouped.has(key)) {
        stats.missing++;
        missingRows.push({
          location: loc, month: mon, attempted_url: 'N/A',
          status: 'N/A', error: 'No URL found in source page', notes: 'Combination not present on website'
        });
        console.log(`  MISSING: ${loc} / ${mon}`);
      }
    }
  }

  // Write index.csv
  console.log('\nStep 5: Writing reports...\n');
  const csvHeader = 'location,month,file_name,file_type,file_url,source_page,http_status,file_size,download_status,sha256,notes';
  const csvRows = indexRows.map(r =>
    `"${r.location}","${r.month}","${r.file_name}","${r.file_type}","${r.file_url}","${r.source_page}",${r.http_status},${r.file_size},"${r.download_status}","${r.sha256}","${r.notes}"`
  );
  fs.writeFileSync(path.join(BASE_DIR, 'index.csv'), [csvHeader, ...csvRows].join('\n'), 'utf-8');

  // Write missing_files.csv
  const missingHeader = 'location,month,attempted_url,status,error,notes';
  const missingCsvRows = missingRows.map(r =>
    `"${r.location}","${r.month}","${r.attempted_url}","${r.status}","${r.error}","${r.notes}"`
  );
  fs.writeFileSync(path.join(BASE_DIR, 'missing_files.csv'), [missingHeader, ...missingCsvRows].join('\n'), 'utf-8');

  // Write verification report
  const report = `ACJU Prayer Times - Verification Report
========================================
Generated: ${new Date().toISOString()}
Source: ${SOURCE_URL}

EXTRACTION METHOD:
- Fetched the HTML source of the Prayer Times page
- Extracted all href URLs matching wp-content/uploads/*.pdf|jpg|jpeg|png
- URLs are embedded directly in Elementor nested-accordion HTML (no JS/AJAX needed)
- Each location group uses an accordion item with 12 month sub-sections
- Each month has both a JPG image link and a PDF document link

TOTAL COMBINATIONS EXPECTED: ${LOCATION_FOLDERS.length} locations × 12 months = ${LOCATION_FOLDERS.length * 12}
TOTAL FILE URLS DISCOVERED: ${allUrls.size}

RESULTS:
  Total files checked:    ${stats.checked}
  Successful downloads:   ${stats.success}
  Missing combinations:   ${stats.missing}
  Failed downloads:       ${stats.failed}
  Duplicate content:      ${stats.duplicates}

FILE TYPES:
  PDF files:              ${stats.pdfs}
  Image files:            ${stats.images}

TOTAL DATA DOWNLOADED:    ${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB

FILES SAVED TO: ${BASE_DIR}
`;
  fs.writeFileSync(path.join(BASE_DIR, 'verification_report.txt'), report, 'utf-8');

  // Write discovered URLs list
  fs.writeFileSync(path.join(BASE_DIR, 'discovered_urls.txt'), [...allUrls].sort().join('\n'), 'utf-8');

  console.log(report);
  console.log('=== Download Complete ===');
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
