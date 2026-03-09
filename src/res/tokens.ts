/**
 * Centralized design tokens for BacklogCompanion.
 * These values are the TypeScript mirror of tailwind.config.js.
 * Use NativeWind `className=` for all styling where possible.
 * Import from this file ONLY when a native style prop is needed (SVG style, dynamic values).
 *
 * @see tailwind.config.js for the Tailwind configuration
 * @see src/res/theme.ts — deprecated prototype file, do not import in new code
 */
export const tokens = {
  colors: {
    surface900: '#171A21',
    surface800: '#2A475E',
    primary: '#66C0F4',
    success: '#A3E635',
    destructive: '#F87171',
    text100: '#FFFFFF',
    text300: '#C7D5E0',
    placeholderText: '#8F98A0',
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    sm2: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  fontSize: {
    h1: 32,
    h2: 24,
    body: 16,
    caption: 12,
  },
  fontFamily: {
    regular: 'Rubik-Regular',
    medium: 'Rubik-Medium',
    bold: 'Rubik-Bold',
  },
} as const;
