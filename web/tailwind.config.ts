import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      colors: {
        void: "#16232e",
        plasma: "#3b4b66",
        neon: "#7aa2f7",
        aurora: "#9aa7bd",
      },
      backgroundImage: {
        "grid-radial": "radial-gradient(circle at 1px 1px, rgba(99,59,245,0.4) 0.5px, transparent 0)",
      },
      animation: {
        flow: "flow 18s ease-in-out infinite",
        pulseGlow: "pulseGlow 6s ease-in-out infinite",
      },
      keyframes: {
        flow: {
          "0%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(2%, -2%, 0)" },
          "100%": { transform: "translate3d(0,0,0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 30px rgba(99,59,245,0.45)" },
          "50%": { boxShadow: "0 0 55px rgba(56,189,248,0.75)" },
        },
      },
    },
  },
  plugins: [require("postcss-nesting"), require("@tailwindcss/typography"), require("@tailwindcss/forms")],
};

export default config;

