import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        harbor: {
          950: "#0B1F2A",
          900: "#122E3D",
          800: "#1B4152",
          700: "#265669",
          600: "#336E84",
        },
        brass: {
          500: "#B08D57",
          400: "#C4A472",
          300: "#D8C094",
        },
        paper: "#F3F1EA",
        ink: "#1A1A18",
        signal: {
          ok: "#3F7A5C",
          warn: "#B08D57",
          bad: "#A6432E",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
