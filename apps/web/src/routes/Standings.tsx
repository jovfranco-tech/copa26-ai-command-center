import { Empty } from '@worldcup/ui';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import { StandingsTable } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { PreTournamentNotice } from '@/components/PreTournamentNotice';
import { useStandings } from '@/hooks';
import { useT } from '@/i18n';

export function Standings({ group }: { group?: string }) {
  const t = useT();
  const { data, isLoading } = useStandings();
  if (isLoading) return <p className="muted">{t('standings.loading')}</p>;
  const groups = data?.groups ?? {};
  const letters = Object.keys(groups).sort();
  const visible = group && groups[group] ? [group] : letters;

  if (!letters.length) return <Empty icon="standings" title={t('standings.emptyTitle')} text={t('standings.emptyText')} />;

  return (
    <div className="page-fade">
      <MockBanner />
      <PreTournamentNotice contextKey="standings" />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="zone-key">
          <span>
            <span className="zone-sw" style={{ background: 'var(--pos)' }} /> {t('standings.advance')}
          </span>
          <span>
            <span className="zone-sw" style={{ background: '#6ea0ff' }} /> {t('standings.bestThird')}
          </span>
          <span>
            <span className="zone-sw" style={{ background: 'var(--neg)' }} /> {t('standings.eliminated')}
          </span>
          <DataSourceBadge
            label={t('standings.recalculated')}
            source={data?.source === 'sqlite' ? t('standings.sqliteResults') : t('standings.localDataset')}
            date="2026-05-31"
            confidence="Alta"
          />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))' }}>
        {visible.map((g) => (
          <div key={g} className="card">
            <div className="card-hd">
              <h3>{t('standings.group', { g })}</h3>
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
