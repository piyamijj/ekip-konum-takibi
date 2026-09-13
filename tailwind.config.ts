import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0f14",
        surface: "#111827",
        surfaceAlt: "#1a2332",
        border: "#233042",
        accent: "#22d3ee",
        accentAlt: "#38bdf8",
        success: "#34d399",
        danger: "#f87171",
        warning: "#fbbf24",
        muted: "#64748b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;