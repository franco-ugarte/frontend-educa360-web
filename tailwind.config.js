/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Fondos y superficies
          surface: "#F8FAFC",        // fondo general
          white: "#FFFFFF",
          border: "#E2E8F0",        // borde principal
          borderSoft: "#F1F5F9",     // borde suave / divisor
          // Primario institucional
          primary: "#5F348F",       // morado institucional
          primaryLight: "#EDE9FE",   // lavanda pastel (glow, progress bg)
          primarySoft: "#F3E8FF",    // lavanda claro (role tag, active inner)
          // Textos
          navy: "#1E1B4B",          // texto principal / títulos
          slate: "#64748B",         // texto secundario
          muted: "#475569",         // texto terciario / meta
          label: "#334155",         // labels de inputs
          ink: "#0F172A",           // texto oscuro / sombras
          placeholder: "#94A3B8",   // placeholders
          inactive: "#94A3B8",      // tabs inactivos
          // Focus
          focus: "#6366F1",         // borde input focus (indigo)
          // Estados
          success: "#10B981",
          successDark: "#059669",
          successBg: "#ECFDF5",
          successBorder: "#A7F3D0",
          danger: "#EF4444",
          dangerDark: "#DC2626",
          dangerBg: "#FEF2F2",
          dangerBorder: "#FECACA",
          dangerText: "#991B1B",
          // Gradientes / acentos
          violetElectric: "#A855F7", // CosmicButton gradiente inicio
          amber: "#F59E0B",          // CosmicButton gradiente fin / sombra
          amberStats: "#F9B201",     // GradientButtonGroup activo / stat cursos
          violetMid: "#8C4ABD",     // GradientButtonGroup borde activo
        },
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 4px 12px rgba(15, 23, 42, 0.06)",
        cardLg: "0 12px 24px rgba(15, 23, 42, 0.08)",
        amber: "0 4px 12px rgba(245, 158, 11, 0.45)",
      },
      spacing: {
        15: "3.75rem",
      },
      fontFamily: {
        sans: ["Segoe UI", "Roboto", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}