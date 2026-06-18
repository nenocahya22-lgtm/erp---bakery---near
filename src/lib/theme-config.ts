/**
 * Tema Konfigurasi Pusat — Near Bakery & Co. ERP
 * 
 * Semua warna, font, dan nilai branding ada di sini.
 * Ubah nilai-nilai di bawah untuk mengganti seluruh tema aplikasi.
 * 
 * Cara pakai di CSS:
 *   var(--color-brand)  → #006241 (hijau Starbucks)
 *   var(--color-gold)   → #cba258 (emas)
 * 
 * Cara pakai di Tailwind:
 *   bg-[var(--color-brand)]
 *   text-[var(--color-gold)]
 */

export const THEME = {
  // ─── WARNA BRAND ───
  brand: '#006241',           // Hijau khas (Starbucks green)
  brandLight: '#00754A',      // Hijau accent lebih terang
  brandDark: '#1E3932',       // Hijau gelap (house green)
  gold: '#cba258',            // Emas/premium
  canvas: '#f2f0eb',          // Krem hangat (background)
  white: '#ffffff',

  // ─── STATUS ───
  success: '#059669',         // emerald-600
  warning: '#d97706',         // amber-600
  error: '#dc2626',           // red-600
  info: '#2563eb',            // blue-600

  // ─── NEUTRAL ───
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // ─── FONT ───
  fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Courier New', monospace",

  // ─── LAYOUT ───
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
  },

  // ─── SHADOW ───
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  // ─── NAVIGASI SIDEBAR ───
  sidebar: {
    bg: '#1e293b',           // slate-800
    text: '#cbd5e1',         // slate-300
    activeBg: '#006241',     // brand
    activeText: '#ffffff',
    hoverBg: '#334155',      // slate-700/50
  },

  // ─── HEADER ───
  header: {
    bg: '#ffffff',
    border: '#f1f5f9',
  },
} as const;

export type Theme = typeof THEME;
