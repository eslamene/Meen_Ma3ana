# Case File Management System

This document describes the comprehensive file management system implemented for case support documents in the Meen Ma3ana donation platform.

## 🎯 **Overview**

The case file management system allows users to upload, organize, preview, and manage supporting documents for charity cases. Files are categorized by type, stored securely in Supabase Storage, and can be previewed directly in the browser.

## 📁 **File Categories**

The system organizes files into the following categories:

### 1. **Medical Documents** 🏥
- **Purpose**: Medical reports, prescriptions, test results
- **Allowed Types**: PDF, JPEG, PNG, JPG
- **Use Cases**: Hospital reports, doctor prescriptions, medical certificates

### 2. **Financial Documents** 💰
- **Purpose**: Bills, receipts, financial statements
- **Allowed Types**: PDF, Images, Excel files
- **Use Cases**: Medical bills, income statements, expense receipts

### 3. **Identity Documents** 🆔
- **Purpose**: ID cards, passports, certificates
- **Allowed Types**: PDF, JPEG, PNG, JPG
- **Use Cases**: National ID, birth certificates, legal documents

### 4. **Photos & Images** 📸
- **Purpose**: Case photos, before/after images
- **Allowed Types**: JPEG, PNG, JPG, GIF, WebP
- **Use Cases**: Case situation photos, progress images

### 5. **Videos** 🎥
- **Purpose**: Case videos, testimonials
- **Allowed Types**: MP4, WebM, OGG, AVI
- **Use Cases**: Video testimonials, case documentation

### 6. **Audio Files** 🎵
- **Purpose**: Voice recordings, audio testimonials
- **Allowed Types**: MP3, WAV, OGG, M4A
- **Use Cases**: Voice testimonials, recorded interviews

### 7. **Other Documents** 📄
- **Purpose**: Other supporting documents
- **Allowed Types**: PDF, Word documents, Text files
- **Use Cases**: Legal documents, reports, letters

## 🔧 **Technical Implementation**

### **Database Schema**
```sql
-- Cases table includes supporting_documents field
ALTER TABLE cases ADD COLUMN supporting_documents TEXT; -- JSON array of file metadata
```

### **Storage Structure**
```
case-files/
├── {caseId}/
│   ├── medical/
│   │   ├── {fileId}-{originalName}
│   ├── financial/
│   │   ├── {fileId}-{originalName}
│   ├── identity/
│   │   ├── {fileId}-{originalName}
│   ├── photos/
│   │   ├── {fileId}-{originalName}
│   ├── videos/
│   │   ├── {fileId}-{originalName}
│   ├── audio/
│   │   ├── {fileId}-{originalName}
│   └── other/
│       ├── {fileId}-{originalName}
```

### **File Metadata Structure**
```typescript
interface CaseFile {
  id: string                    // Unique file identifier
  name: string                  // Storage path
  originalName: string          // Original filename
  url: string                   // Public URL
  size: number                  // File size in bytes
  type: string                  // MIME type
  category: FileCategory        // File category
  description?: string          // Optional description
  uploadedAt: string           // Upload timestamp
  uploadedBy: string           // User ID who uploaded
  uploaderName?: string        // Uploader display name
  isPublic: boolean            // Visibility flag
  thumbnail?: string           // Thumbnail URL (future)
}
```

## 🔒 **Security & Permissions**

### **Storage Bucket Configuration**
- **Bucket Name**: `case-files`
- **Public Access**: Disabled (Private)
- **File Size Limit**: 50MB per file
- **MIME Type Restrictions**: Only allowed file types can be uploaded

### **Row Level Security (RLS) Policies**

#### **View Policy** 👁️
```sql
-- Users can view files from cases they have access to
CREATE POLICY "case_files_view_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'case-files' AND
  auth.role() = 'authenticated' AND
  (
    -- Case creators can see their files
    EXISTS (SELECT 1 FROM cases WHERE cases.id = split_part(name, '/', 1)::uuid AND cases.created_by = auth.uid()) OR
    -- Admins can see all files
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator'))
  )
);
```

#### **Upload Policy** ⬆️
```sql
-- Users can upload files to cases they can edit
CREATE POLICY "case_files_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'case-files' AND
  auth.role() = 'authenticated' AND
  (
    -- Case creators can upload files
    EXISTS (SELECT 1 FROM cases WHERE cases.id = split_part(name, '/', 1)::uuid AND cases.created_by = auth.uid()) OR
    -- Admins can upload files to any case
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator'))
  )
);
```

#### **Delete Policy** 🗑️
```sql
-- Users can delete files they uploaded or admins can delete any
CREATE POLICY "case_files_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'case-files' AND
  auth.role() = 'authenticated' AND
  (
    -- File uploader can delete their own files
    owner = auth.uid() OR
    -- Admins can delete any file
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator'))
  )
);
```

## 🎨 **User Interface Features**

### **File Manager Component** (`CaseFileManager`)
- **Grid/List View**: Toggle between grid and list display modes
- **Category Filtering**: Filter files by category with counts
- **Search Functionality**: Search files by name, description, or category
- **Drag & Drop Upload**: Intuitive file upload interface
- **Progress Tracking**: Real-time upload progress indicators

### **File Preview Modal**
- **Multi-format Support**: Preview images, videos, audio, and PDFs
- **Metadata Display**: Show file details, category, size, upload date
- **Edit Capabilities**: Update file description, category, and visibility
- **Download Options**: Direct download and open in new tab

### **Category Organization**
- **Visual Categories**: Color-coded badges for each file type
- **Smart Categorization**: Automatic category assignment based on MIME type
- **Category Statistics**: Display file counts per category

