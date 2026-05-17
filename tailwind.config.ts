import type { Config } from "tailwindcss";

// Tailwind v4 uses CSS-based configuration (@theme in globals.css)
// This file is kept minimal for any JS-based overrides only.
// The actual theme configuration lives in src/app/globals.css
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
