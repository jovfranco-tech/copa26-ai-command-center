/** Appearance "Tweaks" — theme / density / accent / radius / font. */
import { useEffect, useState } from 'react';
import { Icon, Pill } from '@worldcup/ui';
import { FONT_PRESETS, usePreferences } from '@/store/preferences';
import { useT } from '@/i18n';

const GOLDS = ['#c9a24b', '#d8b15e', '#b8863a', '#cbb27a', '#c08a4e'];

export function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const p = usePreferences();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="icon-btn tweaks-toggle-btn"
        title={t('tweaks.appearance')}
        onClick={() => setOpen((v) => !v)}
        style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 70, width: 44, height: 44 }}
      >
        <Icon name="settings" size={20} />
      </button>

      {open && (
        <>
          <div className="drawer-scrim" style={{ zIndex: 71 }} onClick={() => setOpen(false)} />
          <div
            className="card tweaks-panel-card"
            style={{
              position: 'fixed',
              right: 16,
              bottom: 72,
              width: 300,
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 72,
              padding: 0,
            }}
          >
            <div className="card-hd">
              <Icon name="settings" size={15} style={{ color: 'var(--gold)' }} />
              <h3>{t('tweaks.title')}</h3>
              <span className="spacer" />
              <button
                type="button"
                className="icon-btn"
                aria-label={t('tweaks.closeAria')}
                style={{ width: 30, height: 30 }}
                onClick={() => setOpen(false)}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label={t('tweaks.theme')}>
                {(['dark', 'light'] as const).map((v) => (
                  <Pill key={v} on={p.theme === v} onClick={() => p.set('theme', v)}>
                    {v === 'dark' ? t('tweaks.dark') : t('tweaks.light')}
                  </Pill>
                ))}
              </Field>
              <Field label={t('tweaks.density')}>
                {(['compact', 'regular', 'comfy'] as const).map((v) => (
                  <Pill key={v} on={p.density === v} onClick={() => p.set('density', v)}>
                    {v === 'compact' ? t('tweaks.compact') : v === 'regular' ? t('tweaks.regular') : t('tweaks.comfy')}
                  </Pill>
                ))}
              </Field>
              <Field label={t('role.label')}>
                {(['admin', 'family', 'guest'] as const).map((v) => (
                  <Pill key={v} on={p.role === v} onClick={() => p.set('role', v)}>
                    {t(`role.${v}`)}
                  </Pill>
                ))}
              </Field>
              <Field label={t('tweaks.corners')}>
                <input
                  type="range"
                  min={4}
                  max={22}
                  value={p.radius}
                  onChange={(e) => p.set('radius', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="num muted" style={{ fontSize: 12 }}>
                  {p.radius}px
                </span>
              </Field>
              <Field label={t('tweaks.goldTone')}>
                {GOLDS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => p.set('accent', c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: c,
                      border: p.accent === c ? '2px solid var(--tx)' : '1px solid var(--line-2)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Field>
              <Field label={t('tweaks.intensity')}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={p.goldAmt}
                  onChange={(e) => p.set('goldAmt', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="num muted" style={{ fontSize: 12 }}>
                  {p.goldAmt}%
                </span>
              </Field>
              <Field label={t('tweaks.typography')}>
                {Object.keys(FONT_PRESETS).map((f) => (
                  <Pill key={f} on={p.font === f} onClick={() => p.set('font', f as keyof typeof FONT_PRESETS)}>
                    {f}
                  </Pill>
                ))}
              </Field>
              <button type="button" className="btn ghost btn-sm" onClick={p.reset}>
                {t('bracket.reset')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono-label" style={{ marginBottom: 7 }}>
        {label}
      </div>
      <div className="row gap-6 wrap">{children}</div>
    </div>
  );
}
