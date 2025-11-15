# CRUD Edit Page Components

Reusable components for creating consistent edit pages across the application.

## Components

### EditPageHeader

A standardized header component for edit pages with back navigation, title, description, and optional actions.

**Props:**
- `backUrl` (string, required): URL to navigate to when back button is clicked
- `icon` (LucideIcon, required): Icon component to display next to the title
- `title` (string, required): Main page title
- `description` (string, optional): Subtitle/description text
- `itemName` (string, optional): Name of the item being edited (e.g., "Editing: John Doe")
- `actions` (ReactNode, optional): Additional action buttons to display in the header
- `backLabel` (string, optional): Custom back button label (default: "Back")
- `showBackButton` (boolean, optional): Whether to show the back button (default: true)

**Example:**
```tsx
import { EditPageHeader } from '@/components/crud'
import { User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

<EditPageHeader
  backUrl={`/${locale}/beneficiaries/${id}`}
  icon={User}
  title="Edit Beneficiary"
  description="Update beneficiary information and documents"
  itemName={beneficiary.name}
  actions={
    <Button variant="destructive" onClick={handleDelete}>
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  }
/>
```

### EditPageFooter

A standardized footer component for edit pages with primary and secondary actions.

**Props:**
- `primaryAction` (object, required): Primary action button configuration
  - `label` (string): Button label
  - `onClick` (function): Click handler
  - `disabled` (boolean, optional): Whether button is disabled
  - `loading` (boolean, optional): Whether action is in progress
  - `icon` (ReactNode, optional): Icon to display in button
- `secondaryActions` (array, optional): Array of secondary action configurations
  - `label` (string): Button label
  - `onClick` (function): Click handler
  - `variant` (string, optional): Button variant (default: "outline")
  - `disabled` (boolean, optional): Whether button is disabled
  - `loading` (boolean, optional): Whether action is in progress
  - `icon` (ReactNode, optional): Icon to display in button
- `children` (ReactNode, optional): Custom footer content (overrides default layout)
- `show` (boolean, optional): Whether to show the footer (default: true)
- `className` (string, optional): Additional CSS classes

**Example:**
```tsx
import { EditPageFooter } from '@/components/crud'
import { Save, Trash2 } from 'lucide-react'

<EditPageFooter
  primaryAction={{
    label: "Update Beneficiary",
    onClick: handleSubmit,
    disabled: isSubmitting,
    loading: isSubmitting,
    icon: <Save className="h-4 w-4 mr-2" />
  }}
  secondaryActions={[
    {
      label: "Cancel",
      onClick: () => router.push(backUrl),
      variant: "outline"
    },
    {
      label: "Delete",
      onClick: () => setIsDeleteDialogOpen(true),
      variant: "destructive",
      icon: <Trash2 className="h-4 w-4 mr-2" />
    }
  ]}
/>
```

## Complete Example

```tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { EditPageHeader, EditPageFooter } from '@/components/crud'
import { User, Save, Trash2 } from 'lucide-react'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'

export default function EditItemPage() {
  const router = useRouter()
  const params = useParams()
  const { containerVariant } = useLayout()
  const locale = params.locale as string
  const itemId = params.id as string
  
  const [item, setItem] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleSubmit = async () => {
    // Submit logic
  }

  const handleDelete = async () => {
    // Delete logic
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <EditPageHeader
          backUrl={`/${locale}/items/${itemId}`}
          icon={User}
          title="Edit Item"
          description="Update item information"
          itemName={item?.name}
          actions={
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          }
        />

        {/* Form Content */}
        <div className="w-full">
          {/* Your form here */}
        </div>

        {/* Footer */}
        <EditPageFooter
          primaryAction={{
            label: "Update Item",
            onClick: handleSubmit,
            disabled: isSubmitting,
            loading: isSubmitting,
            icon: <Save className="h-4 w-4 mr-2" />
          }}
          secondaryActions={[
            {
              label: "Cancel",
              onClick: () => router.push(`/${locale}/items/${itemId}`),
              variant: "outline"
            },
            {
              label: "Delete",
              onClick: () => setIsDeleteDialogOpen(true),
              variant: "destructive",
              icon: <Trash2 className="h-4 w-4 mr-2" />
            }
          ]}
        />
      </Container>
    </div>
  )
}
```

## Benefits

1. **Consistency**: All edit pages have the same look and feel
2. **Maintainability**: Update styling/behavior in one place
3. **Accessibility**: Built-in responsive design and proper button states
4. **Flexibility**: Supports custom actions and content
5. **Type Safety**: Full TypeScript support with proper types

## Migration Guide

To migrate an existing edit page:

1. Import the components:
   ```tsx
   import { EditPageHeader, EditPageFooter } from '@/components/crud'
   ```

2. Replace the header section with `<EditPageHeader />`

3. Replace the footer section with `<EditPageFooter />`

4. Update form components to support external footer control if needed

