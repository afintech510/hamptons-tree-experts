/**
 * Hamptons Tree Experts — Design Tokens (F-017)
 * Shared TS module for programmatic access. CSS vars in design-tokens.css.
 * Rust-orange is RESERVED for urgency-tier pricing and primary CTAs ONLY.
 */

export const colors = {
  evergreen: "#1F3A2E",
  evergreenLight: "#2A4F3D",
  evergreenDark: "#152A20",
  bark: "#4A3728",
  barkLight: "#5E4A3A",
  barkDark: "#3A2A1E",
  sand: "#E8E2D4",
  sandLight: "#F2EDE2",
  sandDark: "#D4CCBC",
  rust: "#C4622D",
  rustHover: "#A8522A",
  rustLight: "#D4763E",
  white: "#FAFAF8",
  gray: {
    50: "#F5F3EF",
    100: "#E8E4DD",
    200: "#D1CCC3",
    300: "#B0A99E",
    400: "#8A8278",
    500: "#6B6359",
    600: "#524B42",
    700: "#3A342D",
    800: "#252119",
    900: "#141210",
  },
  success: "#2D7A4F",
  warning: "#B8860B",
  error: "#A63D2F",
} as const;

export const fonts = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
} as const;
