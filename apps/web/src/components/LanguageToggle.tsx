import { useLang, useSetLang, useT, type Lang } from '@/i18n';

/** Compact, elegant ES|EN segmented toggle for the header. Persists + switches live. */
export function LanguageToggle() {
  const lang = useLang();
  const setLang = useSetLang();
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      style={{
        display: 'inline-flex',
        border: '1px solid var(--gold-line, var(--bd, #2a2d35))',
        borderRadius: 999,
        overflow: 'hidden',
        background: 'var(--bg-2, rgba(255,255,255,0.03))',
        flex: '0 0 auto',
      }}
    >
      {(['es', 'en'] as Lang[]).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            title={t(`lang.${l}`)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '4px 9px',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.04em',
              lineHeight: 1.4,
              background: active ? 'var(--gold)' : 'transparent',
              color: active ? '#0a0a0a' : 'var(--tx-2, #9aa0aa)',
              transition: 'background .15s ease, color .15s ease',
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
