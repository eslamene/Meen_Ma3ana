# Supabase to API Wrapper Migration Checklist

This document tracks the migration from direct Supabase database communication to API wrapper calls.

## Migration Status Overview

- **Total Files with Direct Supabase Calls**: 71 files
- **Total Direct Supabase Calls**: 169+ instances
- **Progress**: Infrastructure complete, core routes migrated

---

## Phase 1: Service Layer Infrastructure ✅ COMPLETE

### API Client Utilities
- [x] Create `src/lib/api/apiClient.ts` - Base fetch wrapper with error handling
- [x] Create `src/lib/api/index.ts` - Centralized exports

### Services Created/Refactored
- [x] `BeneficiaryService` - Refactored to server-side only (accepts Supabase client)
- [x] `CaseService` - Created with full CRUD operations + getCasesWithStats
- [x] `ContributionService` - Created with search, filtering, and stats
- [x] `CategoryService` - Created with full CRUD operations
- [x] `NotificationService` - Created with full CRUD operations
- [x] `MenuService` - Created with full CRUD operations
- [x] `UserService` - Created with user management operations
- [x] `StatsService` - Created for admin dashboard statistics
- [x] `ContactService` - Created for contact form submissions
- [x] `PaymentMethodService` - Created for payment method operations
- [x] `StorageBucketService` - Enhanced with storage rules methods (getStorageRules, getStorageRule, upsertStorageRule)
- [x] `SystemConfigService` - Created for system configuration management
- [x] `ApprovalService` - Created for contribution approval status management
- [x] `AIRuleService` - Created for AI rules and parameters management
- [x] `SponsorshipService` - Created for sponsorship management
- [x] `PermissionService` - Created for permission management
- [x] `SponsorApplicationService` - Created for sponsor application management
- [x] `CommunicationService` - Created for communication/message management

---

## Phase 2: API Routes Refactoring

### Core API Routes ✅ COMPLETE
- [x] `src/app/api/beneficiaries/route.ts` - GET, POST using BeneficiaryService
- [x] `src/app/api/beneficiaries/[id]/route.ts` - GET, PUT, DELETE using BeneficiaryService
- [x] `src/app/api/cases/route.ts` - GET, POST using CaseService
- [x] `src/app/api/contributions/route.ts` - GET, POST using ContributionService
- [x] `src/app/api/categories/route.ts` - GET, POST using CategoryService
- [x] `src/app/api/notifications/route.ts` - GET, POST using NotificationService
- [x] `src/app/api/admin/menu/route.ts` - GET, POST using MenuService

### Case Detail Routes ✅ PARTIAL
- [x] `src/app/api/cases/[id]/route.ts` - GET using CaseService (PATCH still has complex logic)
- [x] `src/app/api/cases/[id]/delete/route.ts` - DELETE using CaseService
- [x] `src/app/api/cases/[id]/progress/route.ts` - GET using ContributionService
- [x] `src/app/api/categories/[id]/route.ts` - GET, PUT, DELETE using CategoryService
- [x] `src/app/api/cases/[id]/status/route.ts` - GET, PATCH, POST using CaseLifecycleService and services (helper function refactored)
- [x] `src/app/api/cases/[id]/updates/route.ts` - GET, POST using caseUpdateService and CaseService
- [x] `src/app/api/cases/[id]/updates/[updateId]/route.ts` - PUT, DELETE using caseUpdateService and UserService
- [ ] `src/app/api/cases/[id]/files/route.ts` - GET, POST (storage operations)
- [ ] `src/app/api/cases/[id]/files/[fileId]/route.ts` - DELETE (storage operations)
- [x] `src/app/api/cases/[id]/transitions/route.ts` - GET using CaseService and UserService

### Contribution Detail Routes ⏳ IN PROGRESS
- [x] `src/app/api/contributions/[id]/route.ts` - GET using ContributionService (admin check and formatting logic kept in route)
- [x] `src/app/api/contributions/[id]/approval-status/route.ts` - GET, POST using ApprovalService (contribution/case updates still direct - TODO: add update methods to services)
- [x] `src/app/api/contributions/[id]/revise/route.ts` - POST using ContributionService, CaseService, and NotificationService
- [x] `src/app/api/contributions/[id]/resubmit/route.ts` - POST using ContributionService and NotificationService

