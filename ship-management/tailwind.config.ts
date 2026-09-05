import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        harbor: {
          950: "#4A0E12",
          900: "#6E141B",
          800: "#8B1B22",
          700: "#A3232A",
          600: "#BC2B31",
        },
        brass: {
          500: "#1F7A45",
          400: "#2F9457",
          300: "#6BBF8B",
        },
        paper: "#FAFAF8",
        ink: "#1A1A18",
        signal: {
          ok: "#1F7A45",
          warn: "#C97A2B",
          bad: "#A6242C",
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
