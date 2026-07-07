import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — neutral graphite (zero fioletu)
        brand: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#111827",
          700: "#1f2937",
          800: "#111827",
          900: "#0b0f19",
          950: "#030712",
        },
        // Neutral
        surface: {
          0: "#ffffff",
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        // Semantic
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
        },
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C0",
          200: "#FDE47A",
          300: "#E6BC43",
          400: "#D4A017",
          500: "#B8890E",
          600: "#9A720C",
          700: "#7C5B0A",
        },
        // Silver — new brand accent
        silver: {
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",   // silver light
          400: "#94A3B8",   // silver primary
          500: "#64748B",   // silver dark
          600: "#475569",   // silver text
          700: "#334155",
        },
        danger: {
          50: "#fff1f2",
          500: "#f43f5e",
          600: "#e11d48",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cabinet)", "var(--font-inter)", "system-ui"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "soft-sm": "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        soft: "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        "soft-md": "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
        "soft-lg": "0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.04)",
        "soft-xl": "0 25px 50px -12px rgb(0 0 0 / 0.12)",
        "brand-sm": "0 1px 3px 0 rgb(17 24 39 / 0.15), 0 1px 2px -1px rgb(17 24 39 / 0.10)",
        brand: "0 4px 14px 0 rgb(17 24 39 / 0.20)",
        "brand-lg": "0 10px 40px 0 rgb(17 24 39 / 0.25)",
        "inner-brand": "inset 0 2px 4px 0 rgb(17 24 39 / 0.1)",
        // Liquid glass shadows — outer depth + inner white highlight
        glass: "0 8px 32px rgba(100,116,139,0.10), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)",
        "glass-lg": "0 20px 60px rgba(100,116,139,0.14), 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)",
        "glass-card": "0 4px 24px rgba(100,116,139,0.08), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)",
        "glass-sm": "0 2px 12px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.90)",
        "silver-glow": "0 4px 20px rgba(148,163,184,0.20), 0 1px 4px rgba(148,163,184,0.12)",
        "widget": "0 24px 64px rgba(100,116,139,0.16), 0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #1f2937 0%, #111827 50%, #030712 100%)",
        "gradient-brand-subtle": "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
        "gradient-hero": "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(17, 24, 39, 0.08) 0%, transparent 100%)",
        "gradient-dark-hero": "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(17, 24, 39, 0.15) 0%, transparent 100%)",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(17, 24, 39, 0.06) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(8, 145, 178, 0.04) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(220, 38, 38, 0.03) 0px, transparent 50%)",
        // Premium new gradients
        "gradient-gold": "linear-gradient(135deg, #D4A017 0%, #E6BC43 100%)",
        "gradient-gold-subtle": "linear-gradient(135deg, rgba(212,160,23,0.08) 0%, rgba(230,188,67,0.04) 100%)",
        "gradient-hero-warm": "radial-gradient(ellipse 70% 55% at 85% -5%, rgba(212,160,23,0.055) 0%, transparent 65%), radial-gradient(ellipse 60% 60% at -10% 80%, rgba(17,24,39,0.03) 0%, transparent 60%)",
        "gradient-sidebar": "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
        "gradient-card-top": "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,250,250,1) 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "pulse-brand": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(17, 24, 39, 0.3)" },
          "50%": { boxShadow: "0 0 0 8px rgba(17, 24, 39, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s ease-out",
        "fade-down": "fade-down 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "pulse-brand": "pulse-brand 2s infinite",
        float: "float 3s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
