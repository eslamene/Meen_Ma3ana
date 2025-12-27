# Bulk Beneficiary Upload Feature

## Overview

The bulk upload feature allows administrators to import multiple beneficiaries at once using an Excel file (.xlsx, .xls, or .csv format).

## Features

- ✅ **Excel File Support**: Upload .xlsx, .xls, or .csv files
- ✅ **Template Download**: Download a pre-formatted Excel template
- ✅ **Data Validation**: Automatic validation of required fields and data types
- ✅ **Duplicate Detection**: Prevents duplicate entries (both in file and database)
- ✅ **Error Reporting**: Detailed error messages for each failed row
- ✅ **Progress Tracking**: Real-time upload progress
- ✅ **Bulk Processing**: Efficient batch insertion into database

## How to Use

### Step 1: Access Bulk Upload

1. Navigate to the Beneficiaries page (`/[locale]/beneficiaries`)
2. Click the **"Bulk Upload"** button next to "Add Beneficiary"

### Step 2: Download Template (Optional)

1. Click **"Download Template"** in the upload modal
2. A file named `beneficiaries_template.xlsx` will be downloaded
3. Use this template as a reference for the correct column format

### Step 3: Prepare Your Excel File

Your Excel file should have the following columns:

| Column Name | Required | Type | Description | Example |
|------------|----------|------|-------------|---------|
| `name` | ✅ Yes | Text | Beneficiary's full name | Ahmed Mohamed |
| `name_ar` | No | Text | Arabic name | أحمد محمد |
| `age` | No | Number | Age in years | 35 |
| `gender` | No | Text | male, female, or other | male |
| `mobile_number` | ⚠️* | Text | Primary mobile number | 01001234567 |
| `additional_mobile_number` | No | Text | Secondary mobile number | 01009876543 |
| `email` | No | Text | Email address | ahmed@example.com |
| `alternative_contact` | No | Text | Alternative contact info | 02-12345678 |
| `national_id` | ⚠️* | Text | National ID or passport | 12345678901234 |
| `id_type` | No | Text | national_id, passport, or other | national_id |
| `address` | No | Text | Street address | 123 Main Street |
| `city` | No | Text | City name | Cairo |
| `governorate` | No | Text | Governorate/Province | Cairo |
| `country` | No | Text | Country (defaults to Egypt) | Egypt |
| `medical_condition` | No | Text | Medical condition description | Chronic illness |
| `social_situation` | No | Text | Social/financial situation | Low income |
| `family_size` | No | Number | Total family members | 5 |
| `dependents` | No | Number | Number of dependents | 2 |
| `notes` | No | Text | Additional notes | Additional information |
| `tags` | No | Text | Comma-separated tags | chronic_illness,low_income |
| `risk_level` | No | Text | low, medium, high, or critical | medium |

**⚠️ Note**: Either `mobile_number` OR `national_id` is required (at least one must be provided).

### Step 4: Upload File

1. Drag and drop your Excel file into the upload area, or click "Browse Files"
2. The file will be validated (max 10MB)
3. Click **"Upload File"** to start processing

### Step 5: Review Results

After upload, you'll see:
- **Total Rows**: Number of rows in your file
- **Created**: Number of successfully imported beneficiaries
- **Skipped**: Number of rows that were skipped (duplicates, errors, etc.)
- **Validation Errors**: Detailed list of errors for each failed row

## Validation Rules

### Required Fields
- `name` must be provided and non-empty
- Either `mobile_number` OR `national_id` must be provided

### Data Validation
- **Age**: Must be a positive number
- **Gender**: Must be one of: `male`, `female`, `other`
- **Family Size**: Must be a positive number
- **Dependents**: Must be a non-negative number
- **Risk Level**: Must be one of: `low`, `medium`, `high`, `critical`
- **Tags**: Comma-separated list (e.g., `tag1,tag2,tag3`)

### Duplicate Prevention
- Checks for duplicates within the uploaded file
- Checks for existing beneficiaries in the database
- Uses `mobile_number` and `national_id` for duplicate detection

### Lookup Resolution
- **City**: Automatically resolves city names to city IDs if city exists in lookup table
- **ID Type**: Automatically resolves ID type names to ID type IDs if exists in lookup table

## Error Handling

### Common Errors

1. **"Name is required"**
   - Solution: Ensure the `name` column has a value for all rows

2. **"Either mobile_number or national_id is required"**
   - Solution: Provide at least one identifier per row

3. **"Beneficiary already exists in database"**
   - Solution: The beneficiary with this mobile number or national ID already exists. Update the existing record instead.

4. **"Duplicate entry in this file"**
   - Solution: Remove duplicate rows from your Excel file

5. **"Invalid file type"**
   - Solution: Use .xlsx, .xls, or .csv format only

6. **"File size must be less than 10MB"**
   - Solution: Split your file into smaller batches

## API Endpoint

The bulk upload is handled by:
```
POST /api/beneficiaries/bulk-upload
```

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field containing the Excel file

**Response:**
```json
{
  "success": true,
  "total": 100,
  "created": 95,
  "skipped": 5,
  "errors": [
    {
      "row": 3,
      "field": "name",
      "message": "Name is required"
    }
  ],
  "message": "Successfully imported 95 beneficiaries. 5 rows were skipped."
}
```

## Technical Details

### File Processing
- Uses `xlsx` library for Excel file parsing
- Supports both .xlsx (Excel 2007+) and .xls (Excel 97-2003) formats
- Also supports CSV files

### Database Operations
- Uses Supabase service role client for bulk inserts
- Processes rows in batches for efficiency
- Validates each row before insertion
- Skips invalid rows and continues processing

### Performance
- Handles files up to 10MB
- Processes rows sequentially to maintain data integrity
- Provides real-time feedback during upload

## Best Practices

1. **Use the Template**: Always download and use the template to ensure correct format
2. **Validate Data First**: Check your data in Excel before uploading
3. **Start Small**: Test with a small file first (10-20 rows) before uploading large batches
4. **Review Errors**: Always review the error list to fix data issues
5. **Backup Data**: Keep a backup of your Excel file before uploading
6. **Check Duplicates**: Remove duplicates from your file before uploading

## Troubleshooting

### Upload Fails Immediately
- Check file size (must be < 10MB)
- Verify file format (.xlsx, .xls, or .csv)
- Ensure you have admin permissions

### Some Rows Not Imported
- Check the error list in the results
- Verify required fields are filled
- Check for duplicate entries

### Slow Upload
- Large files may take time to process
- Check your internet connection
- Consider splitting into smaller batches

## Future Enhancements

Potential improvements:
- [ ] Preview data before upload
- [ ] Edit rows in preview before importing
- [ ] Export error report to Excel
- [ ] Support for updating existing beneficiaries
- [ ] Batch size configuration
- [ ] Progress percentage for large files

