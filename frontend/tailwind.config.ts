import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f6",
          100: "#d5eeea",
          500: "#168a7a",
          700: "#0f5f56"
        }
      }
    }
  },
  plugins: []
};

export default config;

