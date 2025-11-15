# Storage Validation Consistency

## Overview

The storage validation system ensures that file uploads are validated consistently using the same rules stored in the database. This document explains how the validation works and how to maintain consistency.

## Validation Flow

1. **Configuration Storage**: Storage rules are stored in the `storage_rules` table
   - `bucket_name`: The bucket these rules apply to
   - `max_file_size_mb`: Maximum file size in MB
   - `allowed_extensions`: Array of allowed file extensions (lowercase)

2. **Validation Process**: 
   - Upload route calls `validateUpload(bucketName, file)`
   - Function fetches rules from `storage_rules` table
   - If no rule exists, uses defaults (5MB, common file types including videos)
   - Validates file size and extension against rules
   - Returns validation result with error message if invalid

3. **Extension Normalization**:
   - All extensions are normalized to lowercase
   - Whitespace is trimmed
   - Duplicates are removed when saving rules
   - Comparison is case-insensitive

## Supported File Types

### Images
- pdf, jpg, jpeg, png, gif, webp

### Documents
- doc, docx, xls, xlsx, txt, csv, ppt, pptx

### Archives
- zip, rar, 7z, tar, gz

### Videos
- mp4, avi, mov, wmv, flv, webm, mkv, m4v, mpg, mpeg, 3gp

### Audio
- mp3, wav, ogg, aac, flac, m4a, wma

## Default Configuration

If no storage rule exists for a bucket:
- **Max file size**: 5MB
- **Allowed extensions**: pdf, jpg, jpeg, png, gif, webp, mp4, avi, mov, webm

## Consistency Guarantees

1. **Database → Validation**: The validation function always reads from the database
2. **Normalization**: Extensions are normalized the same way when saving and validating
3. **No Hardcoded Checks**: The upload route uses only the validation utility
4. **Case-Insensitive**: All extension comparisons are case-insensitive

## Updating Allowed File Types

1. Navigate to `/admin/settings/storage`
2. Click "View Details" on the bucket
3. Select/deselect file types in the "Allowed File Types" section
4. Click "Save Rules"
5. The validation will immediately use the new rules

## Troubleshooting

### File type not allowed but should be
- Check if the extension is selected in the bucket configuration
- Verify the extension is in lowercase in the database
- Check for typos in the file extension

### Validation not working
- Verify the `storage_rules` table exists and has data
- Check that the bucket name matches exactly
- Ensure the validation function is being called (check logs)

### Inconsistent validation
- Make sure extensions are normalized (lowercase, trimmed)
- Verify no hardcoded file type checks exist in the upload route
- Check that the database and validation use the same normalization

