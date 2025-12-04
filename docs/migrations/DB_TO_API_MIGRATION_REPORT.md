# Database to API Migration Report

This document identifies all direct database communication in the codebase that should be replaced with API calls.

## Summary

**Total Files with Direct DB Access:** 36 files
- **Pages:** 18 files
- **Components:** 18 files

**API Routes Already Available:** Most core operations have API routes
**Missing API Routes:** Dashboard stats, profile stats, some case queries

---

## Pages with Direct Database Access

### 1. Dashboard Page (`src/app/[locale]/dashboard/page.tsx`)
**Status:** ⚠️ **NEEDS API ROUTE**

**Direct DB Queries:**
- Line 192-195: Fetch user contributions (`contributions` table)
- Line 198-201: Fetch user cases (`cases` table)

**Current Implementation:**
```typescript
const { data: contributions } = await supabase
  .from('contributions')
  .select('amount, status')
  .eq('donor_id', authUser.id)

const { data: cases } = await supabase
  .from('cases')
  .select('status')
  .eq('created_by', authUser.id)
```

**Recommended Solution:**
- Create `/api/dashboard/stats` endpoint
- Returns: `{ totalContributions, totalAmount, activeCases, completedCases }`

**Priority:** High (used on main dashboard)

---

### 2. Profile Page (`src/app/[locale]/profile/page.tsx`)
**Status:** ⚠️ **NEEDS API ROUTE**

**Direct DB Queries:**
- Line 137-141: Fetch user profile (`users` table)
- Line 163-168: Fetch contribution statistics (`contributions` table with join to `cases`)

**Current Implementation:**
```typescript
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', authUser.id)
  .single()

const { data: contributions } = await supabase
  .from('contributions')
  .select('id, amount, created_at, case_id, status, cases!inner(title, status)')
  .eq('donor_id', authUser.id)
```

**Recommended Solution:**
- Create `/api/profile/stats` endpoint
- Returns: `{ user, stats: { totalContributions, totalAmount, activeCases, completedCases, averageContribution, lastContribution, latestContribution } }`

**Priority:** High (user-facing page)

---

### 3. Case Detail Page (`src/app/[locale]/cases/[id]/page.tsx`)
**Status:** ⚠️ **PARTIAL - Some queries need API**

**Direct DB Queries:**
- Line 176-202: Fetch case details (`cases` table with join to `case_categories`)
- Line 243-247: Fetch case files (`case_files` table)
- Line 280-290: Fetch case updates (`case_updates` table)
- Line 300-310: Fetch beneficiary data (`beneficiaries` table)

**Current Implementation:**
```typescript
const { data, error } = await client
  .from('cases')
  .select(`id, title_en, title_ar, ..., case_categories(name)`)
  .eq('id', caseId)
  .single()

const { data: filesData } = await client
  .from('case_files')
  .select('*')
  .eq('case_id', caseId)

const { data: updatesData } = await client
  .from('case_updates')
  .select('*')
  .eq('case_id', caseId)

const { data: beneficiaryData } = await client
  .from('beneficiaries')
  .select('*')
  .eq('id', beneficiaryId)
```

**Existing API Routes:**
- ✅ `/api/cases/[id]` - GET endpoint exists but may not include all needed data

**Recommended Solution:**
- Enhance `/api/cases/[id]` to include:
  - Case files
  - Case updates
  - Beneficiary data (if linked)
  - Or create separate endpoints:
    - `/api/cases/[id]/files`
    - `/api/cases/[id]/updates`
    - `/api/cases/[id]/beneficiary`

**Priority:** Medium (can use existing API with enhancements)

---

### 4. Admin Cases Page (`src/app/[locale]/admin/cases/page.tsx`)
**Status:** ⚠️ **NEEDS API ROUTE**

**Direct DB Queries:**
- Line 92-95: Fetch all cases (`cases` table)
- Line 134-140: Fetch contributions for each case (`contributions` table with join to `contribution_approval_status`)

**Current Implementation:**
```typescript
const { data, error } = await supabase
  .from('cases')
  .select('*')
  .order('created_at', { ascending: false })

const { data, error } = await supabase
  .from('contributions')
  .select(`amount, contribution_approval_status!contribution_id(status)`)
  .eq('case_id', caseId)
```

**Existing API Routes:**
- ✅ `/api/cases` - GET endpoint exists but may need admin filtering

**Recommended Solution:**
- Enhance `/api/cases` to support:
  - Admin view (all cases)
  - Include contribution stats per case
  - Better filtering and pagination

**Priority:** Medium (admin-only page)

---

### 5. Case Edit Page (`src/app/[locale]/cases/[id]/edit/page.tsx`)
**Status:** ✅ **ALREADY USES API** (mostly)

**Direct DB Queries:**
- May have some direct queries for initial data loading

**Existing API Routes:**
- ✅ `/api/cases/[id]` - GET
- ✅ `/api/cases/[id]` - PATCH