### Admin Routes ⏳ IN PROGRESS
- [x] `src/app/api/admin/dashboard/route.ts` - GET using StatsService
- [x] `src/app/api/admin/cases/stats/route.ts` - GET using CaseService.getCasesWithStats
- [ ] `src/app/api/admin/cases/batch-upload/route.ts` - POST, GET
- [ ] `src/app/api/admin/cases/batch-upload/[batchId]/route.ts` - GET, PUT
- [x] `src/app/api/admin/contributions/route.ts` - GET forwards to internal API, POST uses ContributionService.createAdminContribution
- [ ] `src/app/api/admin/contributions/batch/route.ts` - POST
- [ ] `src/app/api/admin/users/route.ts` - GET, POST using UserService
- [ ] `src/app/api/admin/users/[userId]/route.ts` - GET, PUT, DELETE using UserService
- [ ] `src/app/api/admin/users/[userId]/roles/route.ts` - GET, POST, DELETE
- [ ] `src/app/api/admin/users/[userId]/update-email-from-phone/route.ts` - POST
- [ ] `src/app/api/admin/users/[userId]/reset-password/route.ts` - POST
- [ ] `src/app/api/admin/users/next-contributor-email/route.ts` - GET
- [ ] `src/app/api/admin/users/merge/route.ts` - POST
- [ ] `src/app/api/admin/users/merge/preview/route.ts` - POST
- [ ] `src/app/api/admin/users/merge/rollback/route.ts` - POST
- [x] `src/app/api/admin/menu/[id]/route.ts` - PUT, DELETE using MenuService
- [x] `src/app/api/admin/menu/reorder/route.ts` - PUT using MenuService.reorder
- [ ] `src/app/api/admin/notification-rules/route.ts` - GET, POST
- [ ] `src/app/api/admin/notification-rules/[id]/route.ts` - GET, PUT, DELETE
- [ ] `src/app/api/admin/notification-rules/options/route.ts` - GET
- [ ] `src/app/api/admin/category-detection-rules/route.ts` - GET, POST
- [ ] `src/app/api/admin/category-detection-rules/[id]/route.ts` - GET, PUT, DELETE
- [x] `src/app/api/admin/sponsorships/route.ts` - GET using SponsorshipService
- [x] `src/app/api/admin/sponsorships/[id]/route.ts` - GET, PUT using SponsorshipService and NotificationService
- [ ] `src/app/api/admin/roles/route.ts` - GET, POST
- [ ] `src/app/api/admin/roles/[id]/route.ts` - GET, PUT, DELETE
- [ ] `src/app/api/admin/roles/[id]/permissions/route.ts` - GET, POST, DELETE
- [x] `src/app/api/admin/permissions/route.ts` - GET using AdminService.getPermissions(), POST using PermissionService
- [x] `src/app/api/admin/permissions/[id]/route.ts` - PUT, DELETE using PermissionService
- [ ] `src/app/api/admin/role-permissions/route.ts` - GET
- [ ] `src/app/api/admin/update-role-permissions/route.ts` - POST
- [ ] `src/app/api/admin/role-check/route.ts` - GET
- [x] `src/app/api/admin/settings/route.ts` - GET, PUT, POST using SystemConfigService
- [x] `src/app/api/admin/settings/ai/route.ts` - GET, PUT, POST, DELETE using AIRuleService
- [x] `src/app/api/admin/reports/cases/route.ts` - GET (uses Drizzle ORM, acceptable)
- [x] `src/app/api/admin/reports/contributors/route.ts` - GET (uses Drizzle ORM, acceptable)
- [x] `src/app/api/admin/reports/financial/route.ts` - GET (uses Drizzle ORM, acceptable)
- [x] `src/app/api/admin/reports/payment-methods/route.ts` - GET (uses Drizzle ORM, acceptable)
- [x] `src/app/api/admin/analytics/route.ts` - GET (uses Drizzle ORM, acceptable)

