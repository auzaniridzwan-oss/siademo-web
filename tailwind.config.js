import flowbite from 'flowbite/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,html}',
    './node_modules/flowbite/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        sia: {
          navy: '#002663',
          gold: '#DDB067',
          tan: '#F4F1EA',
          muted: '#F4F4F4',
          text: '#333333',
          'text-muted': '#666666',
          blue: '#0071BC',
          border: '#E0E0E0',
        },
      },
      fontFamily: {
        sans: ['Proxima Nova', 'Arial', 'Helvetica', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [flowbite],
};
