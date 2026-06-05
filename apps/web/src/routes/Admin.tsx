/**
 * Password-gated admin panel. Publishes results + official lineups to the live
 * overlay (Vercel Blob) via /api/admin-update — the whole app picks them up within
 * seconds, no redeploy. The password is verified server-side; this UI only holds
 * it in sessionStorage to send as a header.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { emptyOverlay, type LineupSheet, type LiveOverlay, type Match, type Player } from '@worldcup/shared';
import { useMatches, usePlayers } from '@/hooks';
import { useT } from '@/i18n';
import { buildMatchLineups } from '@/features/stadium/data/stadiumDataMapper';
import {
  adminApply,
  adminLoad,
  adminSyncNow,
  AdminError,
  clearStoredPassword,
  getStoredPassword,
  setStoredPassword,
  type SyncSummary,
} from '@/lib/admin';

const card: React.CSSProperties = {
  background: 'var(--bg-2, #16181d)',
  border: '1px solid var(--bd, #2a2d35)',
  borderRadius: 12,
  padding: 16,
};
const input: React.CSSProperties = {
  background: 'var(--bg-1, #0f1115)',
  border: '1px solid var(--bd, #2a2d35)',
  borderRadius: 8,
  color: 'var(--tx, #e8eaed)',
  padding: '6px 8px',
  fontSize: 14,
};
const label = (m: Match) => `${m.home} vs ${m.away} · ${m.date}${m.time ? ' ' + m.time : ''}`;

export function Admin() {
  const t = useT();
  const [pw, setPw] = useState(getStoredPassword());
  const [authed, setAuthed] = useState(false);
  const [overlay, setOverlay] = useState<LiveOverlay>(emptyOverlay());
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const matches = useMatches().data?.items ?? [];
  const players = usePlayers().data?.items ?? [];

  async function unlock(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const s = await adminLoad(pw);
      setStoredPassword(pw);
      setOverlay(s.overlay);
      setConfigured(s.configured);
      setAuthed(true);
    } catch (err) {
      if (err instanceof AdminError && err.code === 'unauthorized') setError(t('admin.wrongPassword'));
      else if (err instanceof AdminError && err.code === 'not-configured')
        setError(t('admin.notConfigured'));
      else setError(t('admin.connError'));
    } finally {
      setBusy(false);
    }
  }

  // Auto-unlock if a password is already stored from a previous visit.
  useEffect(() => {
    if (getStoredPassword()) void unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <div style={{ maxWidth: 380, margin: '64px auto' }}>
        <form onSubmit={unlock} style={{ ...card, display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{t('admin.title')}</h2>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            {t('admin.subtitle')}
          </p>
          <input
            style={input}
            type="password"
            placeholder={t('admin.password')}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
          <button type="submit" className="btn gold" disabled={busy || !pw}>
            {busy ? t('admin.entering') : t('admin.enter')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 920 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{t('admin.liveUpdate')}</h1>
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearStoredPassword();
            setAuthed(false);
            setPw('');
          }}
        >
          {t('common.logout')}
        </button>
      </div>

      {!configured && (
        <div style={{ ...card, borderColor: '#b45309', color: '#fbbf24', fontSize: 13 }}>
          ⚠ {t('admin.storageWarnPre')}<strong>Blob store</strong>{t('admin.storageWarnMid')}<code>ADMIN_PASSWORD</code>{t('admin.storageWarnPost')}
        </div>
      )}

      <SyncSection pw={pw} onOverlay={setOverlay} />
      <ResultsSection matches={matches} overlay={overlay} pw={pw} onOverlay={setOverlay} />
      <LineupsSection matches={matches} players={players} overlay={overlay} pw={pw} onOverlay={setOverlay} />
    </div>
  );
}

/* ──────────────────────────── Sincronización ──────────────────────────── */

