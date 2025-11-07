import type { Config } from "tailwindcss";
import { c } from "@web/common/styles/colors.js";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./src/index.html"],
  theme: {
    extend: {
      colors: {
        // Semantic colors
        "bg-primary": c.darkBlue400,
        "bg-secondary": c.darkBlue200,
        "border-primary": c.gray800,
        "border-primary-dark": c.gray900,
        "border-secondary": c.gray100,
        "fg-primary": c.gray100,
        "fg-primary-dark": c.gray200,
        "gradient-accent-light-start": c.blue100,
        "gradient-accent-light-end": c.blueGray100,
        "grid-line-primary": c.gray800,
        "menu-bg": c.white200,
        "panel-bg": c.gray600,
        "panel-scrollbar": c.gray500,
        "panel-scrollbar-active": c.gray400,
        "panel-shadow": c.gray400,
        "panel-text": c.white200,
        "shadow-default": c.black,
        "status-success": c.green,
        "status-error": c.red,
        "status-warning": c.orange,
        "status-info": c.blue100,
        "tag-one": c.blue100,
        "tag-two": c.green,
        "tag-three": c.purple,
        "text-accent": c.blue100,
        "text-light": c.gray100,
        "text-lighter": c.white100,
        "text-light-inactive": c.gray200,
        "text-dark": c.darkBlue400,
        "text-dark-placeholder": c.gray300,
        // Raw colors
        blue: {
          300: "hsl(195 78 56)",
          200: "hsl(196 60 59)",
          100: "hsl(202 100 67)",
        },
        blueGray: {
          400: "hsl(207 14 57)",
          300: "hsl(205 33 61)",
          200: "hsl(205 36 62)",
          100: "hsl(196 45 78)",
        },
        darkBlue: {
          500: "hsl(220 29 6)",
          400: "hsl(222 28 7)",
          300: "hsl(218 27 8)",
          200: "hsl(218 24 9)",
          100: "hsl(223 27 10)",
        },
        gray: {
          900: "hsl(0 0 0 / 50.2%)",
          800: "hsl(219 18 34 / 20%)",
          700: "hsl(219 18 34 / 25.1%)",
          600: "hsl(219 8 46 / 20%)",
          500: "hsl(219 8 46 / 20%)",
          400: "hsl(221 9 37)",
          300: "hsl(219 8 46 / 90.2%)",
          200: "hsl(208 13 71 / 54.9%)",
          100: "hsl(47 7 73)",
        },
        green: "hsl(105 61 62)",
        orange: "hsl(25 100 63)",
        purple: "hsl(270 100 83)",
        red: "hsl(0 63 60)",
        teal: "hsl(163 44 67)",
        white: {
          200: "hsl(0 0 98)",
          100: "hsl(0 0 100)",
        },
      },
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
    },
  },
  plugins: [],
};

export default config;
