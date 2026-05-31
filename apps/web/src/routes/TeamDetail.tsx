import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Empty, Form, cn } from '@worldcup/ui';
import { fmtGD } from '@worldcup/shared';
import { TeamCrest, TeamFlag, TeamKit, FavStar } from '@/components/identity';
import { PlayerCard, MatchRow, StandingsTable } from '@/components/cards';
import { coachProfiles } from '@/generated/intelPacks';
import { downloadedTeamKitVariantExts, teamKitVariants, type TeamKitVariant } from '@/generated/teamKits';
import { useMatches, usePlayers, useStandings, useTeam } from '@/hooks';

type Tab = 'squad' | 'fixtures' | 'group';

export function TeamDetail({ code }: { code: string }) {
  const navigate = useNavigate();
  const { data: teamData, isLoading } = useTeam(code);
  const { data: players } = usePlayers({ team: code });
  const { data: matches } = useMatches({ team: code });
  const { data: standings } = useStandings();
  const [tab, setTab] = useState<Tab>('squad');

  if (isLoading) return <p className="muted">Cargando selección…</p>;
  const t = teamData?.item;
  if (!t) return <Empty icon="teams" title="Selección no encontrada" text="Esta selección no está en el dataset." />;

  const groupRows = standings?.groups[t.group] ?? [];
  const row = groupRows.find((r) => r.team === code);
  const squad = players?.items ?? [];
  const fixtures = (matches?.items ?? []).sort((a, b) => a.date.localeCompare(b.date));
  const coach = coachProfiles.items[code as keyof typeof coachProfiles.items];

  return (
    <div className="page-fade">
      <div className="card" style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${t.colorA}, ${t.colorB})` }} />
        <div className="card-pad">
          <div className="row gap-16 wrap">
            <TeamCrest code={code} size={72} />
            <TeamKit code={code} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row gap-10">
                <TeamFlag code={code} size={20} />
                <h2 style={{ margin: 0, fontSize: 22 }}>{t.name}</h2>
                <FavStar kind="teams" id={code} size={22} />
              </div>
              <div className="mono-label" style={{ marginTop: 4 }}>
                Grupo {t.group} · {t.confederation ?? 'Mundial 2026'}
              </div>
            </div>
            {row && (
              <div className="row gap-16">
                <Stat label="Pts" value={row.Pts} />
                <Stat label="G-E-P" value={`${row.W}-${row.D}-${row.L}`} />
                <Stat label="DG" value={fmtGD(row.GD)} />
                <div>
                  <div className="mono-label">Forma</div>
                  <div style={{ marginTop: 4 }}>
                    <Form list={row.form} />
                  </div>
                </div>
              </div>
            )}
            {coach?.name && (
              <a
                href={coach.pageUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="coach-chip"
                title="Ficha pública del entrenador"
              >
                {coach.photo ? <img src={coach.photo} alt={coach.name} loading="lazy" decoding="async" /> : null}
                <span>
                  <span className="mono-label">Entrenador</span>
                  <strong>{coach.name}</strong>
                </span>
              </a>
            )}
          </div>
          <KitStrip code={code} />
        </div>
      </div>

      <div className="row gap-6" style={{ marginBottom: 14 }}>
        {(['squad', 'fixtures', 'group'] as Tab[]).map((tb) => (
          <button key={tb} type="button" className={cn('pill', tab === tb && 'on')} onClick={() => setTab(tb)}>
            {tb === 'squad' ? 'Plantilla' : tb === 'fixtures' ? 'Partidos' : 'Grupo'}
          </button>
        ))}
      </div>

      {tab === 'squad' &&
        (squad.length ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            {squad.map((p) => (
              <PlayerCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <Empty icon="players" title="Sin plantilla" text="Las convocatorias oficiales se publican días antes del torneo." />
        ))}

      {tab === 'fixtures' && (
        <div className="card card-pad">
          {fixtures.length ? (
            fixtures.map((m) => <MatchRow key={m.id} m={m} />)
          ) : (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              Sin partidos.
            </p>
          )}
        </div>
      )}

      {tab === 'group' && (
        <div className="card">
          <div className="card-hd">
            <Icon name="standings" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Grupo {t.group}</h3>
            <span className="spacer" />
            <button type="button" className="card-link" onClick={() => navigate({ to: '/standings' })}>
              Todos los grupos
            </button>
          </div>
          <div className="card-pad">
            <StandingsTable rows={groupRows} highlight={code} />
          </div>
        </div>
      )}
    </div>
  );
}

function KitStrip({ code }: { code: string }) {
  const variants = (['home', 'away', 'third'] as TeamKitVariant[]).filter(
    (variant) => downloadedTeamKitVariantExts[code]?.[variant] || teamKitVariants[code]?.[variant],
  );
  if (variants.length <= 1) return null;
  const label: Record<TeamKitVariant, string> = {
    home: 'Local',
    away: 'Visita',
    third: 'Tercer',
    gk: 'Portero',
  };
  return (
    <div className="kit-strip">
      {variants.map((variant) => (
        <div key={variant} className="kit-variant">
          <TeamKit code={code} variant={variant} size={42} />
          <span className="mono-label">{label[variant]}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="mono-label">{label}</div>
      <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
        {value}
      </div>
    </div>
  );
}
