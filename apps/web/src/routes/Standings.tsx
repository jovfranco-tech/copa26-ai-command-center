import { Empty } from '@worldcup/ui';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import { StandingsTable } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { useStandings } from '@/hooks';

export function Standings({ group }: { group?: string }) {
  const { data, isLoading } = useStandings();
  if (isLoading) return <p className="muted">Cargando clasificación…</p>;
  const groups = data?.groups ?? {};
  const letters = Object.keys(groups).sort();
  const visible = group && groups[group] ? [group] : letters;

  if (!letters.length) return <Empty icon="standings" title="Sin clasificación" text="La tabla aparece cuando se jueguen los partidos." />;

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="zone-key">
          <span>
            <span className="zone-sw" style={{ background: 'var(--pos)' }} /> Avanzan (1–2)
          </span>
          <span>
            <span className="zone-sw" style={{ background: '#6ea0ff' }} /> Mejor tercero
          </span>
          <span>
            <span className="zone-sw" style={{ background: 'var(--neg)' }} /> Eliminado
          </span>
          <DataSourceBadge
            label="Tabla recalculada"
            source={data?.source === 'sqlite' ? 'Resultados SQLite' : 'Dataset local'}
            date="2026-05-31"
            confidence="Alta"
          />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))' }}>
        {visible.map((g) => (
          <div key={g} className="card">
            <div className="card-hd">
              <h3>Grupo {g}</h3>
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
