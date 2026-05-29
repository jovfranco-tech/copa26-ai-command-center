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

  if (isLoading) return <p className="muted">Loading venues…</p>;
  const venues = data?.items ?? [];
  const matches = matchData?.items ?? [];
  if (!venues.length) return <Empty icon="venues" title="No venues" text="Venue data appears once ingested." />;

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
                  <Meta label="Capacity" value={fmtInt(v.capacity)} />
                  <Meta label="Surface" value={v.surface} />
                  <Meta label="Matches" value={fixtures.length} />
                </div>
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                  onClick={() => setOpen(isOpen ? null : v.id)}
                >
                  {isOpen ? 'Hide fixtures' : 'Show fixtures'} <Icon name={isOpen ? 'chevD' : 'chevR'} size={13} />
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
                        No fixtures assigned.
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
  if (url) return <img src={url} alt={city} style={{ width: '100%', height: 120, objectFit: 'cover' }} />;
  return (
    <div
      style={{
        height: 120,
        background:
          'repeating-linear-gradient(90deg, color-mix(in srgb, var(--pos) 7%, var(--bg-1)) 0 9.09%, color-mix(in srgb, var(--pos) 4%, var(--bg-1)) 9.09% 18.18%)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--tx-3)',
      }}
    >
      <Icon name="venues" size={28} />
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
