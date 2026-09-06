import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        harbor: {
          950: "#050D1A",
          900: "#0B1F3A",
          800: "#14294B",
          700: "#1D3A63",
          600: "#2E6DA4",
        },
        brass: {
          500: "#C9980A",
          400: "#F5C400",
          300: "#FFE066",
        },
        paper: "#FAFAF8",
        ink: "#1A1A18",
        signal: {
          ok: "#1F7A45",
          warn: "#C9980A",
          bad: "#B3272C",
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
