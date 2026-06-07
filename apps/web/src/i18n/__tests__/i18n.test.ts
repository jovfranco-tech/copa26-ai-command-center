import { describe, it, expect } from 'vitest';
import { translate, tEs, ensureEnglish } from '../index';
import { es } from '../es';

// The English dictionary is a lazily-loaded chunk. These tests assert the
// fallback-then-swap behaviour: Spanish (always loaded) serves until the en
// chunk resolves, after which English requests return English. Order matters —
// the fallback case must run before ensureEnglish() loads the chunk.
describe('i18n', () => {
  it('translates with the Spanish (default) dictionary', () => {
    expect(translate('es', 'footer.tagline')).toBe(es.footer.tagline);
    expect(tEs('footer.tagline')).toBe(es.footer.tagline);
  });

  it('returns the key itself when missing', () => {
    expect(translate('es', 'totally.missing.key')).toBe('totally.missing.key');
  });

  it('interpolates {vars}', () => {
    const out = translate('es', 'playerDetail.years', { age: 25 });
    expect(out).toContain('25');
    expect(out).not.toContain('{age}');
  });

  it('falls back to Spanish for English until the en chunk loads', () => {
    // ensureEnglish() has not run yet → English requests use the complete ES dict.
    expect(translate('en', 'footer.tagline')).toBe(es.footer.tagline);
  });

  it('serves English once the en chunk is loaded', async () => {
    await ensureEnglish();
    const enVal = translate('en', 'footer.tagline');
    expect(typeof enVal).toBe('string');
    expect(enVal).not.toBe(es.footer.tagline); // ES and EN differ for this key
    expect(enVal).toBe('Personal project · no official affiliation.');
  });

  it('keeps the brand wordmark / disclaimer brand-safe (no false official claim)', async () => {
    await ensureEnglish();
    // The independence disclaimer is the only place FIFA / the World Cup is named,
    // and always in a "not affiliated" context.
    expect(translate('en', 'footer.aloriaDisclaimer')).toMatch(/not affiliated with/i);
    expect(translate('es', 'footer.aloriaDisclaimer')).toMatch(/No está afiliada/i);
  });
});
