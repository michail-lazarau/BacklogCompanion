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
      },
      fontFamily: {
        rubik: ['Rubik'],
      },
    },
  },
  plugins: [],
};
