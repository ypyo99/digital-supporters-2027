/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
      },
      colors: {
        orange: {
          350: '#fca55d',
        },
        blue: {
          250: '#a5c9ff',
        },
        // 차분한 블루그레이 계열로 회색 톤을 통일
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      // 번지는 그림자 대신 얇고 부드러운 레이어드 그림자
      boxShadow: {
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        md: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 10px -2px rgb(15 23 42 / 0.07)',
        lg: '0 2px 4px -1px rgb(15 23 42 / 0.05), 0 10px 24px -6px rgb(15 23 42 / 0.10)',
        xl: '0 4px 8px -2px rgb(15 23 42 / 0.05), 0 20px 40px -12px rgb(15 23 42 / 0.14)',
        '2xl': '0 8px 16px -4px rgb(15 23 42 / 0.06), 0 32px 64px -16px rgb(15 23 42 / 0.20)',
      },
    },
  },
  plugins: [],
}
