import type { Config } from "tailwindcss";

/**
 * Tailwind is the utility layer over the design system defined in globals.css.
 * It deliberately does NOT redefine surfaces, shadows or motion — those live as
 * CSS custom properties so a hover written in CSS and an entrance written in
 * Framer share one set of numbers. What lives here is only what Tailwind needs
 * to generate: the neutral ramp, semantic accents, and easing/duration aliases
 * that map onto the same tokens.
 *
 * The theme is light. `next-themes` is pinned to light with system detection
 * off, so there are no `dark:` variants to generate.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic accents. Everything structural (surfaces, hairlines, ink)
        // comes from the CSS custom properties, not from here.
        success: { 50: "#F0FDF4", 500: "#10B981", 600: "#059669", 700: "#047857" },
        warning: { 50: "#FFFBEB", 500: "#F59E0B", 600: "#D97706", 700: "#B45309" },
        danger: { 50: "#FFF1F2", 500: "#F43F5E", 600: "#E11D48", 700: "#BE123C" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // The four-step elevation ladder, so `shadow-e2` and `box-shadow: var(--e2)`
        // are literally the same value.
        e1: "var(--e1)",
        e2: "var(--e2)",
        e3: "var(--e3)",
        e4: "var(--e4)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        drawer: "var(--ease-drawer)",
        hover: "var(--ease-hover)",
      },
      transitionDuration: {
        press: "120ms",
        fast: "160ms",
        base: "220ms",
        slow: "300ms",
        sheet: "380ms",
      },
    },
  },
  plugins: [],
};

export default config;