## 📍 **Integration Points**

### **Case Detail Page** (`/cases/[id]`)
- **New "Files" Tab**: Dedicated tab for viewing case files
- **Read-only Mode**: View and download files (edit permissions required for management)
- **File Count Badge**: Shows number of files in tab header

### **Case Edit Page** (`/cases/[id]/edit`)
- **Files Management Tab**: Full file management capabilities
- **Upload Interface**: Add new files during case editing
- **File Organization**: Organize and categorize uploaded files

### **Case Creation Flow**
- **Future Enhancement**: File upload during case creation process
- **Template Support**: Pre-defined file categories based on case type

## 🚀 **Usage Examples**

### **Uploading Files**
```typescript
// Files are automatically categorized based on MIME type
const handleFileUpload = async (files: FileList) => {
  // Files are uploaded to: case-files/{caseId}/{category}/{fileId}-{originalName}
  // Metadata is stored in cases.supporting_documents as JSON
}
```

### **Retrieving Files**
```typescript
// Files are loaded from the supporting_documents field
const caseFiles = JSON.parse(caseData.supporting_documents || '[]') as CaseFile[]
```

### **File Operations**
```typescript
// View file
const handlePreview = (file: CaseFile) => {
  // Opens preview modal with file content
}

// Download file
const handleDownload = (file: CaseFile) => {
  window.open(file.url, '_blank')
}

// Delete file (with permissions)
const handleDelete = async (fileId: string) => {
  // Removes from storage and updates database
}
```

## 📊 **File Statistics & Analytics**

### **Per Case Statistics**
- Total files uploaded
- Total storage used
- Files by category breakdown
- Upload timeline

### **System-wide Metrics** (Future)
- Most common file types
- Storage usage trends
- Upload patterns by user type

## 🔄 **File Lifecycle**

### **Upload Process**
1. **File Selection**: User selects files via drag-drop or file picker
2. **Validation**: Check file type, size, and permissions
3. **Categorization**: Automatic category assignment based on MIME type
4. **Storage Upload**: Upload to Supabase Storage with organized path
5. **Metadata Storage**: Save file metadata to database
6. **UI Update**: Refresh file list and show success feedback

### **View Process**
1. **Permission Check**: Verify user can view case files
2. **Metadata Retrieval**: Load file list from database
3. **Category Filtering**: Apply selected filters and search
4. **Display**: Show files in grid or list view
5. **Preview**: Open preview modal for supported file types

### **Delete Process**
1. **Permission Check**: Verify user can delete file
2. **Confirmation**: Show delete confirmation dialog
3. **Storage Removal**: Delete file from Supabase Storage
4. **Metadata Update**: Remove from database and update UI
5. **Cleanup**: Update file counts and category statistics

## 🛠️ **Setup Instructions**

### **1. Create Storage Bucket**
```bash
# Run the setup script
node scripts/create-case-files-bucket.js
```

### **2. Verify Bucket Configuration**
- Go to Supabase Dashboard → Storage
- Confirm `case-files` bucket exists
- Verify RLS policies are active

### **3. Test File Operations**
- Upload a test file
- Verify file appears in correct category
- Test preview functionality
- Confirm download works
- Test delete operation (with permissions)

## 🎯 **Best Practices**

### **File Organization**
- Use descriptive filenames
- Add meaningful descriptions to files
- Categorize files appropriately
- Keep file sizes reasonable (under 50MB)

### **Security**
- Never store sensitive files in public buckets
- Regularly audit file permissions
- Monitor storage usage and costs
- Implement file retention policies

### **Performance**
- Optimize images before upload
- Use appropriate file formats
- Implement lazy loading for large file lists
- Cache file metadata when possible

## 🔮 **Future Enhancements**

### **Planned Features**
- **File Versioning**: Track file updates and changes
- **Bulk Operations**: Upload/delete multiple files at once
- **File Sharing**: Share files with specific users or roles
- **Thumbnail Generation**: Automatic thumbnails for images and videos
- **File Compression**: Automatic compression for large files
- **OCR Integration**: Extract text from scanned documents
- **File Templates**: Pre-defined file requirements by case type

### **Advanced Features**
- **File Approval Workflow**: Admin approval for sensitive documents
- **Digital Signatures**: Verify document authenticity
- **Audit Trail**: Track all file operations
- **Integration APIs**: Connect with external document systems
- **Mobile App Support**: Optimized mobile file management

## 📞 **Support & Troubleshooting**

### **Common Issues**
- **Upload Fails**: Check file size (max 50MB) and type restrictions
- **Permission Denied**: Verify user has edit permissions for the case
- **Preview Not Working**: Ensure file type is supported for preview
- **Files Not Showing**: Check RLS policies and user permissions

### **Debug Steps**
1. Check browser console for errors
2. Verify Supabase Storage bucket exists
3. Confirm RLS policies are active
4. Test with different file types and sizes
5. Check user permissions and roles

---

## 🎉 **Summary**

The Case File Management System provides a comprehensive, secure, and user-friendly solution for managing supporting documents in charity cases. With automatic categorization, secure storage, and intuitive preview capabilities, it streamlines the document management process while maintaining strict security standards.

**Key Benefits:**
- ✅ **Organized**: Files are automatically categorized and easily searchable
- ✅ **Secure**: Row-level security ensures only authorized users can access files
- ✅ **User-friendly**: Intuitive drag-drop interface with preview capabilities
- ✅ **Scalable**: Built on Supabase Storage for reliable, scalable file storage
- ✅ **Flexible**: Supports multiple file types with extensible category system

