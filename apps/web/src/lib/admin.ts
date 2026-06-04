/**
 * Client helpers for the password-gated admin panel. The password is held only in
 * sessionStorage and sent as a header on each request; it is verified server-side
 * (api/admin-update) against ADMIN_PASSWORD and never persisted in the overlay.
 */
import type { AdminOp, LiveOverlay } from '@worldcup/shared';

const PW_KEY = 'wc-admin-pw';

export const getStoredPassword = (): string => {
  try {
    return sessionStorage.getItem(PW_KEY) ?? '';
  } catch {
    return '';
  }
};
export const setStoredPassword = (pw: string): void => {
  try {
    sessionStorage.setItem(PW_KEY, pw);
  } catch {
    /* ignore */
  }
};
export const clearStoredPassword = (): void => {
  try {
    sessionStorage.removeItem(PW_KEY);
  } catch {
    /* ignore */
  }
};

export interface AdminState {
  ok: boolean;
  configured: boolean;
  overlay: LiveOverlay;
}

export class AdminError extends Error {
  constructor(public code: 'unauthorized' | 'not-configured' | 'network') {
    super(code);
  }
}

/** Verify the password and load the current overlay. */
export async function adminLoad(pw: string): Promise<AdminState> {
  let res: Response;
  try {
    res = await fetch('/api/admin-update', { headers: { 'x-admin-password': pw } });
  } catch {
    throw new AdminError('network');
  }
  if (res.status === 401) throw new AdminError('unauthorized');
  if (res.status === 503) throw new AdminError('not-configured');
  if (!res.ok) throw new AdminError('network');
  return (await res.json()) as AdminState;
}

export interface SyncSummary {
  ok: boolean;
  total?: number;
  matched?: number;
  written?: number;
  skippedManual?: number;
  unmatched?: number;
  unmatchedSample?: { home?: string; away?: string }[];
  error?: string;
  detail?: string;
}

/** Force an immediate results sync from the feed (same job the cron runs). */
export async function adminSyncNow(pw: string): Promise<SyncSummary> {
  let res: Response;
  try {
    res = await fetch('/api/sync-results', { headers: { 'x-admin-password': pw } });
  } catch {
    throw new AdminError('network');
  }
  if (res.status === 401) throw new AdminError('unauthorized');
  return (await res.json()) as SyncSummary;
}

/** Apply one admin operation; returns the new overlay. */
export async function adminApply(pw: string, op: AdminOp): Promise<LiveOverlay> {
  let res: Response;
  try {
    res = await fetch('/api/admin-update', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-password': pw },
      body: JSON.stringify(op),
    });
  } catch {
    throw new AdminError('network');
  }
  if (res.status === 401) throw new AdminError('unauthorized');
  if (res.status === 503) throw new AdminError('not-configured');
  if (!res.ok) throw new AdminError('network');
  const data = (await res.json()) as { overlay: LiveOverlay };
  return data.overlay;
}
