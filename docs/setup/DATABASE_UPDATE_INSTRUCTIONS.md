# Database Update Instructions

## Adding Transaction Number and Attachments Fields

To add the missing fields to the contributions table, run these SQL commands in your Supabase SQL editor:

### 1. Add Transaction Number Field
```sql
ALTER TABLE contributions ADD COLUMN transaction_number text;
```

### 2. Add Attachments Field
```sql
ALTER TABLE contributions ADD COLUMN attachments text;
```

### 3. Verify the Changes
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contributions' 
AND column_name IN ('transaction_number', 'attachments')
ORDER BY column_name;
```

## Field Descriptions

- **transaction_number**: Text field to store payment transaction IDs or reference numbers
- **attachments**: Text field to store JSON array of file URLs for additional documents

## Usage

Once the fields are added:

1. **Transaction Numbers**: Can be populated when contributions are created or updated
2. **Attachments**: Should be stored as JSON array of URLs, e.g., `["url1", "url2", "url3"]`

## Example Data

```json
{
  "transaction_number": "TXN123456789",
  "attachments": "[\"https://example.com/doc1.pdf\", \"https://example.com/doc2.jpg\"]"
}
```

## Testing

After adding the fields, you can test by:

1. Running the check script: `node scripts/check-contributions-schema.js`
2. Visiting the admin contributions page to see the new fields
3. Creating test contributions with transaction numbers and attachments 