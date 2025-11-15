# Meen Ma3ana Theme System

A comprehensive theme system using the brand colors from the Meen Ma3ana logo.

## Brand Colors

- **Meen (Olive Green)**: `#6B8E7E` - Primary brand color
- **Ma3ana (Vibrant Red)**: `#E74C3C` - Secondary brand color

## Usage

### 1. Import Theme

```typescript
import { theme, brandColors, getBrandColor, getGradient } from '@/lib/theme'
```

### 2. Using in TypeScript/React

```typescript
// Get brand colors
const meenColor = brandColors.meen[500] // #6B8E7E
const ma3anaColor = brandColors.ma3ana[500] // #E74C3C

// Get gradients
const primaryGradient = theme.gradients.primary
const brandGradient = theme.gradients.brand

// Use in inline styles
<div style={{ background: getGradient('primary') }}>
  Content
</div>
```

### 3. Using CSS Variables

```css
.my-element {
  background-color: var(--meen-500);
  color: var(--ma3ana-500);
  border: 1px solid var(--meen-300);
}
```

### 4. Using Tailwind Classes

```tsx
// Direct color classes
<div className="bg-[#6B8E7E] text-[#E74C3C]">
  Content
</div>

// Or use utility classes from globals.css
<div className="bg-meen text-ma3ana">
  Content
</div>
```

### 5. Using Theme Gradients

```tsx
// Inline style
<div style={{ background: theme.gradients.brand }}>
  Content
</div>

// Or CSS class
<div className="bg-gradient-brand">
  Content
</div>
```

## Available Utilities

### Color Shades

Both `meen` and `ma3ana` have shades from 50 (lightest) to 950 (darkest):

- `50`, `100`, `200`, `300`, `400` - Light shades
- `500` - Base color
- `600`, `700`, `800`, `900`, `950` - Dark shades

### Gradients

- `primary` - Meen gradient (meen-500 to meen-600)
- `secondary` - Ma3ana gradient (ma3ana-500 to ma3ana-600)
- `brand` - Combined gradient (meen-500 to ma3ana-500)
- `brandReverse` - Reverse brand gradient (ma3ana-500 to meen-500)
- `primarySubtle` - Subtle meen gradient for backgrounds
- `secondarySubtle` - Subtle ma3ana gradient for backgrounds
- `brandSubtle` - Subtle combined gradient for backgrounds

### Shadows

- `primary` - Shadow with meen color
- `secondary` - Shadow with ma3ana color
- `brand` - Shadow with both brand colors

## Examples

### Button with Brand Colors

```tsx
import { theme } from '@/lib/theme'

<button 
  className="px-4 py-2 text-white rounded-lg"
  style={{ 
    background: theme.gradients.primary,
    boxShadow: theme.shadows.primary
  }}
>
  Click Me
</button>
```

### Card with Brand Theme

```tsx
<div className="bg-gradient-brand-subtle border-meen p-6 rounded-lg">
  <h2 className="text-meen-dark font-bold">Title</h2>
  <p className="text-gray-700">Content</p>
</div>
```

### Badge with Ma3ana Color

```tsx
<span className="bg-ma3ana-light text-ma3ana-dark px-2 py-1 rounded">
  Badge
</span>
```

## Integration with shadcn/ui

The theme is integrated with shadcn/ui components through CSS variables:

- `--primary` uses Meen color
- `--secondary` uses Ma3ana color
- `--destructive` uses Ma3ana color
- `--accent` uses Meen color

This means all shadcn/ui components will automatically use the brand colors.

## Dark Mode

The theme includes dark mode variants. All color shades are inverted in dark mode for better contrast and readability.