**Priority:** Low (verify all operations use API)

---

### 6. Case Create Page (`src/app/[locale]/cases/create/page.tsx`)
**Status:** ✅ **ALREADY USES API** (mostly)

**Existing API Routes:**
- ✅ `/api/cases` - POST

**Priority:** Low (verify all operations use API)

---

### 7. Beneficiaries Edit Page (`src/app/[locale]/beneficiaries/[id]/edit/page.tsx`)
**Status:** ✅ **ALREADY USES API**

**Current Implementation:**
- Line 46: Uses `/api/beneficiaries/${beneficiaryId}` - GET
- Line 91: Uses `/api/beneficiaries/${beneficiaryId}` - PUT
- Line 134: Uses `/api/beneficiaries/${beneficiaryId}` - DELETE

**Priority:** ✅ Complete

---

### 8. Beneficiaries Create Page (`src/app/[locale]/beneficiaries/create/page.tsx`)
**Status:** ✅ **ALREADY USES API** (verify)

**Priority:** Low (verify)

---

### 9. Notifications Page (`src/app/[locale]/notifications/page.tsx`)
**Status:** ✅ **ALREADY USES API**

**Current Implementation:**
- Line 59: Uses `/api/notifications` - GET
- Line 79-105: Uses `/api/notifications/[id]/read` - POST

**Priority:** ✅ Complete

---

### 10. Contributions Detail Page (`src/app/[locale]/contributions/[id]/page.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Check for direct DB queries**

**Existing API Routes:**
- ✅ `/api/contributions/[id]` - GET

**Priority:** Low (verify)

---

### 11. Profile Edit Page (`src/app/[locale]/profile/edit/page.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Check for direct DB queries**

**Priority:** Low (verify)

---

### 12. Sponsor Pages
**Files:**
- `src/app/[locale]/sponsor/communications/page.tsx`
- `src/app/[locale]/sponsor/dashboard/page.tsx`
- `src/app/[locale]/sponsor/apply/page.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Priority:** Medium (verify all use API)

---

### 13. Admin Pages
**Files:**
- `src/app/[locale]/admin/page.tsx`
- `src/app/[locale]/admin/settings/page.tsx`
- `src/app/[locale]/admin/sponsorships/page.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Priority:** Medium (verify all use API)

---

### 14. Donate Page (`src/app/[locale]/cases/[id]/donate/page.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Priority:** Medium (verify)

---

## Components with Direct Database Access

### 1. CaseFileManager (`src/components/cases/CaseFileManager.tsx`)
**Status:** ⚠️ **PARTIAL - Some queries need API**

**Direct DB Queries:**
- Line 243-247: Fetch case files (`case_files` table)
- Line 300+: Upload and delete operations

**Existing API Routes:**
- ✅ `/api/cases/[id]/files/[fileId]` - DELETE
- ✅ `/api/upload` - POST (for uploads)

**Recommended Solution:**
- Use `/api/cases/[id]/files` for fetching files
- Already uses `/api/upload` for uploads
- Already uses `/api/cases/[id]/files/[fileId]` for deletes

**Priority:** Medium (needs to use GET endpoint for files)

---

### 2. BeneficiaryFileManager (`src/components/beneficiaries/BeneficiaryFileManager.tsx`)
**Status:** ✅ **ALREADY USES API**

**Current Implementation:**
- Line 89: Uses `BeneficiaryDocumentService.getByBeneficiaryId()` (which should use API)
- Line 118: Uses `/api/upload` - POST
- Line 134: Uses `BeneficiaryDocumentService.create()` (which should use API)

**Priority:** Low (verify service uses API)

---

### 3. UpdatesTimeline (`src/components/cases/UpdatesTimeline.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Check for direct DB queries**

**Existing API Routes:**
- ✅ `/api/cases/[id]/updates` - GET, POST
- ✅ `/api/cases/[id]/updates/[updateId]` - PUT, DELETE

**Priority:** Medium (verify all operations use API)

---

### 4. ContributionHistory (`src/components/profile/ContributionHistory.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Check for direct DB queries**

**Existing API Routes:**
- ✅ `/api/contributions` - GET (with filters)

**Priority:** Medium (verify uses API)

---

### 5. Navigation Components
**Files:**
- `src/components/navigation/NavigationBar.tsx`
- `src/components/navigation/ServerSidebarNavigation.tsx`
- `src/components/navigation/SimpleSidebar.tsx`
- `src/components/navigation/SidebarNavigation.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Check for direct DB queries (likely for menu items)**

**Existing API Routes:**
- ✅ `/api/admin/menu` - GET

**Priority:** Low (verify uses API)

---

### 6. NotificationCenter (`src/components/notifications/NotificationCenter.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Check for direct DB queries**

**Existing API Routes:**
- ✅ `/api/notifications` - GET

**Priority:** Medium (verify uses API)

---

