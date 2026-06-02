import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Pill, Empty, StatusBadge } from '@worldcup/ui';
import { fmtDay, fmtFull, GROUP_LETTERS, type Match } from '@worldcup/shared';
import { MatchCard } from '@/components/cards';
import { MatchdayHero } from '@/components/MatchdayHero';
import { MockBanner } from '@/components/MockBanner';
import { TeamCrest, TeamFlag, TeamKit } from '@/components/identity';
import { useMatches, useTeams, useTeamsMap, useVenues, useVenuesMap } from '@/hooks';
import { focusMatch, venueTimeLabel, weatherSummary } from '@/lib/matchMeta';
import { recommendPick } from '@/lib/opsIntelligence';
import { useMatchFilters } from '@/store/filters';

const STATUSES = [
  { v: '', l: 'Todos' },
  { v: 'LIVE', l: 'En vivo' },
  { v: 'UPCOMING', l: 'Próximos' },
  { v: 'FT', l: 'Final' },
];

export function MatchCenter() {
  const f = useMatchFilters();
  const [compact, setCompact] = useState(true);
  const { data: teamsData } = useTeams();
  const { data: venuesData } = useVenues();
  const { data, isLoading } = useMatches({
    status: f.status,
    group: f.group,
    team: f.team,
    stage: f.stage,
    venue: f.venue,
    date: f.date,
  });

  const matches = useMemo(() => data?.items ?? [], [data]);
  const heroMatch = useMemo(() => focusMatch(matches), [matches]);
  const stages = useMemo(() => [...new Set(matches.map((m) => m.stage))].sort(), [matches]);
  const dates = useMemo(() => [...new Set(matches.map((m) => m.date))].sort(), [matches]);

  const byDate = useMemo(() => {
    const groups: Record<string, typeof matches> = {};
    for (const m of [...matches].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))) {
      (groups[m.date] ??= []).push(m);
    }
    return groups;
  }, [matches]);

  const activeFilters = [f.status, f.group, f.team, f.stage, f.venue, f.date].filter(Boolean).length;

  return (
    <div className="page-fade">
      <MockBanner />

      {!isLoading && matches.length > 0 && (
        <>
          <MatchdayHero match={heroMatch} />
          <MatchCenterCommand matches={matches} compact={compact} onToggleCompact={() => setCompact((value) => !value)} />
        </>
      )}

      <div className="card card-pad filter-sticky" style={{ marginBottom: 18 }}>
        <div className="row gap-8 wrap" style={{ marginBottom: 10 }}>
          {STATUSES.map((s) => (
            <Pill key={s.v} on={f.status === s.v} onClick={() => f.set({ status: s.v })}>
              {s.l}
            </Pill>
          ))}
          {activeFilters > 0 && (
            <button type="button" className="pill" onClick={() => f.reset()}>
              <Icon name="close" size={12} /> Limpiar ({activeFilters})
            </button>
          )}
          <button type="button" className={`pill match-density-toggle${compact ? ' on' : ''}`} onClick={() => setCompact((value) => !value)}>
            <Icon name={compact ? 'grid' : 'calendar'} size={12} /> {compact ? 'Vista compacta' : 'Vista completa'}
          </button>
        </div>
        <div className="row gap-8 wrap">
          <Select value={f.group} onChange={(v) => f.set({ group: v })} label="Grupo">
            <option value="">Todos los grupos</option>
            {GROUP_LETTERS.map((g) => (
              <option key={g} value={g}>
                Grupo {g}
              </option>
            ))}
          </Select>
          <Select value={f.team} onChange={(v) => f.set({ team: v })} label="Selección">
            <option value="">Todas las selecciones</option>
            {(teamsData?.items ?? []).map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select value={f.stage} onChange={(v) => f.set({ stage: v })} label="Fase">
            <option value="">Todas las fases</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select value={f.venue} onChange={(v) => f.set({ venue: v })} label="Sede">
            <option value="">Todas las sedes</option>
            {(venuesData?.items ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.city}
              </option>
            ))}
          </Select>
          <Select value={f.date} onChange={(v) => f.set({ date: v })} label="Fecha">
            <option value="">Todas las fechas</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="muted">Cargando partidos…</p>
      ) : matches.length === 0 ? (
        <Empty icon="calendar" title="Sin partidos" text="Ningún partido coincide con los filtros." />
      ) : (
        Object.entries(byDate).map(([date, list]) => (
          <div key={date} style={{ marginBottom: 22 }}>
            <div className="section-title">
              <span className="mono-label">{date}</span>
              <h2 style={{ fontSize: 14 }}>{list.length} partidos</h2>
            </div>
            <div className={`grid match-center-grid${compact ? ' compact' : ''}`}>
              {list.map((m) => (
                compact ? <CompactMatchCard key={m.id} m={m} /> : <MatchCard key={m.id} m={m} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MatchCenterCommand({
  matches,
  compact,
  onToggleCompact,
}: {
  matches: Match[];
  compact: boolean;
  onToggleCompact: () => void;
}) {
  const upcoming = useMemo(
    () => [...matches].filter((m) => m.status === 'UPCOMING').sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [matches],
  );
  const next = upcoming[0];
  const dayCount = next ? upcoming.filter((m) => m.date === next.date).length : 0;
  const liveCount = matches.filter((m) => m.status === 'LIVE').length;
  const finalCount = matches.filter((m) => m.status === 'FT').length;

  return (
    <div className="match-center-command card">
      <div>
        <span className="mono-label">Centro de partidos</span>
        <strong>{next ? `${fmtFull(next.date)} · ${dayCount} partidos` : 'Calendario sin pendientes'}</strong>
        <p>{next ? `Siguiente ventana: ${next.time} hora sede. Vista optimizada para revisar rápido y entrar a detalle.` : 'Revisa resultados y estadísticas cuando existan marcadores finales.'}</p>
      </div>
      <div className="match-center-metrics">
        <span><b>{matches.length}</b><small>visibles</small></span>
        <span><b>{liveCount}</b><small>en vivo</small></span>
        <span><b>{finalCount}</b><small>finales</small></span>
      </div>
      <button type="button" className="btn ghost" onClick={onToggleCompact}>
        <Icon name={compact ? 'list' : 'grid'} size={14} />
        {compact ? 'Ver completa' : 'Ver compacta'}
      </button>
    </div>
  );
}

function CompactMatchCard({ m }: { m: Match }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const venues = useVenuesMap();
  const teamItems = useMemo(() => Object.values(teams), [teams]);
  const rec = useMemo(() => recommendPick(m, teamItems), [m, teamItems]);
  const weather = weatherSummary(m.id);
  const played = m.status !== 'UPCOMING';
  const venue = venues[m.venue];

  return (
    <button
      type="button"
      className="compact-match-card card hoverable"
      onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: m.id } })}
    >
      <div className="compact-match-top">
        <StatusBadge status={m.status} minute={m.minute} time={m.time} />
        <span className="mono-label">{m.group ? `Grupo ${m.group}` : m.stage}</span>
      </div>
      <div className="compact-match-row">
        <span className="compact-team">
          <TeamCrest code={m.home} size={30} />
          <TeamFlag code={m.home} size={14} />
          <strong>{teams[m.home]?.name ?? m.home}</strong>
        </span>
        <span className="compact-score num">
          {played ? (
            <>
              {m.homeGoals ?? 0}<b>-</b>{m.awayGoals ?? 0}
            </>
          ) : (
            <>
              {m.time}<small>{fmtDay(m.date)}</small>
            </>
          )}
        </span>
        <span className="compact-team away">
          <TeamCrest code={m.away} size={30} />
          <TeamFlag code={m.away} size={14} />
          <strong>{teams[m.away]?.name ?? m.away}</strong>
        </span>
      </div>
      <div className="compact-kit-line" aria-hidden="true">
        <TeamKit code={m.home} size={28} variant="home" />
        <span />
        <TeamKit code={m.away} size={28} variant="away" />
      </div>
      <div className="compact-match-foot">
        <span title={venueTimeLabel(m)}><Icon name="clock" size={12} /> {venueTimeLabel(m)}</span>
        <span title={weather.detail}><Icon name="rain" size={12} /> {weather.label}</span>
        <span title={rec.risk}><Icon name="target" size={12} /> {rec.label}</span>
        <span><Icon name="pin" size={12} /> {venue?.city ?? m.venue}</span>
      </div>
    </button>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="pill" style={{ paddingTop: 2, paddingBottom: 2 }}>
      <span className="mono-label" style={{ margin: 0 }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--tx)',
          font: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {children}
      </select>
    </label>
  );
}
