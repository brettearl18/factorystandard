import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f7f8fb",
        card: "#ffffff",
        shell: "#f1f3f8",
        slate: "#e3e6ef",
        textPrimary: "#1f2430",
        textMuted: "#6b7280",
        primary: "#ff6b2c",
        primaryDark: "#e05215",
        accentBlue: "#267dff",
        accentGreen: "#22c55e",
      },
      boxShadow: {
        panel: "0 20px 45px rgba(15,23,42,0.08)",
        soft: "0 2px 6px rgba(15,23,42,0.06)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Orbitron", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
      },
      borderRadius: {
        blade: "1.5rem 0.5rem 1.5rem 0.5rem",
      },
    },
  },
  plugins: [],
};
export default config;

