/* eslint-env node */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Playful Citrus Pop Design System - Mobile colors
        border: '#E8DFD5',
        input: '#E8DFD5',
        ring: '#F97316',
        background: '#FAF2ED',
        foreground: '#11333B',
        primary: {
          DEFAULT: '#F97316',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#D6D6F9',
          foreground: '#625F88',
        },
        accent: {
          DEFAULT: '#FACC15',
          foreground: '#11333B',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#11333B',
        },
        // Semantic colors
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#FACC15',
          foreground: '#11333B',
        },
        error: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#3F84F8',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
    },
  },
  plugins: [],
}