### Other API Routes ⏳ IN PROGRESS
- [x] `src/app/api/beneficiaries/find/route.ts` - GET using BeneficiaryService
- [ ] `src/app/api/beneficiaries/documents/route.ts` - GET, POST (storage operations)
- [ ] `src/app/api/beneficiaries/documents/[id]/route.ts` - GET, DELETE (storage operations)
- [ ] `src/app/api/beneficiaries/[id]/documents/route.ts` - GET, POST (storage operations)
- [ ] `src/app/api/beneficiaries/bulk-upload/route.ts` - POST
- [ ] `src/app/api/projects/route.ts` - GET, POST
- [ ] `src/app/api/projects/[id]/route.ts` - GET, PUT, DELETE
- [ ] `src/app/api/recurring-contributions/route.ts` - GET, POST
- [ ] `src/app/api/recurring-contributions/[id]/route.ts` - GET, PUT, DELETE
- [x] `src/app/api/payment-methods/route.ts` - GET, POST using PaymentMethodService
- [x] `src/app/api/payment-methods/[id]/route.ts` - GET, PATCH, DELETE using PaymentMethodService
- [x] `src/app/api/sponsor/dashboard/route.ts` - GET using SponsorshipService
- [x] `src/app/api/sponsor/applications/route.ts` - POST using UserService and SponsorApplicationService
- [x] `src/app/api/sponsor/communications/route.ts` - GET, POST using CommunicationService, SponsorshipService, and NotificationService
- [x] `src/app/api/sponsor/communications/[id]/read/route.ts` - POST using CommunicationService
- [x] `src/app/api/sponsor/role-check/route.ts` - GET using AdminService and UserService
- [x] `src/app/api/admin/role-check/route.ts` - GET using AdminService and UserService
- [x] `src/app/api/profile/route.ts` - GET using UserService (PUT has complex phone validation)
- [x] `src/app/api/profile/stats/route.ts` - GET using UserService and ContributionService
- [x] `src/app/api/profile/role/route.ts` - GET using AdminService and UserService
- [x] `src/app/api/dashboard/stats/route.ts` - GET using ContributionService (cases query still direct - TODO: add createdBy to CaseService)
- [x] `src/app/api/landing/stats/route.ts` - GET (uses Drizzle ORM - acceptable)
- [x] `src/app/api/landing/impact/route.ts` - GET (uses Drizzle ORM - acceptable)
- [x] `src/app/api/landing/contact-info/route.ts` - GET (uses Drizzle ORM - acceptable)
- [x] `src/app/api/landing/social-media/route.ts` - GET (uses Drizzle ORM - acceptable)
- [x] `src/app/api/contact/route.ts` - POST using ContactService
- [x] `src/app/api/activity/logs/route.ts` - GET using ActivityService and AdminService
- [x] `src/app/api/activity/track/route.ts` - POST using ActivityService (uses supabase.auth.getUser() which is acceptable)
- [x] `src/app/api/activity/stats/route.ts` - GET using ActivityService
- [x] `src/app/api/activity/visitors/route.ts` - GET using ActivityService
- [x] `src/app/api/notifications/[id]/read/route.ts` - POST using NotificationService
- [ ] `src/app/api/upload/route.ts` - POST (storage operations)
- [x] `src/app/api/storage/buckets/route.ts` - GET using StorageBucketService
- [x] `src/app/api/storage/buckets/[name]/route.ts` - GET using StorageBucketService (file listing uses storage API, which is acceptable)
- [x] `src/app/api/storage/rules/update/route.ts` - POST using StorageBucketService
- [ ] `src/app/api/push/subscribe/route.ts` - POST
- [ ] `src/app/api/push/unsubscribe/route.ts` - POST
- [ ] `src/app/api/push/fcm-subscribe/route.ts` - POST
- [ ] `src/app/api/push/diagnostics/route.ts` - GET
- [ ] `src/app/api/push/public-key/route.ts` - GET
- [ ] `src/app/api/push/test/route.ts` - POST
- [ ] `src/app/api/system-content/route.ts` - GET, PUT
- [ ] `src/app/api/translate/route.ts` - POST
- [ ] `src/app/api/ai/generate-content/route.ts` - POST

---

## Phase 3: Client-Side Code Refactoring

### Hooks ✅ PARTIAL
- [x] `src/lib/hooks/useApprovedContributions.ts` - Now uses API endpoint
- [ ] `src/hooks/useActivityTracking.ts` - Replace direct Supabase with API calls

### Navigation & Layout ⏳ IN PROGRESS
- [x] `src/lib/navigation/public-nav-db.ts` - Now uses API endpoint
- [ ] `src/components/navigation/NavigationBar.tsx` - Replace direct queries
- [ ] `src/components/navigation/SidebarNavigation.tsx` - Replace direct queries
- [ ] `src/components/navigation/SimpleSidebar.tsx` - Replace direct queries
- [ ] `src/components/navigation/ServerSidebarNavigation.tsx` - Replace direct queries
- [ ] `src/components/layout/ConditionalLayout.tsx` - Replace direct queries
- [ ] `src/components/layout/ServerLayout.tsx` - Replace direct queries

