# Layout System

A flexible, responsive layout system with support for full-width and boxed containers.

## Components

### Container

A flexible container component with multiple width variants.

```tsx
import Container from '@/components/layout/Container'

// Boxed layout (default, max-w-[1600px])
<Container variant="boxed">
  <YourContent />
</Container>

// Full width
<Container variant="full">
  <YourContent />
</Container>
```

### LayoutProvider

Provides global layout state management with optional persistence.

```tsx
import { LayoutProvider } from '@/components/layout/LayoutProvider'

<LayoutProvider 
  defaultVariant="boxed" 
  persist={true}
  storageKey="my-layout-preference"
>
  <YourApp />
</LayoutProvider>
```

### useLayout Hook

Access and modify layout preferences.

```tsx
import { useLayout } from '@/components/layout/LayoutProvider'

function MyComponent() {
  const { containerVariant, setContainerVariant } = useLayout()
  
  return (
    <button onClick={() => setContainerVariant('full')}>
      Switch to Full Width
    </button>
  )
}
```

### LayoutToggle

A ready-to-use toggle component for switching between layout variants.

```tsx
import LayoutToggle from '@/components/layout/LayoutToggle'

<LayoutToggle />
```

## PageLayout Integration

The `PageLayout` component automatically uses the global layout preference:

```tsx
// Uses global layout preference
<PageLayout>
  <YourContent />
</PageLayout>

// Override with specific variant
<PageLayout containerVariant="full">
  <YourContent />
</PageLayout>

// Disable global layout preference
<PageLayout useGlobalLayout={false} containerVariant="boxed">
  <YourContent />
</PageLayout>
```

## Variants

- **full**: Full viewport width, no constraints
- **boxed**: Max width 1600px, centered with padding (wide layout)

## Responsive Behavior

All containers include responsive padding:
- Mobile: `px-4` (16px)
- Tablet: `sm:px-6` (24px)
- Desktop: `lg:px-8` (32px)

## Examples

### Full-width Dashboard
```tsx
<PageLayout containerVariant="full">
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    {/* Dashboard widgets */}
  </div>
</PageLayout>
```

### Boxed Content Page
```tsx
<PageLayout containerVariant="boxed">
  <article>
    <h1>Article Title</h1>
    <p>Article content...</p>
  </article>
</PageLayout>
```

### Custom Container Usage
```tsx
function CustomPage() {
  return (
    <div>
      {/* Full-width hero section */}
      <Container variant="full" className="bg-blue-500">
        <h1>Hero Section</h1>
      </Container>
      
      {/* Boxed content section */}
      <Container variant="boxed" className="py-12">
        <p>Content here...</p>
      </Container>
    </div>
  )
}
```

