/** Appearance preferences (Tweaks). Persisted and applied to <html>. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'regular' | 'comfy';
export type AppRole = 'admin' | 'family' | 'guest';
export type Lang = 'es' | 'en';

export const FONT_PRESETS: Record<string, [ui: string, num: string]> = {
  Archivo: ["'Archivo', 'Space Grotesk', system-ui, sans-serif", "'JetBrains Mono', ui-monospace, monospace"],
  'Space Grotesk': ["'Space Grotesk', system-ui, sans-serif", "'Space Mono', ui-monospace, monospace"],
  'Hanken Grotesk': ["'Hanken Grotesk', system-ui, sans-serif", "'IBM Plex Mono', ui-monospace, monospace"],
};

/** Key used to track whether the user has explicitly chosen a theme. */
const THEME_EXPLICIT_KEY = 'wc_theme_explicit';

/** Returns true if the user has manually set a theme preference. */
export function isThemeExplicit(): boolean {
  return localStorage.getItem(THEME_EXPLICIT_KEY) === '1';
}

/** Mark the theme as explicitly chosen by the user. */
export function markThemeExplicit(): void {
  localStorage.setItem(THEME_EXPLICIT_KEY, '1');
}

/** Detect the initial theme: respect explicit choice, otherwise follow system. */
function getSystemTheme(): Theme {
  // Guard matchMedia: it is absent in SSR and some test environments (jsdom).
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export interface PreferencesState {
  theme: Theme;
  density: Density;
  role: AppRole;
  lang: Lang;
  accent: string;
  goldAmt: number; // 0..100
  radius: number; // px
  font: keyof typeof FONT_PRESETS;
  set: <K extends keyof PreferencesState>(key: K, value: PreferencesState[K]) => void;
  reset: () => void;
}

const DEFAULTS = {
  theme: getSystemTheme(),
  density: 'regular' as Density,
  role: 'family' as AppRole,
  lang: 'es' as Lang,
  accent: '#c9a24b',
  goldAmt: 30,
  radius: 14,
  font: 'Archivo' as keyof typeof FONT_PRESETS,
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => {
        if (key === 'theme') markThemeExplicit();
        set({ [key]: value } as Partial<PreferencesState>);
      },
      reset: () => {
        localStorage.removeItem(THEME_EXPLICIT_KEY);
        set({ ...DEFAULTS, theme: getSystemTheme() });
      },
    }),
    {
      name: 'wc_prefs',
      version: 4,
      migrate: (persisted) => {
        const prev = persisted as Partial<PreferencesState>;
        // If upgrading from an earlier version, the user had no explicit choice yet.
        // Keep the stored theme if it was explicitly set; otherwise detect system.
        const theme = isThemeExplicit() ? (prev.theme ?? getSystemTheme()) : getSystemTheme();
        return { ...prev, theme, role: prev.role ?? 'family', lang: prev.lang ?? 'es' };
      },
    },
  ),
);

/** Update theme without marking it as explicit (for system preference tracking). */
export function setSystemThemePreference(theme: Theme): void {
  usePreferences.setState({ theme });
}

/** Apply the current preferences to document.documentElement. */
export function applyPreferences(p: PreferencesState): void {
  const r = document.documentElement;
  r.setAttribute('data-theme', p.theme);
  r.setAttribute('data-density', p.density);
  r.setAttribute('data-role', p.role);
  r.style.setProperty('--gold', p.accent);
  r.style.setProperty('--gold-2', p.accent);
  r.style.setProperty('--gold-amt', (p.goldAmt / 100).toFixed(2));
  r.style.setProperty('--r', `${p.radius}px`);
  r.style.setProperty('--r-sm', `${Math.max(4, p.radius - 5)}px`);
  const fp = FONT_PRESETS[p.font] ?? FONT_PRESETS.Archivo;
  r.style.setProperty('--font-ui', fp![0]);
  r.style.setProperty('--font-num', fp![1]);
}
