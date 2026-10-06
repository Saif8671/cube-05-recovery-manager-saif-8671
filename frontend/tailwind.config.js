/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base design tokens
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          subtle: "var(--border-subtle)",
          accent: "var(--border-accent)",
        },
        background: {
          DEFAULT: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          subtle: "var(--bg-subtle)",
        },
        foreground: "var(--text-primary)",
        surface: {
          DEFAULT: "var(--surface-primary)",
          secondary: "var(--surface-secondary)",
          subtle: "var(--surface-subtle)",
          elevated: "var(--surface-elevated)",
          hover: "var(--surface-hover)",
        },
        // Brand & Accent tokens
        primary: {
          DEFAULT: "#FF9900",
          hover: "#E88A00",
          active: "#D97706",
          light: "#FFF3E0",
        },
        highlight: {
          yellow: "#FFD814",
          yellowHover: "#F7CA00",
        },
        // Direct Semantic Status tokens
        status: {
          success: "#067D68",
          warning: "#B45309",
          error: "#C40000",
          info: "#2563EB",
          neutral: "#4B5563",
          pending: "#D97706",
        },
        // Coherent mappings for existing components to adopt the light design system seamlessly
        slate: {
          50: '#F7F8FA',
          100: '#111827', // Primary dark text
          200: '#1F2937', // Deep text
          300: '#374151',
          400: '#4B5563', // Secondary text
          500: '#6B7280', // Muted text
          600: '#9CA3AF',
          700: '#D1D5DB', // Strong border
          800: '#E5E7EB', // Default border
          900: '#FFFFFF', // Card / surface background
          950: '#F7F8FA', // Page / section secondary background
        },
        emerald: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#D97706',
          400: '#FF9900', // Amazon primary accent
          500: '#FF9900',
          600: '#E88A00', // Hover
          700: '#C47400',
          800: '#FEF3C7',
          900: '#FFFBEB',
          950: '#FAFAFA',
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        control: "6px",
        input: "8px",
        btn: "8px",
        card: "12px",
        section: "16px",
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0, 0, 0, 0.05)",
        card: "0 1px 2px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.08)",
        elevated: "0 4px 12px rgba(0, 0, 0, 0.08)",
        modal: "0 12px 32px rgba(0, 0, 0, 0.14)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "fade-in-up": "fadeInUp 0.3s ease-out",
        "fade-in-down": "fadeInDown 0.3s ease-out",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "150ms",
        normal: "250ms",
      },
    },
  },
  plugins: [],
};
