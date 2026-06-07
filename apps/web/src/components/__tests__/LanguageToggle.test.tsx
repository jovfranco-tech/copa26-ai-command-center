/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within, act } from '@testing-library/react';
import { LanguageToggle } from '../LanguageToggle';
import { usePreferences } from '@/store/preferences';

afterEach(() => {
  cleanup();
  act(() => usePreferences.getState().set('lang', 'es')); // reset shared store
});

describe('LanguageToggle — a11y & i18n', () => {
  it('renders an accessible ES|EN segmented group', () => {
    render(<LanguageToggle />);
    const group = screen.getByRole('group');
    // The group exposes an accessible name (resolved via i18n).
    expect(group.getAttribute('aria-label')).toBeTruthy();

    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons.map((b) => b.textContent)).toEqual(['ES', 'EN']);
    // Each control carries a tooltip/title for sighted users.
    buttons.forEach((b) => expect(b.getAttribute('title')).toBeTruthy());
  });

  it('reflects the active language through aria-pressed (default ES)', () => {
    render(<LanguageToggle />);
    const [esBtn, enBtn] = within(screen.getByRole('group')).getAllByRole('button');
    expect(esBtn.getAttribute('aria-pressed')).toBe('true');
    expect(enBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('moves aria-pressed to EN when the language flips', () => {
    render(<LanguageToggle />);
    act(() => usePreferences.getState().set('lang', 'en'));
    const [esBtn, enBtn] = within(screen.getByRole('group')).getAllByRole('button');
    expect(enBtn.getAttribute('aria-pressed')).toBe('true');
    expect(esBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