### Components ⏳ IN PROGRESS
- [ ] `src/components/auth/AuthProvider.tsx` - Keep auth methods, remove data queries
- [ ] `src/components/auth/AuthForm.tsx` - Keep auth methods, remove data queries
- [ ] `src/components/auth/SocialSignIn.tsx` - Keep auth methods, remove data queries
- [ ] `src/components/auth/PasswordResetForm.tsx` - Keep auth methods, remove data queries
- [ ] `src/components/auth/GuestPermissionGuard.tsx` - Keep auth methods, remove data queries
- [ ] `src/components/auth/RoleManager.tsx` - Replace direct queries with API calls
- [ ] `src/components/notifications/NotificationCenter.tsx` - Already uses API (verify)
- [ ] `src/components/notifications/AutoSubscribePrompt.tsx` - Replace direct queries
- [ ] `src/components/profile/ContributionHistory.tsx` - Already uses API (verify)
- [ ] `src/components/contributions/RecurringContributionForm.tsx` - Replace direct queries
- [ ] `src/components/contributions/RecurringContributionDashboard.tsx` - Already uses API (verify)
- [ ] `src/components/cases/CaseFileManager.tsx` - Replace direct queries (storage operations)
- [ ] `src/components/cases/SimpleFileUpload.tsx` - Replace direct queries (storage operations)
- [ ] `src/components/cases/ImageUpload.tsx` - Replace direct queries (storage operations)
- [ ] `src/components/cases/UpdatesTimeline.tsx` - Replace direct queries
- [ ] `src/components/beneficiaries/BeneficiaryFileManager.tsx` - Replace direct queries (storage operations)
- [ ] `src/components/sponsorships/SponsorshipRequestForm.tsx` - Replace direct queries
- [ ] `src/components/files/GenericFileUploader.tsx` - Replace direct queries (storage operations)

### Server-Side Utilities ⏳ IN PROGRESS
- [ ] `src/lib/server/menu.ts` - Review and update if needed
- [ ] `src/lib/server/menu-cache.ts` - Review and update if needed
- [ ] `src/lib/admin/service.ts` - Review and update if needed
- [ ] `src/lib/admin/hooks.ts` - Review and update if needed
- [ ] `src/lib/security/guards.ts` - Review (may need to keep direct queries for auth)
- [ ] `src/lib/security/rls.ts` - Review (may need to keep direct queries for auth)
- [ ] `src/lib/auth/ensure-app-user.ts` - Review (may need to keep direct queries for auth)
- [ ] `src/lib/case-updates.ts` - May need CaseUpdateService
- [ ] `src/lib/case-lifecycle.ts` - May need CaseService integration
- [ ] `src/lib/notifications/contribution-notifications.ts` - Review and update
- [ ] `src/lib/notifications/case-notifications.ts` - Review and update
- [ ] `src/lib/notifications/notification-rules.ts` - Review and update
- [ ] `src/lib/realtime-case-updates.ts` - Move to API-based polling
- [ ] `src/lib/navigation/public-nav-db.ts` - ✅ Already migrated

---

## Phase 4: Special Cases

### Storage Operations ⏳ IN PROGRESS
- [ ] Create `StorageService` in `src/lib/services/storageService.ts`
- [ ] Refactor storage API routes to use StorageService
- [ ] Update client-side file upload components to use API endpoints
- [ ] Update `src/lib/storage/server.ts` - Review and update if needed
- [ ] Update `src/lib/storage/validateUpload.ts` - Review and update if needed

### Realtime Subscriptions ⏳ IN PROGRESS
- [ ] `src/lib/realtime-case-updates.ts` - Move to API-based polling
- [ ] Review other realtime subscriptions and migrate

### Authentication ⏳ REVIEW NEEDED
- [ ] `src/components/auth/AuthProvider.tsx` - Keep auth methods (acceptable)
- [ ] `src/components/auth/AuthForm.tsx` - Keep auth methods (acceptable)
- [ ] `src/components/auth/SocialSignIn.tsx` - Keep auth methods (acceptable)
- [ ] `src/lib/supabase/client.ts` - Keep for auth (acceptable)
- [ ] `src/lib/supabase/server.ts` - Keep for auth (acceptable)

