/** Appearance preferences (Tweaks). Persisted and applied to <html>. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'regular' | 'comfy';

export const FONT_PRESETS: Record<string, [ui: string, num: string]> = {
  Archivo: ["'Archivo', 'Space Grotesk', system-ui, sans-serif", "'JetBrains Mono', ui-monospace, monospace"],
  'Space Grotesk': ["'Space Grotesk', system-ui, sans-serif", "'Space Mono', ui-monospace, monospace"],
  'Hanken Grotesk': ["'Hanken Grotesk', system-ui, sans-serif", "'IBM Plex Mono', ui-monospace, monospace"],
};

export interface PreferencesState {
  theme: Theme;
  density: Density;
  accent: string;
  goldAmt: number; // 0..100
  radius: number; // px
  font: keyof typeof FONT_PRESETS;
  set: <K extends keyof PreferencesState>(key: K, value: PreferencesState[K]) => void;
  reset: () => void;
}

const DEFAULTS = {
  theme: 'dark' as Theme,
  density: 'regular' as Density,
  accent: '#c9a24b',
  goldAmt: 30,
  radius: 14,
  font: 'Archivo' as keyof typeof FONT_PRESETS,
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<PreferencesState>),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'wc_prefs' },
  ),
);

/** Apply the current preferences to document.documentElement. */
export function applyPreferences(p: PreferencesState): void {
  const r = document.documentElement;
  r.setAttribute('data-theme', p.theme);
  r.setAttribute('data-density', p.density);
  r.style.setProperty('--gold', p.accent);
  r.style.setProperty('--gold-2', p.accent);
  r.style.setProperty('--gold-amt', (p.goldAmt / 100).toFixed(2));
  r.style.setProperty('--r', `${p.radius}px`);
  r.style.setProperty('--r-sm', `${Math.max(4, p.radius - 5)}px`);
  const fp = FONT_PRESETS[p.font] ?? FONT_PRESETS.Archivo;
  r.style.setProperty('--font-ui', fp![0]);
  r.style.setProperty('--font-num', fp![1]);
}
