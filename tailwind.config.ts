import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "dark"],
  // Kept for editor tooling; v4 compiles from CSS entry.
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};

export default config;
