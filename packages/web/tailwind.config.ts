import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./src/index.html"],
  theme: {
    extend: {
      colors: {
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
    },
  },
  plugins: [],
};

export default config;
