import { useMemo, useState } from 'react';
import { Pill, Empty } from '@worldcup/ui';
import { GROUP_LETTERS, type StandingRow } from '@worldcup/shared';
import { TeamCard } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { useStandings, useTeams } from '@/hooks';
import { useT } from '@/i18n';

export function Teams() {
  const t = useT();
  const { data, isLoading } = useTeams();
  const { data: standings } = useStandings();
  const [group, setGroup] = useState('');

  const standingByCode = useMemo(() => {
    const map: Record<string, StandingRow> = {};
    for (const rows of Object.values(standings?.groups ?? {})) for (const r of rows) map[r.team] = r;
    return map;
  }, [standings]);

  const teams = (data?.items ?? []).filter((tm) => !group || tm.group === group);

  return (
    <div className="page-fade" aria-busy={isLoading}>
      <MockBanner />
      <div className="row gap-8 wrap filter-sticky" style={{ marginBottom: 16 }}>
        <Pill on={!group} onClick={() => setGroup('')}>
          {t('teams.all')}
        </Pill>
        {GROUP_LETTERS.map((g) => (
          <Pill key={g} on={group === g} onClick={() => setGroup(g)}>
            {t('cards.group', { g })}
          </Pill>
        ))}
      </div>

      {isLoading ? (
        <p className="muted">{t('teams.loading')}</p>
      ) : teams.length === 0 ? (
        <Empty icon="teams" title={t('teams.emptyTitle')} text={t('teams.emptyText')} />
      ) : (
        <div className="grid team-grid">
          {teams.map((tm) => (
            <TeamCard key={tm.code} code={tm.code} standing={standingByCode[tm.code]} />
          ))}
        </div>
      )}
    </div>
  );
}
