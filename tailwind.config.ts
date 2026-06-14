import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        archive: {
          bg950: "var(--bg-950)",
          bg900: "var(--bg-900)",
          bg850: "var(--bg-850)",
          bg800: "var(--bg-800)",
          gold500: "var(--gold-500)",
          gold300: "var(--gold-300)",
          azure500: "var(--azure-500)",
          danger500: "var(--danger-500)",
          success500: "var(--success-500)",
          warning500: "var(--warning-500)",
          text100: "var(--text-100)",
          text300: "var(--text-300)",
          text500: "var(--text-500)",
        },
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
      },
      borderRadius: {
        panel: "var(--radius-panel)",
        card: "var(--radius-card)",
        chip: "var(--radius-chip)",
      },
    },
  },
  plugins: [forms],
};

export default config;
