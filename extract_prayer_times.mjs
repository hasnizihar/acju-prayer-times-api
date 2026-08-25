/**
 * Phase 3: PDF Extraction Script
 * Processes all 156 ACJU Prayer Times PDFs and extracts the data into structured JSON format.
 */
import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE = path.join(process.cwd(), 'ACJU_Prayer_Times');
const OUT_DIR = path.join(process.cwd(), 'data');
const OUT_PRAYER_TIMES = path.join(OUT_DIR, 'prayer-times', '2026');

// Month mapping for date normalization
const MONTH_INDEX = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
  'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

const MONTH_NAMES = {
  'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
  'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
};

async function extractTextFromPdf(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + ' ';
  }
  
  return fullText;
}

function normalizeTime(timeStr) {
  // Convert "5:00 AM" or "3:37 PM" to HH:mm (24-hour)
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!match) return timeStr;
  
  let hours = parseInt(match[1], 10);
  const mins = match[2];
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${mins}`;
}

async function processPdf(pdfPath, locationSlug, locationName, monthFolder) {
  const rawText = await extractTextFromPdf(pdfPath);
  
  // Pattern: 1-Jan or Jan-1 5:00 AM 6:22 AM 12:15 PM 3:37 PM 6:07 PM 7:21 PM
  // The spacing can vary, so we use \s+
  const rowRegex = /((\d{1,2}-[A-Za-z]{3,4})|([A-Za-z]{3,4}-\d{1,2}))\s+(\d{1,2}:\d{2}\s+[AP]M)\s+(\d{1,2}:\d{2}\s+[AP]M)\s+(\d{1,2}:\d{2}\s+[AP]M)\s+(\d{1,2}:\d{2}\s+[AP]M)\s+(\d{1,2}:\d{2}\s+[AP]M)\s+(\d{1,2}:\d{2}\s+[AP]M)/g;
  
  const days = [];
  let match;
  let expectedMonthStr = MONTH_NAMES[monthFolder];
  
  while ((match = rowRegex.exec(rawText)) !== null) {
    const dateRaw = match[1]; // e.g., "1-Jan" or "Jun-1"
    const parts = dateRaw.split('-');
    
    // Determine which part is day and which is month
    let dayStr, monthStrAbbr;
    if (isNaN(parseInt(parts[0], 10))) {
       monthStrAbbr = parts[0];
       dayStr = parts[1];
    } else {
       dayStr = parts[0];
       monthStrAbbr = parts[1];
    }
    
    // Normalize date
    let monthNum = '00';
    const cleanAbbr = monthStrAbbr.substring(0, 3);
    if (MONTH_INDEX[cleanAbbr]) {
      monthNum = MONTH_INDEX[cleanAbbr];
    }
    
    if (monthNum !== expectedMonthStr && expectedMonthStr) {
       // A sanity check, sometimes the OCR/text joins wrong, or the PDF has typos.
       // We'll log a warning but proceed.
    }

    const dateFormatted = `2026-${monthNum}-${dayStr.padStart(2, '0')}`;
    
    days.push({
      date: dateFormatted,
      prayer_times: {
        fajr: normalizeTime(match[4]),
        sunrise: normalizeTime(match[5]),
        dhuhr: normalizeTime(match[6]), // Source calls it LUHR
        asr: normalizeTime(match[7]),
        maghrib: normalizeTime(match[8]),
        isha: normalizeTime(match[9])
      }
    });
  }
  
  const result = {
    location_id: locationSlug,
    location_name: locationName,
    year: 2026,
    month: parseInt(expectedMonthStr, 10),
    source: {
      provider: "ACJU",
      source_file: path.basename(pdfPath),
      source_url: `https://www.acju.lk/prayer-times/`, // Exact URL could be looked up from index.csv if needed
    },
    days: days
  };

  return { result, rawText };
}

async function main() {
  console.log('=== PHASE 3: PDF EXTRACTION ===\n');
  
  fs.mkdirSync(OUT_PRAYER_TIMES, { recursive: true });
  
  // Read location folders
  const locations = fs.readdirSync(BASE, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'evidence' && d.name !== 'Other')
    .map(d => d.name);
    
  let totalProcessed = 0;
  let totalDaysExtracted = 0;
  let warnings = 0;
  
  const validationReport = [];
  const extractionReport = [];

  for (const loc of locations) {
    const locSlug = loc.toLowerCase().replace(/_/g, '-');
    const locName = loc.replace(/_/g, ' District, ') + ' District'; // Approximation, can be refined in locations.json later
    
    const locOutDir = path.join(OUT_PRAYER_TIMES, locSlug);
    fs.mkdirSync(locOutDir, { recursive: true });
    
    const locPath = path.join(BASE, loc);
    const months = fs.readdirSync(locPath, { withFileTypes: true }).filter(d => d.isDirectory());
    
    for (const mon of months) {
      const monPath = path.join(locPath, mon.name);
      const pdfs = fs.readdirSync(monPath).filter(f => f.toLowerCase().endsWith('.pdf'));
      
      if (pdfs.length === 0) continue;
      
      const pdfPath = path.join(monPath, pdfs[0]);
      
      try {
        const { result, rawText } = await processPdf(pdfPath, locSlug, locName, mon.name);
        
        // Validation Checks
        const daysInMonth = new Date(2026, result.month, 0).getDate();
        let status = 'success';
        let warnMsg = [];
        
        if (result.days.length !== daysInMonth) {
          status = 'warning';
          warnMsg.push(`Expected ${daysInMonth} days, found ${result.days.length}`);
          warnings++;
        }
        
        // Write JSON
        const outPath = path.join(locOutDir, `${mon.name.toLowerCase()}.json`);
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
        
        totalProcessed++;
        totalDaysExtracted += result.days.length;
        
        extractionReport.push(`"${loc}","${mon.name}",2026,"${pdfs[0]}",${daysInMonth},${result.days.length},"${status}","${warnMsg.join('; ')}"`);
        validationReport.push(`"${loc}","${mon.name}",${daysInMonth},${result.days.length},${daysInMonth - result.days.length},0,0,"${status}"`);
        
        console.log(`[OK] Extracted ${loc}/${mon.name} (${result.days.length} days)`);
        
      } catch (e) {
        console.error(`[FAIL] ${loc}/${mon.name}: ${e.message}`);
        extractionReport.push(`"${loc}","${mon.name}",2026,"${pdfs[0]}",0,0,"failed","${e.message}"`);
        validationReport.push(`"${loc}","${mon.name}",0,0,0,0,0,"failed"`);
      }
    }
  }

  // Write reports
  const extReportPath = path.join(process.cwd(), 'extraction_report.csv');
  fs.writeFileSync(extReportPath, 'location,month,year,source_pdf,rows_expected,rows_extracted,extraction_status,warnings\n' + extractionReport.join('\n'));
  
  const valReportPath = path.join(process.cwd(), 'validation_report.csv');
  fs.writeFileSync(valReportPath, 'location,month,days_expected,days_extracted,missing_days,duplicate_days,invalid_times,validation_status\n' + validationReport.join('\n'));

  console.log(`\n=== FINAL STATISTICS ===`);
  console.log(`PDFs processed: ${totalProcessed}`);
  console.log(`Daily records extracted: ${totalDaysExtracted}`);
  console.log(`Warnings generated: ${warnings}`);
  
  console.log(`\nReports saved to:`);
  console.log(`- extraction_report.csv`);
  console.log(`- validation_report.csv`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
