import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./src/index.html"],
  theme: {
    extend: {
      fontSize: {
        xs: "0.563rem",
        s: "0.688rem",
        m: "0.8125rem",
        l: "1rem",
        xl: "1.125rem",
        xxl: "1.3rem",
        xxxl: "1.6rem",
        "4xl": "1.7rem",
        "5xl": "2rem",
      },
      borderRadius: {
        DEFAULT: "4px",
      },
      zIndex: {
        // Layer 1-5: Grid-level stacking for calendar events
        "layer-1": "1", // Base grid events
        "layer-2": "2", // Now line, time indicators
        "layer-3": "3", // Event text, icons
        "layer-4": "4", // Resize handles, scalers
        "layer-5": "5", // Sticky headers, edge indicators

        // Layer 10: Floating UI elements
        "layer-10": "50", // Dropdowns, popovers, datepickers

        // Layer 20: Overlay backgrounds and content
        "layer-20": "100", // Modal/overlay backdrops
        "layer-21": "101", // Modal/overlay content (above backdrop)

        // Layer 30: Top-level interactive elements
        "layer-30": "200", // Tooltips, context menus

        // Max: Absolute top priority
        max: "9999", // Keyboard shortcuts overlay, emergency top
      },
    },
  },
  plugins: [],
};

export default config;
