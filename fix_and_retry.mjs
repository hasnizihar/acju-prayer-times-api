/**
 * Fix script: Re-download failed files, reorganize Mullaitivu & Badulla extras
 */
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BASE_DIR = path.join(process.cwd(), 'ACJU_Prayer_Times');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 60000, headers: { 'User-Agent': 'ACJU-Prayer-Archiver/1.0' } }, (res) => {
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

async function fetchWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchUrl(url);
    } catch (e) {
      console.log(`    Retry ${i+1}/${retries}: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
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

async function downloadTo(url, destDir, filename) {
  fs.mkdirSync(destDir, { recursive: true });
  const filePath = path.join(destDir, filename);
  const res = await fetchWithRetry(url);
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const ext = path.extname(filename).toLowerCase();
  if (!validateFile(res.body, ext)) throw new Error('Invalid file signature');
  fs.writeFileSync(filePath, res.body);
  const sha = crypto.createHash('sha256').update(res.body).digest('hex');
  console.log(`  ✓ ${filename} (${(res.body.length/1024).toFixed(0)} KB) -> ${destDir}`);
  return { size: res.body.length, sha256: sha };
}

async function main() {
  console.log('=== Fix & Retry Script ===\n');

  // 1. Retry the 3 failed Anuradhapura files
  console.log('--- Retrying failed Anuradhapura downloads ---');
  const failedUrls = [
    { url: 'https://www.acju.lk/wp-content/uploads/2025/07/05-ANURADHAPURA-DISTRICT-POLONNARUWA-DISTRICT-3-Mar-scaled.jpg',
      dir: path.join(BASE_DIR, 'Anuradhapura_Polonnaruwa', 'March'),
      name: '05-ANURADHAPURA-DISTRICT-POLONNARUWA-DISTRICT-3-Mar-scaled.jpg' },
    { url: 'https://www.acju.lk/wp-content/uploads/2025/07/05-ANURADHAPURA-DISTRICT-POLONNARUWA-DISTRICT-3-Mar.pdf',
      dir: path.join(BASE_DIR, 'Anuradhapura_Polonnaruwa', 'March'),
      name: '05-ANURADHAPURA-DISTRICT-POLONNARUWA-DISTRICT-3-Mar.pdf' },
    { url: 'https://www.acju.lk/wp-content/uploads/2025/07/05-ANURADHAPURA-DISTRICT-POLONNARUWA-DISTRICT-4-Apr-scaled.jpg',
      dir: path.join(BASE_DIR, 'Anuradhapura_Polonnaruwa', 'April'),
      name: '05-ANURADHAPURA-DISTRICT-POLONNARUWA-DISTRICT-4-Apr-scaled.jpg' },
  ];

  for (const f of failedUrls) {
    try { await downloadTo(f.url, f.dir, f.name); }
    catch (e) { console.log(`  ✗ FAILED: ${f.name} - ${e.message}`); }
    await new Promise(r => setTimeout(r, 500));
  }

  // 2. Move Mullaitivu "EXCEPT-NALLUR" files from Other to proper folder
  console.log('\n--- Reorganizing Mullaitivu files ---');
  const otherDir = path.join(BASE_DIR, 'Other');
  const mulDir = path.join(BASE_DIR, 'Mullaitivu_Kilinochchi_Vavuniya');
  
  const monthMap = {
    '1-Jan': 'January', '2-Feb': 'February', '3-Mar': 'March',
    '4-Apr': 'April', '5-May': 'May', '6-June': 'June',
    '7-July': 'July', '8-Aug': 'August', '9-Sep': 'September',
    '10-Oct': 'October', '11-Nov': 'November', '12-Dec': 'December',
  };

  if (fs.existsSync(otherDir)) {
    // Walk through Other subdirectories and move Mullaitivu files
    const walkAndMove = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkAndMove(full);
        } else if (entry.name.includes('MULLAITIVU')) {
          // Determine month from filename
          let month = 'Unknown';
          for (const [key, val] of Object.entries(monthMap)) {
            if (entry.name.includes(key)) { month = val; break; }
          }
          const dest = path.join(mulDir, month);
          fs.mkdirSync(dest, { recursive: true });
          fs.copyFileSync(full, path.join(dest, entry.name));
          fs.unlinkSync(full);
          console.log(`  Moved: ${entry.name} -> Mullaitivu_Kilinochchi_Vavuniya/${month}/`);
        }
      }
    };
    walkAndMove(otherDir);
  }

  // 3. Move Badulla May extras
  console.log('\n--- Reorganizing Badulla May extras ---');
  const badullaMayDir = path.join(BASE_DIR, 'Badulla_Monaragala_Padiyatalawa_Dehiaththakandiya', 'May');
  fs.mkdirSync(badullaMayDir, { recursive: true });

  // Check for Z10_MAy.jpeg and May_010.pdf in Other/Unknown or wherever they ended up
  const findAndMove = (searchDir, filename, targetDir) => {
    if (!fs.existsSync(searchDir)) return false;
    for (const entry of fs.readdirSync(searchDir, { withFileTypes: true })) {
      const full = path.join(searchDir, entry.name);
      if (entry.isDirectory()) {
        if (findAndMove(full, filename, targetDir)) return true;
      } else if (entry.name === filename) {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(full, path.join(targetDir, filename));
        fs.unlinkSync(full);
        console.log(`  Moved: ${filename} -> ${path.relative(BASE_DIR, targetDir)}/`);
        return true;
      }
    }
    return false;
  };

  findAndMove(otherDir, 'Z10_MAy.jpeg', badullaMayDir);
  findAndMove(otherDir, 'May_010.pdf', badullaMayDir);

  // Also check for the Kandy May extra
  const kandyMayDir = path.join(BASE_DIR, 'Kandy_Matale_Nuwara_Eliya', 'May');
  findAndMove(otherDir, '07-KANDY-DISTRICT-MATALE-DISTRICT-NUWARA-ELIYA-DISTRICT-7-May-scaled.jpg', kandyMayDir);

  // Clean up empty Other directories
  const cleanEmpty = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) cleanEmpty(path.join(dir, e.name));
    }
    try { if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch {}
  };
  cleanEmpty(otherDir);

  // 4. Regenerate reports
  console.log('\n--- Regenerating verification report ---');
  
  // Count all files in the tree
  let totalPdfs = 0, totalImages = 0, totalBytes = 0, totalFiles = 0;
  const locationFolders = fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const allEntries = [];
  for (const loc of locationFolders) {
    if (loc === 'evidence') continue;
    const locPath = path.join(BASE_DIR, loc);
    const months = fs.readdirSync(locPath, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const mon of months) {
      const monPath = path.join(locPath, mon.name);
      const files = fs.readdirSync(monPath);
      for (const f of files) {
        const fp = path.join(monPath, f);
        const sz = fs.statSync(fp).size;
        const ext = path.extname(f).toLowerCase();
        totalFiles++;
        totalBytes += sz;
        if (ext === '.pdf') totalPdfs++;
        else totalImages++;
        allEntries.push({ location: loc, month: mon.name, file: f, size: sz, ext });
      }
    }
  }

  // Check coverage
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const LOCATIONS = [
    'Colombo_Gampaha_Kalutara','Jaffna_Nallur','Mullaitivu_Kilinochchi_Vavuniya',
    'Mannar_Puttalam','Anuradhapura_Polonnaruwa','Kurunegala',
    'Kandy_Matale_Nuwara_Eliya','Batticaloa_Ampara','Trincomalee',
    'Badulla_Monaragala_Padiyatalawa_Dehiaththakandiya','Ratnapura_Kegalle',
    'Galle_Matara','Hambantota'
  ];

  let covered = 0, missing = 0;
  const missingList = [];
  for (const loc of LOCATIONS) {
    for (const mon of MONTHS) {
      const monPath = path.join(BASE_DIR, loc, mon);
      if (fs.existsSync(monPath) && fs.readdirSync(monPath).length > 0) {
        covered++;
      } else {
        missing++;
        missingList.push(`${loc}/${mon}`);
      }
    }
  }

  const report = `ACJU Prayer Times - Final Verification Report
================================================
Generated: ${new Date().toISOString()}
Source: https://www.acju.lk/prayer-times/

EXTRACTION METHOD:
- Fetched the HTML source of the Prayer Times page
- Extracted all href URLs matching wp-content/uploads/*.pdf|jpg|jpeg|png
- URLs are embedded directly in Elementor nested-accordion HTML (no JS/AJAX needed)
- Each location group uses an accordion item with 12 month sub-sections
- Each month has both a JPG image link and a PDF document link

TOTAL COMBINATIONS EXPECTED: 13 locations × 12 months = 156
TOTAL FILE URLS DISCOVERED: 312

RESULTS:
  Location/Month combos covered:  ${covered} / 156
  Missing combinations:           ${missing}
  Total files downloaded:          ${totalFiles}

FILE TYPES:
  PDF files:              ${totalPdfs}
  Image files:            ${totalImages}

TOTAL DATA DOWNLOADED:    ${(totalBytes / 1024 / 1024).toFixed(2)} MB

${missingList.length > 0 ? 'STILL MISSING:\n  ' + missingList.join('\n  ') : 'ALL COMBINATIONS COVERED!'}

FILES SAVED TO: ${BASE_DIR}
`;

  fs.writeFileSync(path.join(BASE_DIR, 'verification_report.txt'), report, 'utf-8');
  console.log(report);
  console.log('=== Fix Complete ===');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
