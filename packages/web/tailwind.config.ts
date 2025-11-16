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
    },
  },
  plugins: [],
};

export default config;
