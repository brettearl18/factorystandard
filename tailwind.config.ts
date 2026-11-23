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
        // Work Order industrial palette
        sidebar: {
          DEFAULT: "#252B2C",
          light: "#2F3637",
        },
        accent: {
          DEFAULT: "#F2C230",
          light: "#FFD34A",
          foreground: "#202728",
        },
        bg: {
          DEFAULT: "#D7DBD8",
        },
        surface: {
          DEFAULT: "#F3F4F0",
          alt: "#E4E8E4",
        },
        topbar: {
          DEFAULT: "#EDF0EC",
        },
        border: {
          DEFAULT: "#AAB1AE",
          soft: "#CED2CF",
        },
        text: {
          DEFAULT: "#202728",
          muted: "#53605D",
          onDark: "#F3F4F0",
        },
        teal: {
          DEFAULT: "#527D75",
        },
        blue: {
          DEFAULT: "#3B82F6",
        },
        status: {
          success: "#28734B",
          warning: "#F2C230",
          error: "#B84B38",
          neutral: "#677471",
        },
        // Legacy aliases — map to Work Order palette
        paper: "#D7DBD8",
        card: "#F3F4F0",
        shell: "#E4E8E4",
        line: "#CED2CF",
        textPrimary: "#202728",
        textMuted: "#53605D",
        primary: "#F2C230",
        primaryDark: "#FFD34A",
        accentBlue: "#3B82F6",
        accentGreen: "#28734B",
      },
      boxShadow: {
        panel: "none",
        soft: "none",
        modal: "0 8px 24px rgba(32, 39, 40, 0.18)",
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "Oswald",
          "Arial Narrow",
          "sans-serif",
        ],
        body: [
          "var(--font-body)",
          "Source Sans 3",
          "Source Sans Pro",
          "Helvetica",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // Industrial: near-square by default (overrides soft SaaS radii)
        sm: "1px",
        DEFAULT: "2px",
        md: "2px",
        lg: "2px",
        xl: "2px",
        "2xl": "2px",
        "3xl": "4px",
      },
    },
  },
  plugins: [],
};
export default config;
