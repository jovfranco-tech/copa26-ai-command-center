import { useState } from 'react';
import { Icon, Empty } from '@worldcup/ui';
import { fmtInt, fmtDay } from '@worldcup/shared';
import { TeamCrest } from '@/components/identity';
import { MockBanner } from '@/components/MockBanner';
import { useAsset, useMatches, useVenues } from '@/hooks';

export function Venues() {
  const { data, isLoading } = useVenues();
  const { data: matchData } = useMatches();
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) return <p className="muted">Cargando sedes…</p>;
  const venues = data?.items ?? [];
  const matches = matchData?.items ?? [];
  if (!venues.length) return <Empty icon="venues" title="Sin sedes" text="No hay sedes en el dataset." />;

  return (
    <div className="page-fade">
      <MockBanner />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>
        {venues.map((v) => {
          const fixtures = matches.filter((m) => m.venue === v.id);
          const isOpen = open === v.id;
          return (
            <div key={v.id} className="card" style={{ overflow: 'hidden' }}>
              <VenueImage assetId={v.imageAssetId} city={v.city} />
              <div className="card-pad">
                <div className="row gap-8">
                  <Icon name="pin" size={15} style={{ color: 'var(--gold)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{v.stadium}</div>
                    <div className="mono-label">
                      {v.city} · {v.country}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <Meta label="Aforo" value={fmtInt(v.capacity)} />
                  <Meta label="Superficie" value={v.surface} />
                  <Meta label="Partidos" value={fixtures.length} />
                </div>
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                  onClick={() => setOpen(isOpen ? null : v.id)}
                >
                  {isOpen ? 'Ocultar partidos' : 'Ver partidos'} <Icon name={isOpen ? 'chevD' : 'chevR'} size={13} />
                </button>
                {isOpen && (
                  <div style={{ marginTop: 8 }}>
                    {fixtures.length ? (
                      fixtures.map((m) => (
                        <div
                          key={m.id}
                          className="row gap-8"
                          style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}
                        >
                          <TeamCrest code={m.home} size={18} />
                          <span>{m.home}</span>
                          <span className="muted">vs</span>
                          <TeamCrest code={m.away} size={18} />
                          <span>{m.away}</span>
                          <span className="right mono-label" style={{ margin: 0 }}>
                            {fmtDay(m.date)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="muted" style={{ fontSize: 12.5 }}>
                        Sin partidos asignados.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VenueImage({ assetId, city }: { assetId: string | null | undefined; city: string }) {
  const url = useAsset(assetId);
  if (url) return <img src={url} alt={city} style={{ width: '100%', height: 132, objectFit: 'cover' }} />;
  // Stylized stadium illustration (original artwork — real photos are not used on
  // the public site for copyright reasons).
  return (
    <div style={{ height: 132, background: 'linear-gradient(180deg, #0e1626, #0a111d)', position: 'relative', overflow: 'hidden' }}>
      <svg viewBox="0 0 320 132" width="100%" height="132" preserveAspectRatio="xMidYMid slice" aria-label={`Estadio en ${city}`}>
        <defs>
          <radialGradient id="vlight" cx="50%" cy="20%" r="80%">
            <stop offset="0%" stopColor="rgba(201,162,75,0.18)" />
            <stop offset="100%" stopColor="rgba(201,162,75,0)" />
          </radialGradient>
        </defs>
        <rect width="320" height="132" fill="url(#vlight)" />
        {/* floodlights */}
        {[40, 280].map((x) => (
          <g key={x}>
            <rect x={x - 1.5} y="18" width="3" height="46" fill="#2a3550" />
            <rect x={x - 14} y="10" width="28" height="10" rx="2" fill="#3a4a66" />
          </g>
        ))}
        {/* stadium bowl */}
        <ellipse cx="160" cy="98" rx="150" ry="40" fill="#161f33" stroke="var(--line-2)" strokeWidth="1" />
        <ellipse cx="160" cy="98" rx="120" ry="30" fill="#0e1626" />
        {/* pitch */}
        <ellipse cx="160" cy="98" rx="96" ry="22" fill="#1c8a4d" opacity="0.85" />
        <rect x="64" y="96" width="192" height="4" fill="rgba(255,255,255,0.18)" transform="rotate(0 160 98)" />
        <circle cx="160" cy="98" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <line x1="160" y1="78" x2="160" y2="118" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      </svg>
      <Icon name="venues" size={16} style={{ position: 'absolute', top: 8, right: 8, color: 'var(--gold)' }} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="mono-label">{label}</div>
      <div className="num" style={{ fontWeight: 700, fontSize: 14 }}>
        {value}
      </div>
    </div>
  );
}
