import { useMemo, useState } from 'react';
import { Pill, Empty } from '@worldcup/ui';
import { GROUP_LETTERS, type StandingRow } from '@worldcup/shared';
import { TeamCard } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { useStandings, useTeams } from '@/hooks';

export function Teams() {
  const { data, isLoading } = useTeams();
  const { data: standings } = useStandings();
  const [group, setGroup] = useState('');

  const standingByCode = useMemo(() => {
    const map: Record<string, StandingRow> = {};
    for (const rows of Object.values(standings?.groups ?? {})) for (const r of rows) map[r.team] = r;
    return map;
  }, [standings]);

  const teams = (data?.items ?? []).filter((t) => !group || t.group === group);

  return (
    <div className="page-fade">
      <MockBanner />
      <div className="row gap-8 wrap" style={{ marginBottom: 16 }}>
        <Pill on={!group} onClick={() => setGroup('')}>
          Todas
        </Pill>
        {GROUP_LETTERS.map((g) => (
          <Pill key={g} on={group === g} onClick={() => setGroup(g)}>
            Grupo {g}
          </Pill>
        ))}
      </div>

      {isLoading ? (
        <p className="muted">Cargando selecciones…</p>
      ) : teams.length === 0 ? (
        <Empty icon="teams" title="Sin selecciones" text="No hay selecciones en el dataset." />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {teams.map((t) => (
            <TeamCard key={t.code} code={t.code} standing={standingByCode[t.code]} />
          ))}
        </div>
      )}
    </div>
  );
}