function SyncSection({ pw, onOverlay }: { pw: string; onOverlay: (o: LiveOverlay) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [err, setErr] = useState('');

  async function run() {
    setBusy(true);
    setErr('');
    try {
      const s = await adminSyncNow(pw);
      setSummary(s);
      if (s.ok && (s.written ?? 0) > 0) {
        try {
          const fresh = await adminLoad(pw);
          onOverlay(fresh.overlay);
        } catch {
          /* keep current overlay */
        }
      }
    } catch {
      setErr(t('admin.syncError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ ...card, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('admin.autoSync')}</h2>
          <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
            {t('admin.cronDesc')}
          </p>
        </div>
        <button type="button" className="btn gold" disabled={busy} onClick={run} style={{ whiteSpace: 'nowrap' }}>
          {busy ? t('admin.syncing') : t('admin.syncNow')}
        </button>
      </div>
      {err && <div style={{ color: '#f87171', fontSize: 13 }}>{err}</div>}
      {summary && !summary.ok && (
        <div style={{ color: '#fbbf24', fontSize: 13 }}>
          {summary.error === 'no-token'
            ? t('admin.noToken')
            : summary.error === 'feed'
              ? t('admin.feedError', { detail: summary.detail ?? '' })
              : summary.error === 'blob-not-configured'
                ? t('admin.blobNotConfigured')
                : t('admin.error', { error: summary.error ?? '' })}
        </div>
      )}
      {summary && summary.ok && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #9aa0aa)' }}>
          {t('admin.feedPre', { total: summary.total ?? 0, matched: summary.matched ?? 0 })}<strong>{summary.written}</strong> {t('admin.feedUpdated')}
          {summary.skippedManual ? t('admin.feedManual', { n: summary.skippedManual }) : ''}
          {summary.unmatched ? t('admin.feedUnmatched', { n: summary.unmatched }) : ''}
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────── Resultados ──────────────────────────── */

function ResultsSection({
  matches,
  overlay,
  pw,
  onOverlay,
}: {
  matches: Match[];
  overlay: LiveOverlay;
  pw: string;
  onOverlay: (o: LiveOverlay) => void;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const filtered = matches.filter((m) => label(m).toLowerCase().includes(q.toLowerCase())).slice(0, 80);
  const publishedCount = Object.keys(overlay.results).length;

  return (
    <section style={{ ...card, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{t('admin.results')}</h2>
        <span className="muted" style={{ fontSize: 12 }}>{t('admin.publishedCount', { n: publishedCount })}</span>
      </div>
      <input style={input} placeholder={t('admin.filterMatch')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
        {filtered.map((m) => (
          <ResultRow key={m.id} match={m} overlay={overlay} pw={pw} onOverlay={onOverlay} />
        ))}
      </div>
    </section>
  );
}

function ResultRow({
  match,
  overlay,
  pw,
  onOverlay,
}: {
  match: Match;
  overlay: LiveOverlay;
  pw: string;
  onOverlay: (o: LiveOverlay) => void;
}) {
  const t = useT();
  const current = overlay.results[match.id];
  const [home, setHome] = useState(current?.homeGoals != null ? String(current.homeGoals) : '');
  const [away, setAway] = useState(current?.awayGoals != null ? String(current.awayGoals) : '');
  const [status, setStatus] = useState<'FT' | 'LIVE'>(current?.status === 'LIVE' ? 'LIVE' : 'FT');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const published = current != null && current.homeGoals != null;

  async function save() {
    setBusy(true);
    try {
      const next = await adminApply(pw, {
        op: 'set-result',
        matchId: match.id,
        data: { homeGoals: Number(home), awayGoals: Number(away), status, source: 'manual' },
      });
      onOverlay(next);
      setErr(false);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }
  async function clear() {
    setBusy(true);
    try {
      const next = await adminApply(pw, { op: 'clear-result', matchId: match.id });
      onOverlay(next);
      setHome('');
      setAway('');
    } finally {
      setBusy(false);
    }
  }
  const valid = home !== '' && away !== '' && Number(home) >= 0 && Number(away) >= 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto auto',
        gap: 8,
        alignItems: 'center',
        padding: '4px 6px',
        borderRadius: 8,
        background: published ? 'rgba(16,185,129,0.06)' : 'transparent',
      }}
    >
      <span style={{ fontSize: 13 }}>{label(match)}</span>
      <input style={{ ...input, width: 46, textAlign: 'center' }} inputMode="numeric" value={home} onChange={(e) => setHome(e.target.value.replace(/\D/g, ''))} placeholder="–" />
      <input style={{ ...input, width: 46, textAlign: 'center' }} inputMode="numeric" value={away} onChange={(e) => setAway(e.target.value.replace(/\D/g, ''))} placeholder="–" />
      <select style={{ ...input, padding: '6px 4px' }} value={status} onChange={(e) => setStatus(e.target.value as 'FT' | 'LIVE')}>
        <option value="FT">FT</option>
        <option value="LIVE">{t('common.live')}</option>
      </select>
      <span style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          className={err ? 'btn' : 'btn gold'}
          disabled={busy || !valid}
          onClick={save}
          title={err ? t('admin.saveError') : undefined}
          style={{ padding: '4px 10px', fontSize: 12, ...(err ? { borderColor: '#f87171', color: '#f87171' } : {}) }}
        >
          {busy ? '…' : err ? t('common.retry') : t('common.save')}
        </button>
        {published && (
          <button type="button" className="btn" disabled={busy} onClick={clear} style={{ padding: '4px 8px', fontSize: 12 }}>
            {t('admin.remove')}
          </button>
        )}
      </span>
    </div>
  );
}

/* ──────────────────────────── Alineaciones ──────────────────────────── */

function LineupsSection({
  matches,
  players,
  overlay,
  pw,
  onOverlay,
}: {
  matches: Match[];
  players: Player[];
  overlay: LiveOverlay;
  pw: string;
  onOverlay: (o: LiveOverlay) => void;
}) {
  const t = useT();
  const [matchId, setMatchId] = useState(matches[0]?.id ?? '');
  const match = matches.find((m) => m.id === matchId) ?? matches[0];

  return (
    <section style={{ ...card, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{t('admin.officialLineups')}</h2>
        <span className="muted" style={{ fontSize: 12 }}>{t('admin.publishedCountF', { n: Object.keys(overlay.lineups).length })}</span>
      </div>
      <select style={input} value={matchId} onChange={(e) => setMatchId(e.target.value)}>
        {matches.slice(0, 80).map((m) => (
          <option key={m.id} value={m.id}>
            {label(m)}
            {overlay.lineups[m.id] ? ' ✓' : ''}
          </option>
        ))}
      </select>
      {match && (
        <LineupForm key={matchId} match={match} players={players} overlay={overlay} pw={pw} onOverlay={onOverlay} />
      )}
    </section>
  );
}

function LineupForm({
  match,
  players,
  overlay,
  pw,
  onOverlay,
}: {
  match: Match;
  players: Player[];
  overlay: LiveOverlay;
  pw: string;
  onOverlay: (o: LiveOverlay) => void;
}) {
  // Seed from the published overlay if present, else from the estimated XI.
  const seed = useMemo<{ home: LineupSheet; away: LineupSheet }>(() => {
    const existing = overlay.lineups[match.id];
    if (existing?.home && existing?.away) return { home: existing.home, away: existing.away };
    const l = buildMatchLineups(players, match.home, match.away, match.id);
    const toSheet = (t: (typeof l)['teams']['home']): LineupSheet => ({
      formation: t.formation,
      manager: t.manager,
      starters: t.players.map((p) => ({ shirt: p.number, name: p.name, pos: p.position })),
    });
    return { home: toSheet(l.teams.home), away: toSheet(l.teams.away) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  const t = useT();
  const [home, setHome] = useState<LineupSheet>(seed.home);
  const [away, setAway] = useState<LineupSheet>(seed.away);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const published = Boolean(overlay.lineups[match.id]);

  async function save() {
    setBusy(true);
    try {
      const next = await adminApply(pw, {
        op: 'set-lineup',
        matchId: match.id,
        data: { status: 'confirmada', source: 'Publicado desde el panel', home, away },
      });
      onOverlay(next);
      setErr(false);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }
  async function clear() {
    setBusy(true);
    try {
      onOverlay(await adminApply(pw, { op: 'clear-lineup', matchId: match.id }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <TeamColumn title={match.home} sheet={home} onChange={setHome} />
        <TeamColumn title={match.away} sheet={away} onChange={setAway} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={err ? 'btn' : 'btn gold'}
          disabled={busy}
          onClick={save}
          title={err ? t('admin.saveError') : undefined}
          style={err ? { borderColor: '#f87171', color: '#f87171' } : undefined}
        >
          {busy ? t('admin.saving') : err ? t('common.retry') : published ? t('admin.updateXI') : t('admin.publishXI')}
        </button>
        {published && (
          <button type="button" className="btn" disabled={busy} onClick={clear}>
            {t('admin.removeRevert')}
          </button>
        )}
      </div>
    </div>
  );
}

function TeamColumn({ title, sheet, onChange }: { title: string; sheet: LineupSheet; onChange: (s: LineupSheet) => void }) {
  const t = useT();
  const setStarter = (i: number, patch: Partial<LineupSheet['starters'][number]>) => {
    const starters = sheet.starters.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ ...sheet, starters });
  };
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <strong style={{ fontSize: 14 }}>{title}</strong>
      <input
        style={input}
        value={sheet.formation}
        onChange={(e) => onChange({ ...sheet, formation: e.target.value })}
        placeholder={t('admin.formationPlaceholder')}
      />
      {sheet.starters.map((s, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 56px', gap: 4 }}>
          <input style={{ ...input, textAlign: 'center' }} inputMode="numeric" value={s.shirt || ''} onChange={(e) => setStarter(i, { shirt: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          <input style={input} value={s.name} onChange={(e) => setStarter(i, { name: e.target.value })} />
          <select style={{ ...input, padding: '6px 2px' }} value={s.pos} onChange={(e) => setStarter(i, { pos: e.target.value as LineupSheet['starters'][number]['pos'] })}>
            <option>GK</option>
            <option>DF</option>
            <option>MF</option>
            <option>FW</option>
          </select>
        </div>
      ))}
    </div>
  );
}
