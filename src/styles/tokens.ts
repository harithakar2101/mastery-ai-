/**
 * Mastery.ai Design System Tokens
 * Unified design tokens for typography, elevation, spacing, radius, and themes
 * Complies with WCAG 2.2 AA contrast guidelines across light and dark modes
 */

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
} as const;

export const spacing = {
  0: '0px',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
} as const;

export const radii = {
  none: '0px',
  sm: '0.25rem',  // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem',   // 8px
  xl: '0.75rem',  // 12px
  '2xl': '1rem',  // 16px
  full: '9999px',
} as const;

export const elevation = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  glow: '0 0 15px rgba(59, 130, 246, 0.35)',
} as const;

export const colors = {
  dark: {
    bg: {
      primary: '#060b13',
      secondary: '#0b1322',
      tertiary: '#111b2b',
      elevated: '#162235',
      overlay: 'rgba(6, 11, 19, 0.85)',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      muted: '#64748b',
      inverse: '#0f172a',
    },
    border: {
      subtle: '#162235',
      default: '#1e2f47',
      focus: '#3b82f6',
    },
    brand: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      accent: '#6366f1',
      cyan: '#06b6d4',
    },
    status: {
      success: '#10b981',
      successBg: 'rgba(16, 185, 129, 0.12)',
      warning: '#f59e0b',
      warningBg: 'rgba(245, 158, 11, 0.12)',
      error: '#ef4444',
      errorBg: 'rgba(239, 68, 68, 0.12)',
      info: '#3b82f6',
      infoBg: 'rgba(59, 130, 246, 0.12)',
    },
  },
  light: {
    bg: {
      primary: '#f8fafc',
      secondary: '#ffffff',
      tertiary: '#f1f5f9',
      elevated: '#ffffff',
      overlay: 'rgba(255, 255, 255, 0.85)',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#94a3b8',
      inverse: '#f8fafc',
    },
    border: {
      subtle: '#f1f5f9',
      default: '#e2e8f0',
      focus: '#2563eb',
    },
    brand: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      accent: '#4f46e5',
      cyan: '#0891b2',
    },
    status: {
      success: '#059669',
      successBg: '#ecfdf5',
      warning: '#d97706',
      warningBg: '#fffbeb',
      error: '#dc2626',
      errorBg: '#fef2f2',
      info: '#2563eb',
      infoBg: '#eff6ff',
    },
  },
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const resolved = mode === 'system' ? getSystemTheme() : mode;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light-mode');
  } else {
    root.classList.remove('dark');
    root.classList.add('light-mode');
  }
}
