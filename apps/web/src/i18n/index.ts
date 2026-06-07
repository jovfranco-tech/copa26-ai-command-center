/**
 * Tiny, dependency-free i18n. Reactive via the persisted preferences store, so
 * changing the language re-renders the UI instantly with no page reload, and the
 * choice survives reloads (localStorage, default 'es').
 *
 * Spanish (the default + fallback) ships in the main bundle. English is split
 * into its own lazily-loaded chunk: most sessions stay in Spanish and never
 * download it. The chunk is loaded *before* the language actually flips (on boot
 * for a persisted 'en', and on the toggle), so there's no flash of Spanish.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t('nav.home')}</h1>
 *   <p>{t('greeting', { name })}</p>   // "Hola {name}" → "Hola Ana"
 */
import { useSyncExternalStore } from 'react';
import { usePreferences, type Lang } from '@/store/preferences';
import { es, type Dict } from './es';

export type { Lang };
/** Translator signature shared by useT() and the Spanish-default tEs helper. */
export type Translate = (key: string, vars?: Record<string, string | number>) => string;

// es is always present; en is filled in once its chunk resolves.
const dicts: { es: Dict; en: Dict | null } = { es, en: null };

// Minimal external store so useT() consumers re-render when the en chunk lands.
const enListeners = new Set<() => void>();
let enVersion = 0;
let enPromise: Promise<void> | null = null;

/** Load the English dictionary chunk (idempotent). Resolves once `en` is ready. */
export function ensureEnglish(): Promise<void> {
  if (dicts.en) return Promise.resolve();
  if (!enPromise) {
    enPromise = import('./en').then((m) => {
      dicts.en = m.en;
      enVersion += 1;
      enListeners.forEach((l) => l());
    });
  }
  return enPromise;
}

function lookup(dict: unknown, key: string): string | undefined {
  const val = key.split('.').reduce<unknown>(
    (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    dict,
  );
  return typeof val === 'string' ? val : undefined;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  // Fall back to Spanish (the complete, always-loaded dict) if the active language
  // is English but its chunk hasn't resolved yet, or a key is missing.
  const active = lang === 'en' ? dicts.en ?? dicts.es : dicts.es;
  let s = lookup(active, key) ?? lookup(dicts.es, key) ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return s;
}

/**
 * Spanish-default translator for non-React/pure helpers (e.g. lib/matchMeta).
 * Pure functions accept an optional `Translate`; when a React caller passes the
 * reactive `useT()` result the output follows the active language, otherwise it
 * falls back to Spanish — the app default — so nothing mixes.
 */
export const tEs: Translate = (key, vars) => translate('es', key, vars);

/** Reactive translation hook. Re-renders when the language or en-chunk changes. */
export function useT() {
  const lang = usePreferences((s) => s.lang);
  // Re-render if the English chunk resolves after this render (safety net; the
  // chunk is normally loaded before `lang` ever flips to 'en').
  useSyncExternalStore(
    (cb) => {
      enListeners.add(cb);
      return () => enListeners.delete(cb);
    },
    () => enVersion,
    () => enVersion,
  );
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export function useLang(): Lang {
  return usePreferences((s) => s.lang);
}

export function useSetLang(): (lang: Lang) => void {
  const set = usePreferences((s) => s.set);
  return (lang: Lang) => {
    // Load the en chunk before flipping the language so the UI never flashes
    // Spanish on the way to English.
    if (lang === 'en') void ensureEnglish().then(() => set('lang', 'en'));
    else set('lang', lang);
  };
}