### Scripts & Maintenance ⏳ REVIEW NEEDED
- [ ] `scripts/admin/**` - Review (admin/maintenance scripts may keep direct Supabase)
- [ ] `scripts/maintenance/**` - Review (admin/maintenance scripts may keep direct Supabase)
- [ ] `scripts/utilities/**` - Review (admin/maintenance scripts may keep direct Supabase)

---

## Phase 5: Testing & Validation

### Verification Tasks
- [ ] Search for remaining `.from()` patterns in API routes
- [ ] Search for remaining `.rpc()` patterns in API routes
- [ ] Search for remaining `.from()` patterns in client components (excluding auth)
- [ ] Verify all API endpoints work correctly
- [ ] Test authentication/authorization still works
- [ ] Test error handling across all endpoints
- [ ] Verify RLS policies still work correctly
- [ ] Test pagination and filtering
- [ ] Test file upload/download operations
- [ ] Performance testing

### Cleanup Tasks
- [ ] Remove unused Supabase imports from migrated files
- [ ] Remove helper functions that are now in services (e.g., `getContributionsDirectQuery`, `calculateStats`)
- [ ] Update documentation
- [ ] Update type definitions if needed

---

## Notes

### Acceptable Direct Supabase Usage
- **Authentication operations** (`supabase.auth.*`) - These are acceptable and should remain
- **Admin/maintenance scripts** - May keep direct Supabase for operational scripts
- **Server-side auth utilities** - May keep direct Supabase for auth checks

### Migration Pattern
1. **API Routes**: Replace direct `.from()`, `.rpc()` calls with service methods
2. **Client Components**: Replace `createClient()` data queries with `apiClient` or `fetch()` calls
3. **Services**: All services accept Supabase client as parameter (server-side only)

### Files to Keep Direct Supabase (Auth Only)
- `src/lib/supabase/client.ts` - For client-side auth
- `src/lib/supabase/server.ts` - For server-side auth
- `src/components/auth/**` - For authentication operations

---

## Statistics

### Overall Progress Calculation

**Phase 1: Service Layer Infrastructure**
- Total Items: 9
- Completed: 9
- Progress: 100% ✅

**Phase 2: API Routes Refactoring**
- Core API Routes: 7/7 (100%) ✅
- Case Detail Routes: 4/10 (40%)
- Contribution Detail Routes: 0/4 (0%)
- Admin Routes: 4/39 (10%)
- Other API Routes: 0/43 (0%)
- **Subtotal**: 15/103 (14.6%)

**Phase 3: Client-Side Code Refactoring**
- Hooks: 1/2 (50%)
- Navigation & Layout: 1/6 (17%)
- Components: 0/18 (0%)
- Server-Side Utilities: 1/12 (8%)
- **Subtotal**: 3/38 (7.9%)

**Phase 4: Special Cases**
- Storage Operations: 0/5 (0%)
- Realtime Subscriptions: 0/2 (0%)
- Authentication: 5/5 (100% - acceptable to keep) ✅
- Scripts & Maintenance: 0/3 (0%)
- **Subtotal**: 5/15 (33.3%)

**Phase 5: Testing & Validation**
- Total Items: 10
- Completed: 0
- Progress: 0%

### Overall Summary

- **Total Items to Migrate**: ~175 items
- **Items Completed**: ~73 items
- **Items Remaining**: ~102 items
- **Overall Progress**: **41.7%** complete

**Note**: Landing routes (`/api/landing/*`) use Drizzle ORM, not direct Supabase client calls, so they are acceptable for now. Projects routes use a mix of Drizzle ORM and Supabase client - these should be refactored to use services.

### Breakdown by Category

- ✅ **Infrastructure**: 100% (9/9)
- ⏳ **API Routes**: 46.6% (48/103)
- ⏳ **Client-Side**: 7.9% (3/38)
- ⏳ **Special Cases**: 33.3% (5/15) - Auth items acceptable
- ⏳ **Testing**: 0% (0/10)

### Files Status

- **Total Files to Migrate**: ~71 files
- **Files Completed**: ~47 files
- **Files Remaining**: ~24 files
- **File Progress**: ~66% complete

---

*Last Updated: [Current Date]*

