/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#153a6b",
          50: "#eef3fb",
          100: "#d6e2f4",
          200: "#adc5e9",
          300: "#7fa3da",
          400: "#4e7cc4",
          500: "#2c5aa3",
          600: "#1e4fa1",
          700: "#183f80",
          800: "#153a6b",
          900: "#0e2749",
          950: "#091934",
        },
        teal: {
          DEFAULT: "#6ac1b8",
          50: "#eefaf8",
          100: "#d3f1ec",
          200: "#a9e2d9",
          300: "#7dd0c3",
          400: "#6ac1b8",
          500: "#48a89d",
          600: "#398a82",
          700: "#2f6f6a",
          800: "#295856",
          900: "#254948",
        },
        cyan: {
          DEFAULT: "#41fdfe",
          50: "#eafffe",
          100: "#c8fffe",
          200: "#a0fdfe",
          300: "#41fdfe",
          400: "#1fe3e5",
          500: "#0dbcbf",
          600: "#0c9598",
          700: "#12777a",
          800: "#175f62",
          900: "#175053",
        },
        ink: {
          DEFAULT: "#101418",
          muted: "rgba(16,20,24,0.7)",
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      maxWidth: {
        container: "1280px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,20,24,0.04), 0 8px 24px -8px rgba(16,20,24,0.12)",
        "card-hover": "0 4px 8px rgba(16,20,24,0.06), 0 16px 32px -12px rgba(16,20,24,0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.35" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "page-in": "page-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in": "pop-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        ripple: "ripple 0.6s ease-out forwards",
        shake: "shake 0.4s ease-in-out",      },
    },
  },
  plugins: [],
};
