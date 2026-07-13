/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        console: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#21262d',
          muted: '#30363d',
          text: '#e6edf3',
          dim: '#8b949e',
          accent: '#58a6ff',
          warn: '#d29922',
          danger: '#f85149',
          success: '#3fb950',
          heat: '#ff7b72',
          cool: '#79c0ff',
        },
      },
    },
  },
  plugins: [],
};
