/**
 * Tiny, dependency-free i18n. Reactive via the persisted preferences store, so
 * changing the language re-renders the UI instantly with no page reload, and the
 * choice survives reloads (localStorage, default 'es').
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t('nav.home')}</h1>
 *   <p>{t('greeting', { name })}</p>   // "Hola {name}" → "Hola Ana"
 */
import { usePreferences, type Lang } from '@/store/preferences';
import { es } from './es';
import { en } from './en';

export type { Lang };
const DICTS = { es, en } as const;

function lookup(dict: unknown, key: string): string | undefined {
  const val = key.split('.').reduce<unknown>(
    (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    dict,
  );
  return typeof val === 'string' ? val : undefined;
}

function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  // Fall back to Spanish (the complete dict) if a key is missing in the active language.
  let s = lookup(DICTS[lang], key) ?? lookup(DICTS.es, key) ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return s;
}

/** Reactive translation hook. Re-renders the component when the language changes. */
export function useT() {
  const lang = usePreferences((s) => s.lang);
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export function useLang(): Lang {
  return usePreferences((s) => s.lang);
}

export function useSetLang(): (lang: Lang) => void {
  const set = usePreferences((s) => s.set);
  return (lang: Lang) => set('lang', lang);
}
