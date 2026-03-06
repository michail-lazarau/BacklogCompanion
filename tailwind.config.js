module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'surface-900': '#171A21',
        'surface-800': '#2A475E',
        primary: '#66C0F4',
        success: '#A3E635',
        destructive: '#F87171',
        'text-100': '#FFFFFF',
        'text-300': '#C7D5E0',
        placeholder: '#8F98A0',
      },
      fontFamily: {
        // NativeWind maps font-rubik → fontFamily: 'Rubik'. Weight variants (Rubik-Medium,
        // Rubik-Bold) are applied via style={{ fontFamily: tokens.fontFamily.medium|bold }}
        // because NativeWind fontWeight classes don't map to distinct RN font files.
        rubik: ['Rubik'],
      },
      borderRadius: {
        card: 16,
        input: 8,
      },
      fontSize: {
        // NativeWind requires numeric px values for RN compatibility
        caption: [12, { lineHeight: 16 }],
      },
    },
  },
  plugins: [],
};
