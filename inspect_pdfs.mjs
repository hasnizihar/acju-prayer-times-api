/**
 * Phase 1: PDF Inspection Script
 * Inspects 10+ sample PDFs across different locations/months to discover:
 * - Page count, text extractability, table structure
 * - Column names, date format, prayer-time format
 * - Whether all PDFs share the same structure
 */
import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE = path.join(process.cwd(), 'ACJU_Prayer_Times');

// Pick diverse samples: different locations, different months, different file sizes
const SAMPLES = [
  'Colombo_Gampaha_Kalutara/January',
  'Colombo_Gampaha_Kalutara/June',
  'Jaffna_Nallur/March',
  'Mullaitivu_Kilinochchi_Vavuniya/August',
  'Batticaloa_Ampara/October',
  'Trincomalee/February',
  'Kandy_Matale_Nuwara_Eliya/December',
  'Hambantota/July',
  'Kurunegala/September',
  'Badulla_Monaragala_Padiyatalawa_Dehiaththakandiya/May',
  'Ratnapura_Kegalle/April',
  'Galle_Matara/November',
  'Anuradhapura_Polonnaruwa/January',
];

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
    fullText += pageText + '\n';
  }
  
  return {
    numPages,
    text: fullText
  };
}

async function inspectPdf(pdfPath) {
  const buf = fs.readFileSync(pdfPath);
  const data = await extractTextFromPdf(pdfPath);
  return {
    file: path.relative(BASE, pdfPath),
    fileSize: buf.length,
    pages: data.numPages,
    textLength: data.text.length,
    rawText: data.text,
  };
}

function analyzeText(rawText, filePath) {
  // pdfjs-dist often joins strings awkwardly depending on layout.
  // We'll try splitting by typical patterns or just use the whole block.
  // To get better line-by-line approximation, we could parse item coordinates,
  // but let's try a simple heuristic first.
  
  // Since items were joined with ' ', let's split by double spaces or just regex matching for times.
  // Actually, we'll try to find time sequences.
  
  const timePattern = /\d{1,2}[.:]\d{2}/g;
  const times = rawText.match(timePattern) || [];
  
  // A rough approximation of lines if it's just one big string:
  const headerCandidates = rawText.substring(0, 500); // first 500 chars

  return {
    totalTimes: times.length,
    headerCandidates: headerCandidates,
    times: times.slice(0, 10), // first 10 times found
  };
}

async function main() {
  console.log('=== PHASE 1: PDF INSPECTION ===\n');
  
  const results = [];

  for (const sample of SAMPLES) {
    const dirPath = path.join(BASE, sample);
    if (!fs.existsSync(dirPath)) {
      console.log(`SKIP: ${sample} - directory not found`);
      continue;
    }
    
    const pdfs = fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      console.log(`SKIP: ${sample} - no PDFs found`);
      continue;
    }

    const pdfPath = path.join(dirPath, pdfs[0]);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`INSPECTING: ${sample}/${pdfs[0]}`);
    console.log(`${'='.repeat(80)}`);

    try {
      const info = await inspectPdf(pdfPath);
      const analysis = analyzeText(info.rawText, pdfPath);
      
      console.log(`  File size:    ${(info.fileSize / 1024).toFixed(0)} KB`);
      console.log(`  Pages:        ${info.pages}`);
      console.log(`  Text length:  ${info.textLength} chars`);
      console.log(`  Total times:  ${analysis.totalTimes}`);
      
      console.log(`\n  --- HEADER PREVIEW ---`);
      console.log(analysis.headerCandidates.replace(/\n/g, ' '));
      
      console.log(`\n  --- FIRST 10 TIMES ---`);
      console.log(analysis.times.join(', '));

      // Write full raw text to inspection file for detailed review
      const outPath = path.join(process.cwd(), `inspection_${sample.replace(/\//g, '_')}.txt`);
      fs.writeFileSync(outPath, `FILE: ${pdfPath}\nSIZE: ${info.fileSize}\nPAGES: ${info.pages}\n\n--- RAW TEXT ---\n${info.rawText}`, 'utf-8');
      console.log(`\n  Full text saved to: ${path.basename(outPath)}`);

      results.push({
        sample, pdf: pdfs[0], pages: info.pages, fileSize: info.fileSize,
        textLength: info.textLength, totalTimes: analysis.totalTimes,
        headerPreview: analysis.headerCandidates.substring(0, 100),
      });
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      results.push({ sample, pdf: pdfs[0], error: e.message });
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('INSPECTION SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`PDFs inspected: ${results.length}`);
  console.log(`\nConsistency check:`);
  
  const pageCounts = new Set(results.filter(r => !r.error).map(r => r.pages));
  
  console.log(`  Page counts:     ${[...pageCounts].join(', ')}`);

  // Write summary JSON
  fs.writeFileSync(
    path.join(process.cwd(), 'inspection_summary.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`\nDetailed results saved to inspection_summary.json`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
