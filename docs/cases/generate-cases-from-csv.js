import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read contributions.csv
const csvPath = path.join(__dirname, 'contributions.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV - handle commas in Arabic text properly
function parseCSVLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

const lines = csvContent.split('\n').filter(line => line.trim());
const headers = parseCSVLine(lines[0]);

// Find column indices
const idIdx = headers.indexOf('ID');
const descIdx = headers.indexOf('Description');
const contributorIdx = headers.indexOf('Contributor');
const amountIdx = headers.indexOf('Amount');
const monthIdx = headers.indexOf('Month');

// Group contributions by case ID
const casesMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  
  // Skip empty rows
  if (!values[idIdx] || values[idIdx] === '') continue;
  
  const caseId = values[idIdx];
  const titleAr = values[descIdx] || ''; // Use Description as Arabic title
  const contributor = values[contributorIdx] || '';
  const amount = parseFloat(values[amountIdx]?.replace(/[,"]/g, '') || '0');
  const monthStr = values[monthIdx] || '';
  
  if (!casesMap.has(caseId)) {
    casesMap.set(caseId, {
      id: caseId,
      titleAr: titleAr, // This is now the title, not description
      contributions: [],
      totalAmount: 0,
      contributorCount: 0,
      contributors: new Set(),
      month: monthStr,
    });
  }
  
  const caseData = casesMap.get(caseId);
  if (amount > 0) {
    caseData.contributions.push({
      contributor,
      amount,
    });
    caseData.totalAmount += amount;
    if (contributor && contributor.trim() !== '') {
      caseData.contributors.add(contributor);
    }
  }
  
  // Update contributor count
  caseData.contributorCount = caseData.contributors.size;
}

// Helper function to categorize case by title (previously description)
function categorizeCase(titleAr) {
  if (!titleAr) return 'other';
  
  const title = titleAr.toLowerCase();
  
  // Medical Support
  if (title.includes('مريض') || title.includes('دوا') || title.includes('أدويه') || 
      title.includes('علاج') || title.includes('عمليه') || title.includes('كانسر') ||
      title.includes('مستشفي') || title.includes('أشعه') || title.includes('سنان') ||
      title.includes('ضروس') || title.includes('قلب') || title.includes('حروق') ||
      title.includes('روماتيزم') || title.includes('تخاطب') || title.includes('جلسات') ||
      title.includes('سكر') || title.includes('شهريات')) {
    return 'medical';
  }
  
  // Educational Assistance
  if (title.includes('مدرسه') || title.includes('مدارس') || title.includes('دروس') ||
      title.includes('تعليم') || title.includes('مصاريف مدرس') || title.includes('لاب توب') ||
      title.includes('هندسه') || title.includes('ثانويه') || title.includes('طلبه') ||
      title.includes('أزهر') || title.includes('شباب الأزهر')) {
    return 'education';
  }
  
  // Housing & Rent
  if (title.includes('ايجار') || title.includes('إيجار') || title.includes('بيت') ||
      title.includes('شقه') || title.includes('سقف') || title.includes('ارضيه') ||
      title.includes('مرتبه') || title.includes('كهربا') || title.includes('كهرباء') ||
      title.includes('سباكه') || title.includes('حمام') || title.includes('تصليح')) {
    return 'housing';
  }
  
  // Home Appliances
  if (title.includes('تلاجه') || title.includes('غساله') || title.includes('بوتاجاز') ||
      title.includes('مروحه') || title.includes('فريزر') || title.includes('كولدير') ||
      title.includes('دولاب') || title.includes('شاشه') || title.includes('سرير') ||
      title.includes('جهاز') || title.includes('أنبوبه') || title.includes('ماكينه') ||
      title.includes('خياطه') || title.includes('اوفر') || title.includes('موبايل')) {
    return 'appliances';
  }
  
  // Emergency Relief
  if (title.includes('دين') || title.includes('دين حالا') || title.includes('غارمه') ||
      title.includes('مطلقه') || title.includes('أرمله') || title.includes('أيتام') ||
      title.includes('يتيم') || title.includes('بتيم') || title.includes('المتوفي') ||
      title.includes('اكفان')) {
    return 'emergency';
  }
  
  // Livelihood & Business Support
  if (title.includes('مشروع') || title.includes('عربيه') || title.includes('مقدم') ||
      title.includes('موتوسيكل') || title.includes('طيور') || title.includes('زراعه')) {
    return 'livelihood';
  }
  
  // Social & Community Support
  if (title.includes('جواز') || title.includes('حلويات') || title.includes('مولد') ||
      title.includes('مسجد') || title.includes('منبر') || title.includes('سجاجيد') ||
      title.includes('بنا') || title.includes('تجديد') || title.includes('افتتاح')) {
    return 'community';
  }
  
  // Basic Needs & Clothing
  if (title.includes('بطاطين') || title.includes('جواكت') || title.includes('لعب') ||
      title.includes('ميكب') || title.includes('فساتين') || title.includes('لبس') ||
      title.includes('شتوي') || title.includes('نيجيري')) {
    return 'basicneeds';
  }
  
  return 'other';
}

// Category name mappings
const categories = {
  medical: { 
    name: 'Medical Support', 
    nameAr: 'الدعم الطبي',
    descriptionEn: 'Emergency medical expenses, treatments, medications, and ongoing care',
    descriptionAr: 'النفقات الطبية الطارئة والعلاجات والأدوية والرعاية المستمرة'
  },
  education: { 
    name: 'Educational Assistance', 
    nameAr: 'المساعدة التعليمية',
    descriptionEn: 'School fees, supplies, tutoring, and educational support',
    descriptionAr: 'الرسوم الدراسية والمستلزمات والدروس الخصوصية والدعم التعليمي'
  },
  housing: { 
    name: 'Housing & Rent', 
    nameAr: 'السكن والإيجار',
    descriptionEn: 'Rent assistance, housing repairs, and utility bills',
    descriptionAr: 'مساعدة الإيجار وإصلاحات السكن وفواتير الخدمات'
  },
  appliances: { 
    name: 'Home Appliances', 
    nameAr: 'الأجهزة المنزلية',
    descriptionEn: 'Refrigerators, washing machines, stoves, and essential home appliances',
    descriptionAr: 'الثلاجات والغسالات والمواقد والأجهزة المنزلية الأساسية'
  },
  emergency: { 
    name: 'Emergency Relief', 
    nameAr: 'الإغاثة الطارئة',
    descriptionEn: 'Emergency support for widows, orphans, and families in crisis',
    descriptionAr: 'الدعم الطارئ للأرامل والأيتام والأسر في الأزمات'
  },
  livelihood: { 
    name: 'Livelihood & Business', 
    nameAr: 'الدعم المعيشي والتجاري',
    descriptionEn: 'Livelihood & Business category',
    descriptionAr: 'الدعم المعيشي والتجاري'
  },
  community: { 
    name: 'Community & Social', 
    nameAr: 'الدعم المجتمعي والاجتماعي',
    descriptionEn: 'Community & Social category',
    descriptionAr: 'الدعم المجتمعي والاجتماعي'
  },
  basicneeds: { 
    name: 'Basic Needs & Clothing', 
    nameAr: 'الاحتياجات الأساسية والملابس',
    descriptionEn: 'Basic Needs & Clothing category',
    descriptionAr: 'الاحتياجات الأساسية والملابس'
  },
  other: { 
    name: 'Other Support', 
    nameAr: 'دعم آخر',
    descriptionEn: 'Other Support category',
    descriptionAr: 'دعم آخر'
  },
};

// Helper function to generate English title from Arabic title
function generateEnglishTitle(titleAr, category) {
  const title = titleAr.toLowerCase();
  
  if (category === 'medical') {
    if (title.includes('شهريه') || title.includes('شهور')) {
      return 'Recurring Medical Support';
    }
    return 'Emergency Medical Support';
  }
  
  if (category === 'education') {
    return 'Educational Assistance';
  }
  
  if (category === 'housing') {
    return 'Housing Support';
  }
  
  if (category === 'appliances') {
    return 'Home Appliances Support';
  }
  
  if (category === 'emergency') {
    return 'Emergency Relief';
  }
  
  if (category === 'livelihood') {
    return 'Livelihood & Business Support';
  }
  
  if (category === 'community') {
    return 'Community & Social Support';
  }
  
  if (category === 'basicneeds') {
    return 'Basic Needs & Clothing Support';
  }
  
  return 'Support Case';
}

// Helper function to generate English description from Arabic title
function generateEnglishDescription(titleAr, category) {
  const categoryInfo = categories[category] || categories.other;
  
  // Create a more descriptive English description based on the Arabic title
  const title = titleAr.toLowerCase();
  let description = `Support provided for ${categoryInfo.name.toLowerCase()}`;
  
  // Add more context based on keywords
  if (title.includes('شهريه') || title.includes('شهور')) {
    description += ' - Monthly recurring support';
  } else if (title.includes('ايجار') || title.includes('إيجار')) {
    description += ' - Rent assistance';
  } else if (title.includes('دين')) {
    description += ' - Debt relief';
  } else if (title.includes('مشروع')) {
    description += ' - Business startup support';
  }
  
  // Add the Arabic title for context
  description += `. ${titleAr}`;
  
  return description;
}

// Helper function to generate Arabic description from Arabic title
function generateArabicDescription(titleAr, category) {
  // Use the title as the description, or add category context if needed
  // For now, just use the title as description since it's already descriptive
  return titleAr;
}

// Helper function to parse date
function parseDate(dateStr) {
  if (!dateStr || dateStr === '') return new Date('2025-07-15');
  
  // Format: DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2]);
    return new Date(year, month, day || 15);
  }
  
  return new Date('2025-07-15');
}

const sql = [];

sql.push('-- Insert cases and contributions from contributions.csv');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('-- This script creates cases and contributions from actual CSV data');
sql.push('-- Description column from CSV is used as title_ar');
sql.push('');

sql.push('BEGIN;');
sql.push('');

// Create case categories
sql.push('-- Create case categories');
for (const cat of Object.values(categories)) {
  // Use name_en for conflict detection, but insert all bilingual fields
  sql.push(`INSERT INTO case_categories (name, name_en, name_ar, description, description_en, description_ar, is_active) VALUES ('${cat.name}', '${cat.name}', '${cat.nameAr}', '${cat.descriptionEn}', '${cat.descriptionEn}', '${cat.descriptionAr}', true) ON CONFLICT (name) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar;`);
}
sql.push('');

// Create cases
sql.push('-- Create cases from CSV data');
sql.push('DO $$');
sql.push('DECLARE');
sql.push('    admin_user_id UUID;');
sql.push('    case_id_var UUID;');
sql.push('    category_id_var UUID;');
sql.push('    case_created_date TIMESTAMP;');
sql.push('BEGIN');
sql.push('    -- Get admin user (must exist)');
sql.push('    SELECT id INTO admin_user_id FROM users WHERE role = \'admin\' LIMIT 1;');
sql.push('    IF admin_user_id IS NULL THEN SELECT id INTO admin_user_id FROM users LIMIT 1; END IF;');
sql.push('    IF admin_user_id IS NULL THEN RAISE EXCEPTION \'No user found. Please create a user first.\'; END IF;');
sql.push('');

// Generate cases
const caseDataArray = [];
for (const [caseId, caseData] of casesMap) {
  const category = categorizeCase(caseData.titleAr);
  const categoryInfo = categories[category];
  
  // Use the CSV Description column directly as title_ar
  const titleAr = caseData.titleAr;
  
  // Generate English title from Arabic title
  const titleEn = generateEnglishTitle(caseData.titleAr, category);
  
  // Generate descriptions (can be more detailed or same as title)
  const descriptionAr = generateArabicDescription(caseData.titleAr, category);
  const descriptionEn = generateEnglishDescription(caseData.titleAr, category);
  
  const createdDate = parseDate(caseData.month);
  
  sql.push(`    -- Case ID: ${caseId} (${category})`);
  sql.push(`    SELECT id INTO category_id_var FROM case_categories WHERE name_en = '${categoryInfo.name}' LIMIT 1;`);
  sql.push(`    case_created_date := '${createdDate.toISOString()}';`);
  sql.push(`    INSERT INTO cases (`);
  sql.push(`        title_en,`);
  sql.push(`        title_ar,`);
  sql.push(`        description_ar,`);
  sql.push(`        description_en,`);
  sql.push(`        target_amount,`);
  sql.push(`        current_amount,`);
  sql.push(`        category_id,`);
  sql.push(`        priority,`);
  sql.push(`        status,`);
  sql.push(`        type,`);
  sql.push(`        created_by,`);
  sql.push(`        created_at`);
  sql.push(`    ) VALUES (`);
  sql.push(`        '${titleEn.replace(/'/g, "''")}',`);
  sql.push(`        '${titleAr.replace(/'/g, "''")}',`);
  sql.push(`        '${descriptionAr.replace(/'/g, "''")}',`);
  sql.push(`        '${descriptionEn.replace(/'/g, "''")}',`);
  sql.push(`        ${caseData.totalAmount},`);
  sql.push(`        ${caseData.totalAmount},`);
  sql.push(`        category_id_var,`);
  sql.push(`        'high',`);
  sql.push(`        'published',`);
  sql.push(`        'one-time',`);
  sql.push(`        admin_user_id,`);
  sql.push(`        case_created_date`);
  sql.push(`    ) RETURNING id INTO case_id_var;`);
  sql.push('');
  
  caseDataArray.push({
    caseId,
    titleAr: caseData.titleAr,
    contributions: caseData.contributions,
    createdDate,
  });
}

sql.push('END $$;');
sql.push('');

// Create contributions
sql.push('-- Create contributions for cases');
sql.push('DO $$');
sql.push('DECLARE');
sql.push('    admin_user_id UUID;');
sql.push('    case_id_var UUID;');
sql.push('    case_created_at TIMESTAMP;');
sql.push('    contrib_date TIMESTAMP;');
sql.push('    contrib_id_var UUID;');
sql.push('    case_title_var TEXT;');
sql.push('BEGIN');
sql.push('    -- Get admin user');
sql.push('    SELECT id INTO admin_user_id FROM users WHERE role = \'admin\' LIMIT 1;');
sql.push('    IF admin_user_id IS NULL THEN SELECT id INTO admin_user_id FROM users LIMIT 1; END IF;');
sql.push('');

for (const caseInfo of caseDataArray) {
  sql.push(`    -- Contributions for case: ${caseInfo.caseId}`);
  sql.push(`    SELECT id, created_at, title_ar INTO case_id_var, case_created_at, case_title_var FROM cases WHERE title_ar = '${caseInfo.titleAr.replace(/'/g, "''")}' LIMIT 1;`);
  sql.push(`    IF case_id_var IS NOT NULL THEN`);
  
  // Create contributions
  let contribIndex = 0;
  for (const contrib of caseInfo.contributions) {
    // Spread contributions over the month
    const daysOffset = contribIndex * 2; // Space them out
    contribIndex++;
    
    sql.push(`        contrib_date := case_created_at + (INTERVAL '${daysOffset}' DAY);`);
    sql.push(`        INSERT INTO contributions (`);
    sql.push(`            type,`);
    sql.push(`            amount,`);
    sql.push(`            payment_method,`);
    sql.push(`            status,`);
    sql.push(`            donor_id,`);
    sql.push(`            case_id,`);
    sql.push(`            created_at`);
    sql.push(`        ) VALUES (`);
    sql.push(`            'donation',`);
    sql.push(`            ${contrib.amount},`);
    sql.push(`            'bank_transfer',`);
    sql.push(`            'approved',`);
    sql.push(`            admin_user_id,`);
    sql.push(`            case_id_var,`);
    sql.push(`            contrib_date`);
    sql.push(`        ) RETURNING id INTO contrib_id_var;`);
    
    // Insert into contribution_approval_status with status 'approved'
    sql.push(`        INSERT INTO contribution_approval_status (`);
    sql.push(`            contribution_id,`);
    sql.push(`            status,`);
    sql.push(`            admin_id,`);
    sql.push(`            admin_comment,`);
    sql.push(`            created_at,`);
    sql.push(`            updated_at`);
    sql.push(`        ) VALUES (`);
    sql.push(`            contrib_id_var,`);
    sql.push(`            'approved',`);
    sql.push(`            admin_user_id,`);
    sql.push(`            'Automatically approved during data import',`);
    sql.push(`            contrib_date,`);
    sql.push(`            contrib_date`);
    sql.push(`        );`);
    
    // Insert notification for contribution approval
    sql.push(`        INSERT INTO notifications (`);
    sql.push(`            type,`);
    sql.push(`            recipient_id,`);
    sql.push(`            title,`);
    sql.push(`            message,`);
    sql.push(`            data,`);
    sql.push(`            read,`);
    sql.push(`            created_at`);
    sql.push(`        ) VALUES (`);
    sql.push(`            'contribution_approved',`);
    sql.push(`            admin_user_id,`);
    sql.push(`            'Contribution Approved',`);
    sql.push(`            'Your contribution of EGP ${contrib.amount} for "' || COALESCE(case_title_var, 'Case') || '" has been approved. Thank you for your generosity!',`);
    sql.push(`            jsonb_build_object(`);
    sql.push(`                'contribution_id', contrib_id_var,`);
    sql.push(`                'amount', ${contrib.amount},`);
    sql.push(`                'case_id', case_id_var,`);
    sql.push(`                'case_title', COALESCE(case_title_var, 'Case')`);
    sql.push(`            ),`);
    sql.push(`            false,`);
    sql.push(`            contrib_date`);
    sql.push(`        );`);
  }
  
  sql.push(`    END IF;`);
  sql.push('');
}

sql.push('END $$;');
sql.push('');

sql.push('COMMIT;');
sql.push('');
sql.push('-- Verify data');
sql.push('SELECT COUNT(*) as total_cases FROM cases WHERE status = \'published\';');
sql.push('SELECT COUNT(*) as total_contributions FROM contributions WHERE status = \'approved\';');
sql.push('SELECT SUM(amount) as total_raised FROM contributions WHERE status = \'approved\';');
sql.push('SELECT COUNT(DISTINCT donor_id) as unique_contributors FROM contributions WHERE status = \'approved\';');

const outputPath = path.join(__dirname, 'insert-cases-from-csv.sql');
fs.writeFileSync(outputPath, sql.join('\n'), 'utf-8');

console.log('✅ Generated SQL insert script from CSV');
console.log(`📁 Output: ${outputPath}`);
console.log(`\n📊 Data to insert:`);
console.log(`  Cases: ${casesMap.size} cases`);
console.log(`  Contributions: ${Array.from(casesMap.values()).reduce((sum, c) => sum + c.contributions.length, 0)} contributions`);
console.log(`  Total Amount: ${Array.from(casesMap.values()).reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString()} EGP`);
console.log(`  Unique Contributors: ${new Set(Array.from(casesMap.values()).flatMap(c => Array.from(c.contributors))).size}`);
