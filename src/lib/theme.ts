/**
 * Meen Ma3ana Brand Theme
 * 
 * Color palette inspired by the logo:
 * - Olive Green (#6B8E7E) - "Meen" color
 * - Vibrant Red (#E74C3C) - "Ma3ana" color
 */

export const brandColors = {
  // Primary brand colors
  meen: {
    // Olive Green - "Meen" color
    DEFAULT: '#6B8E7E',
    50: '#F0F5F3',
    100: '#E1EBE7',
    200: '#C3D7CF',
    300: '#A5C3B7',
    400: '#87AF9F',
    500: '#6B8E7E', // Base color
    600: '#5A7A6B',
    700: '#496658',
    800: '#385245',
    900: '#273E32',
    950: '#1A2A21',
  },
  ma3ana: {
    // Vibrant Red - "Ma3ana" color
    DEFAULT: '#E74C3C',
    50: '#FDF2F1',
    100: '#FBE5E3',
    200: '#F7CBC7',
    300: '#F3B1AB',
    400: '#EF978F',
    500: '#E74C3C', // Base color
    600: '#C0392B',
    700: '#992D22',
    800: '#722119',
    900: '#4B1510',
    950: '#2E0D0A',
  },
} as const

/**
 * Theme configuration for the application
 */
export const theme = {
  colors: {
    // Brand colors
    primary: brandColors.meen,
    secondary: brandColors.ma3ana,
    
    // Semantic colors using brand palette
    success: {
      light: brandColors.meen[100],
      DEFAULT: brandColors.meen[500],
      dark: brandColors.meen[700],
      text: brandColors.meen[900],
    },
    warning: {
      light: '#FEF3C7',
      DEFAULT: '#F59E0B',
      dark: '#D97706',
      text: '#92400E',
    },
    error: {
      light: brandColors.ma3ana[100],
      DEFAULT: brandColors.ma3ana[500],
      dark: brandColors.ma3ana[700],
      text: brandColors.ma3ana[900],
    },
    info: {
      light: '#DBEAFE',
      DEFAULT: '#3B82F6',
      dark: '#1E40AF',
      text: '#1E3A8A',
    },
  },
  
  // Gradients
  gradients: {
    primary: `linear-gradient(135deg, ${brandColors.meen[500]} 0%, ${brandColors.meen[600]} 100%)`,
    secondary: `linear-gradient(135deg, ${brandColors.ma3ana[500]} 0%, ${brandColors.ma3ana[600]} 100%)`,
    brand: `linear-gradient(135deg, ${brandColors.meen[500]} 0%, ${brandColors.ma3ana[500]} 100%)`,
    brandReverse: `linear-gradient(135deg, ${brandColors.ma3ana[500]} 0%, ${brandColors.meen[500]} 100%)`,
    // Subtle gradients for backgrounds
    primarySubtle: `linear-gradient(135deg, ${brandColors.meen[50]} 0%, ${brandColors.meen[100]} 100%)`,
    secondarySubtle: `linear-gradient(135deg, ${brandColors.ma3ana[50]} 0%, ${brandColors.ma3ana[100]} 100%)`,
    brandSubtle: `linear-gradient(135deg, ${brandColors.meen[50]} 0%, ${brandColors.ma3ana[50]} 100%)`,
    // Progress bar gradient: green -> teal -> blue -> purple
    progress: `linear-gradient(135deg, #8B5CF6 0%, #3B82F6 33%, #14B8A6 66%, #10B981 100%)`,
  },
  
  // Shadows with brand colors
  shadows: {
    primary: `0 10px 15px -3px rgba(107, 142, 126, 0.3), 0 4px 6px -2px rgba(107, 142, 126, 0.2)`,
    secondary: `0 10px 15px -3px rgba(231, 76, 60, 0.3), 0 4px 6px -2px rgba(231, 76, 60, 0.2)`,
    brand: `0 10px 15px -3px rgba(107, 142, 126, 0.2), 0 4px 6px -2px rgba(231, 76, 60, 0.2)`,
  },
} as const

/**
 * Get color value by name and shade
 */
export function getBrandColor(color: 'meen' | 'ma3ana', shade: keyof typeof brandColors.meen = 'DEFAULT'): string {
  return brandColors[color][shade]
}

/**
 * Get gradient by name
 */
export function getGradient(name: keyof typeof theme.gradients): string {
  return theme.gradients[name]
}

/**
 * Get shadow by name
 */
export function getShadow(name: keyof typeof theme.shadows): string {
  return theme.shadows[name]
}

/**
 * Tailwind CSS color classes mapping
 * Use these in className strings
 */
export const tailwindColors = {
  meen: {
    bg: {
      DEFAULT: 'bg-[#6B8E7E]',
      50: 'bg-[#F0F5F3]',
      100: 'bg-[#E1EBE7]',
      200: 'bg-[#C3D7CF]',
      300: 'bg-[#A5C3B7]',
      400: 'bg-[#87AF9F]',
      500: 'bg-[#6B8E7E]',
      600: 'bg-[#5A7A6B]',
      700: 'bg-[#496658]',
      800: 'bg-[#385245]',
      900: 'bg-[#273E32]',
    },
    text: {
      DEFAULT: 'text-[#6B8E7E]',
      50: 'text-[#F0F5F3]',
      100: 'text-[#E1EBE7]',
      200: 'text-[#C3D7CF]',
      300: 'text-[#A5C3B7]',
      400: 'text-[#87AF9F]',
      500: 'text-[#6B8E7E]',
      600: 'text-[#5A7A6B]',
      700: 'text-[#496658]',
      800: 'text-[#385245]',
      900: 'text-[#273E32]',
    },
    border: {
      DEFAULT: 'border-[#6B8E7E]',
      200: 'border-[#C3D7CF]',
      300: 'border-[#A5C3B7]',
      400: 'border-[#87AF9F]',
      500: 'border-[#6B8E7E]',
      600: 'border-[#5A7A6B]',
    },
  },
  ma3ana: {
    bg: {
      DEFAULT: 'bg-[#E74C3C]',
      50: 'bg-[#FDF2F1]',
      100: 'bg-[#FBE5E3]',
      200: 'bg-[#F7CBC7]',
      300: 'bg-[#F3B1AB]',
      400: 'bg-[#EF978F]',
      500: 'bg-[#E74C3C]',
      600: 'bg-[#C0392B]',
      700: 'bg-[#992D22]',
      800: 'bg-[#722119]',
      900: 'bg-[#4B1510]',
    },
    text: {
      DEFAULT: 'text-[#E74C3C]',
      50: 'text-[#FDF2F1]',
      100: 'text-[#FBE5E3]',
      200: 'text-[#F7CBC7]',
      300: 'text-[#F3B1AB]',
      400: 'text-[#EF978F]',
      500: 'text-[#E74C3C]',
      600: 'text-[#C0392B]',
      700: 'text-[#992D22]',
      800: 'text-[#722119]',
      900: 'text-[#4B1510]',
    },
    border: {
      DEFAULT: 'border-[#E74C3C]',
      200: 'border-[#F7CBC7]',
      300: 'border-[#F3B1AB]',
      400: 'border-[#EF978F]',
      500: 'border-[#E74C3C]',
      600: 'border-[#C0392B]',
    },
  },
} as const

export default theme