### 7. Recurring Contribution Components
**Files:**
- `src/components/contributions/RecurringContributionForm.tsx`
- `src/components/contributions/RecurringContributionDashboard.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Existing API Routes:**
- ✅ `/api/recurring-contributions` - GET, POST
- ✅ `/api/recurring-contributions/[id]` - GET, PUT, DELETE

**Priority:** Medium (verify uses API)

---

### 8. SponsorshipRequestForm (`src/components/sponsorships/SponsorshipRequestForm.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Priority:** Medium (verify)

---

### 9. BatchContributionProcessor (`src/components/admin/BatchContributionProcessor.tsx`)
**Status:** ⚠️ **NEEDS VERIFICATION**

**Priority:** Medium (verify)

---

### 10. File Upload Components
**Files:**
- `src/components/cases/ImageUpload.tsx`
- `src/components/cases/SimpleFileUpload.tsx`
- `src/components/files/GenericFileUploader.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Existing API Routes:**
- ✅ `/api/upload` - POST

**Priority:** Medium (verify uses API)

---

### 11. Layout Components
**Files:**
- `src/components/layout/ConditionalLayout.tsx`
- `src/components/layout/ServerLayout.tsx`

**Status:** ⚠️ **NEEDS VERIFICATION**

**Priority:** Low (verify)

---

## Missing API Routes to Create

### High Priority

1. **`/api/dashboard/stats`** - GET
   - Returns dashboard statistics for current user
   - Response: `{ totalContributions, totalAmount, activeCases, completedCases }`

2. **`/api/profile/stats`** - GET
   - Returns profile and statistics for current user
   - Response: `{ user, stats: { ... } }`

### Medium Priority

3. **`/api/cases/[id]/files`** - GET
   - Returns all files for a case
   - May already exist, verify

4. **`/api/cases/[id]/updates`** - GET (enhance existing)
   - Verify includes all needed data

5. **`/api/cases`** - GET (enhance for admin)
   - Add admin filtering
   - Include contribution stats per case

---

## Migration Priority

### Phase 1: High Priority (User-Facing)
1. ✅ Dashboard stats API (`/api/dashboard/stats`)
2. ✅ Profile stats API (`/api/profile/stats`)
3. ⚠️ Case detail page (enhance existing API)

### Phase 2: Medium Priority (Admin & Components)
1. ⚠️ Admin cases page (enhance existing API)
2. ⚠️ CaseFileManager (use GET endpoint)
3. ⚠️ Verify all components use API

### Phase 3: Low Priority (Verification)
1. ⚠️ Verify all pages use API
2. ⚠️ Verify all components use API
3. ⚠️ Remove unused direct DB access code

---

## Implementation Guidelines

### When Creating New API Routes

1. **Use Server-Side Supabase Client**
   ```typescript
   import { createClient } from '@/lib/supabase/server'
   const supabase = await createClient()
   ```

2. **Include Proper Error Handling**
   ```typescript
   try {
     // ... database operations
   } catch (error) {
     logger.error('Error:', error)
     return NextResponse.json({ error: '...' }, { status: 500 })
   }
   ```

3. **Include Authentication Checks**
   ```typescript
   const { data: { user }, error: authError } = await supabase.auth.getUser()
   if (authError || !user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

4. **Use Consistent Response Format**
   ```typescript
   return NextResponse.json({
     success: true,
     data: { ... }
   })
   ```

### When Replacing Direct DB Access

1. **Replace `createClient()` from `@/lib/supabase/client`**
   ```typescript
   // OLD
   const supabase = createClient()
   const { data } = await supabase.from('table').select('*')
   
   // NEW
   const response = await fetch('/api/endpoint')
   const { data } = await response.json()
   ```

2. **Handle Loading States**
   ```typescript
   const [loading, setLoading] = useState(true)
   const [data, setData] = useState(null)
   
   useEffect(() => {
     fetch('/api/endpoint')
       .then(res => res.json())
       .then(result => {
         setData(result.data)
         setLoading(false)
       })
   }, [])
   ```

3. **Handle Errors**
   ```typescript
   try {
     const response = await fetch('/api/endpoint')
     if (!response.ok) {
       throw new Error('Failed to fetch')
     }
     const result = await response.json()
   } catch (error) {
     toast.error('Error', { description: error.message })
   }
   ```

---

## Testing Checklist

For each migrated endpoint:

- [ ] API route returns correct data
- [ ] API route handles errors gracefully
- [ ] API route includes authentication
- [ ] Frontend displays data correctly
- [ ] Frontend handles loading states
- [ ] Frontend handles error states
- [ ] No direct DB queries remain in component/page
- [ ] All related functionality still works

---

## Notes

- Some components may use services that internally use direct DB access. These services should also be migrated to use API routes.
- Server components can use direct DB access, but client components should always use API routes.
- The `createClient()` from `@/lib/supabase/client` should only be used for client-side auth operations, not data fetching.

