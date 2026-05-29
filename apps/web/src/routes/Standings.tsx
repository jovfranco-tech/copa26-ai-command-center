import { Empty } from '@worldcup/ui';
import { StandingsTable } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { useStandings } from '@/hooks';

export function Standings({ group }: { group?: string }) {
  const { data, isLoading } = useStandings();
  if (isLoading) return <p className="muted">Loading standings…</p>;
  const groups = data?.groups ?? {};
  const letters = Object.keys(groups).sort();
  const visible = group && groups[group] ? [group] : letters;

  if (!letters.length) return <Empty icon="standings" title="No standings" text="Standings appear once matches are played." />;

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="zone-key">
          <span>
            <span className="zone-sw" style={{ background: 'var(--pos)' }} /> Advance (1–2)
          </span>
          <span>
            <span className="zone-sw" style={{ background: '#6ea0ff' }} /> Best third
          </span>
          <span>
            <span className="zone-sw" style={{ background: 'var(--neg)' }} /> Eliminated
          </span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))' }}>
        {visible.map((g) => (
          <div key={g} className="card">
            <div className="card-hd">
              <h3>Group {g}</h3>
            </div>
            <div className="card-pad">
              <StandingsTable rows={groups[g] ?? []} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
