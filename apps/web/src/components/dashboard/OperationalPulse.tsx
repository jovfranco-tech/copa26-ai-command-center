import { useNavigate } from '@tanstack/react-router';
import { Icon, type IconName } from '@worldcup/ui';
import type { Match, Team } from '@worldcup/shared';
import { buildDayBrief, buildPoolDiagnostics } from '@/lib/opsIntelligence';
import { useT } from '@/i18n';
import type { PoolPick } from '@/store/pool';

function PulseTile({ icon, label, value, text }: { icon: IconName; label: string; value: string; text: string }) {
  return (
    <div className="ops-pulse-tile">
      <Icon name={icon} size={14} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </div>
  );
}

export function OperationalPulse({
  matches,
  teams,
  picks,
  favoritesCount,
}: {
  matches: Match[];
  teams: Team[];
  picks: Record<string, PoolPick>;
  favoritesCount: number;
}) {
  const navigate = useNavigate();
  const t = useT();
  const brief = buildDayBrief(matches, teams, picks, t);
  const diagnostics = buildPoolDiagnostics(matches, picks, [], '', t);
  return (
    <section className="ops-pulse-board">
      <div className="ops-pulse-main">
        <span className="mono-label">{t('opsPulse.title')}</span>
        <strong>{brief.title}</strong>
        <p>{brief.subtitle}</p>
        <div className="ops-pulse-actions">
          <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
            <Icon name="trophy" size={14} /> {t('opsPulse.completePool')}
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/analyst' })}>
            <Icon name="ai" size={14} /> {t('opsPulse.askAiPlan')}
          </button>
        </div>
      </div>
      <div className="ops-pulse-grid">
        <PulseTile icon="target" label={t('opsPulse.picks')} value={`${diagnostics.coveragePct}%`} text={diagnostics.recommendedAction} />
        <PulseTile icon="activity" label={t('opsPulse.scores')} value={`${diagnostics.scorePct}%`} text={t('opsPulse.toClose', { n: diagnostics.missingScore })} />
        <PulseTile icon="star" label={t('dashboard.favorites')} value={String(favoritesCount)} text={favoritesCount ? t('opsPulse.personalAlerts') : t('opsPulse.addTracking')} />
        <PulseTile icon="sparkSmall" label={t('opsPulse.aiNext')} value={t('opsPulse.oneAction')} text={brief.nextAction} />
      </div>
    </section>
  );
}
