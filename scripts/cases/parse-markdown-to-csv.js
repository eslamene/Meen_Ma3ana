#!/usr/bin/env node

/**
 * Parse markdown case files and generate CSV
 * 
 * Parses the markdown files from docs/cases/nov_dec/ and generates
 * a CSV file with case-contribution data.
 * 
 * Usage: node scripts/cases/parse-markdown-to-csv.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Arabic to English numeral mapping
const arabicToEnglish = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

// Convert Arabic numerals to English
function convertArabicNumber(str) {
  if (!str) return '';
  return str.split('').map(char => arabicToEnglish[char] || char).join('');
}

// Extract number from case title (handles Arabic and English numerals)
function extractCaseNumber(text) {
  // Match patterns like "1.", "١.", "٢.", etc.
  const match = text.match(/^([٠١٢٣٤٥٦٧٨٩0-9]+)\.?\s*/);
  if (match) {
    return convertArabicNumber(match[1]);
  }
  return null;
}

// Clean case title (remove number prefix and HTML tags)
function cleanCaseTitle(text) {
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Remove case number prefix
  text = text.replace(/^[٠١٢٣٤٥٦٧٨٩0-9]+\.?\s*/, '');
  // Remove leading/trailing whitespace
  text = text.trim();
  return text;
}

// Parse a markdown file
function parseMarkdownFile(filePath, month) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cases = [];
  
  const lines = content.split('\n');
  let currentCaseNumber = null;
  let currentCaseTitle = null;
  let inTable = false;
  let headerFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      if (inTable) {
        // End of table
        inTable = false;
        headerFound = false;
      }
      continue;
    }
    
    // Check for case title (starts with number, may have # prefix)
    // Match patterns like: "# ١ .", "١ .", "٢.", etc.
    const caseTitleMatch = trimmed.match(/<div dir="rtl">#?\s*([٠١٢٣٤٥٦٧٨٩0-9]+\.?\s*[^<]+)<\/div>/);
    if (caseTitleMatch) {
      // Save previous case if we have contributions
      if (currentCaseNumber && currentCaseTitle) {
        // Case title found, previous case is complete
      }
      
      const caseNumber = extractCaseNumber(caseTitleMatch[1]);
      const caseTitle = cleanCaseTitle(caseTitleMatch[1]);
      
      if (caseNumber && caseTitle) {
        currentCaseNumber = caseNumber;
        currentCaseTitle = caseTitle;
        inTable = false;
        headerFound = false;
      }
      continue;
    }
    
    // Check if this is a table row
    if (trimmed.includes('|')) {
      if (!inTable) {
        inTable = true;
        headerFound = false;
      }
      
      // Skip separator lines
      if (trimmed.match(/^[-|:\s]+$/)) {
        continue;
      }
      
      // Skip header row
      if (!headerFound && (trimmed.toLowerCase().includes('ساهم') || trimmed.toLowerCase().includes('كام'))) {
        headerFound = true;
        continue;
      }
      
      // Parse row
      const cells = trimmed.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length >= 2 && currentCaseNumber && currentCaseTitle) {
        const contributor = cells[0].replace(/<[^>]+>/g, '').trim();
        const amount = cells[1].replace(/<[^>]+>/g, '').trim();
        
        // Skip empty rows
        if (contributor && amount && contributor !== 'اللي ساهم' && contributor !== 'لللي ساهم') {
          const amountNum = convertArabicNumber(amount);
          if (amountNum && !isNaN(parseFloat(amountNum))) {
            cases.push({
              caseNumber: currentCaseNumber,
              caseTitle: currentCaseTitle,
              contributorNickname: contributor,
              amount: parseFloat(amountNum),
              month: month.toString()
            });
          }
        }
      }
    } else if (inTable && trimmed && !trimmed.includes('|')) {
      // End of table if we hit a non-table line
      inTable = false;
      headerFound = false;
    }
  }
  
  return cases;
}

// Main function
function main() {
  const month1File = path.join(__dirname, '../../docs/cases/nov_dec/حالات شهر ١ مين كان معانا.md');
  const month11File = path.join(__dirname, '../../docs/cases/nov_dec/شهر ١١ مين كان معانا.md');
  const month12File = path.join(__dirname, '../../docs/cases/nov_dec/حالات شهر ١٢ مين كان معانا.md');
  const outputFile = path.join(__dirname, '../../docs/cases/nov_dec/cases_month_1_11_12.csv');
  
  console.log('Parsing markdown files...');
  
  // Parse all files
  const month1Cases = parseMarkdownFile(month1File, 1);
  const month11Cases = parseMarkdownFile(month11File, 11);
  const month12Cases = parseMarkdownFile(month12File, 12);
  
  const allCases = [...month1Cases, ...month11Cases, ...month12Cases];
  
  console.log(`Found ${month1Cases.length} contributions in month 1`);
  console.log(`Found ${month11Cases.length} contributions in month 11`);
  console.log(`Found ${month12Cases.length} contributions in month 12`);
  console.log(`Total: ${allCases.length} contributions`);
  
  // Generate CSV with combined case number
  // Format: YYYYMMNN where YYYY=year, MM=month, NN=case number (padded to 2 digits)
  // Month 12 = December 2025, Month 11 = November 2025, Month 1 = January 2026
  const getYear = (month) => {
    const monthNum = parseInt(month);
    // Month 12 and 11 are in 2025, Month 1 is in 2026
    return monthNum === 1 ? 2026 : 2025;
  };
  
  const generateCombinedCaseNumber = (caseNumber, month) => {
    const year = getYear(month);
    const monthPadded = month.toString().padStart(2, '0');
    const caseNumPadded = caseNumber.toString().padStart(2, '0');
    return `${year}${monthPadded}${caseNumPadded}`;
  };
  
  const csvLines = ['CaseNumber,CombinedCaseNumber,CaseTitle,ContributorNickname,Amount,Month'];
  
  for (const caseData of allCases) {
    // Escape commas and quotes in CSV
    const escapeCSV = (str) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const combinedCaseNumber = generateCombinedCaseNumber(caseData.caseNumber, caseData.month);
    
    csvLines.push([
      caseData.caseNumber,
      combinedCaseNumber,
      escapeCSV(caseData.caseTitle),
      escapeCSV(caseData.contributorNickname),
      caseData.amount,
      caseData.month
    ].join(','));
  }
  
  // Write CSV with UTF-8 BOM for Excel compatibility
  const csvContent = '\uFEFF' + csvLines.join('\n');
  fs.writeFileSync(outputFile, csvContent, 'utf-8');
  
  console.log(`\nCSV file generated: ${outputFile}`);
  console.log(`Total rows: ${allCases.length}`);
  
  // Print summary
  const uniqueCases = new Set(allCases.map(c => c.caseNumber));
  const uniqueContributors = new Set(allCases.map(c => c.contributorNickname));
  const totalAmount = allCases.reduce((sum, c) => sum + c.amount, 0);
  
  console.log(`\nSummary:`);
  console.log(`- Unique cases: ${uniqueCases.size}`);
  console.log(`- Unique contributors: ${uniqueContributors.size}`);
  console.log(`- Total amount: ${totalAmount.toLocaleString()}`);
}

// Run if called directly
try {
  main();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

export { parseMarkdownFile, convertArabicNumber };
