import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#111111",
        graphite: "#242424",
        muted: "#f7f7f7",
        ink: "#111111",
        gain: "#21a66a",
        danger: "#ef6060",
        amber: "#d89b25",
        line: "rgba(17,17,17,0.08)",
      },
      boxShadow: {
        premium: "0 24px 70px rgba(17, 17, 17, 0.09)",
        glow: "0 18px 55px rgba(33, 166, 106, 0.18)",
        soft: "0 12px 40px rgba(17, 17, 17, 0.07)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 10px -2px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 8px 24px -6px rgba(15, 23, 42, 0.14)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.38" },
          "50%": { opacity: "0.72" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
