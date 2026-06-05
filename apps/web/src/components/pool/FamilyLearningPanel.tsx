import { Icon } from '@worldcup/ui';
import { type PoolDiagnostics } from '@/lib/opsIntelligence';
import { useT } from '@/i18n';

export function FamilyLearningPanel({ diagnostics }: { diagnostics: PoolDiagnostics }) {
  const t = useT();
  const signals = [
    { label: t('pool.flCoverage'), value: `${diagnostics.coveragePct}%`, text: t('pool.flWinnersPending', { n: diagnostics.missingWinner }) },
    { label: t('pool.scores'), value: `${diagnostics.scorePct}%`, text: t('opsPulse.toClose', { n: diagnostics.missingScore }) },
    { label: t('pool.flStyle'), value: diagnostics.styleLabel, text: diagnostics.styleDetail },
    { label: t('role.family'), value: diagnostics.leaderLabel, text: diagnostics.familySignal },
  ];
  return (
    <section className="family-learning-panel">
      <div className="family-learning-main">
        <Icon name="ai" size={16} />
        <div>
          <span className="mono-label">{t('pool.flLearning')}</span>
          <strong>{diagnostics.recommendedAction}</strong>
        </div>
      </div>
      <div className="family-learning-grid">
        {signals.map((signal) => (
          <div key={signal.label} className="family-learning-card">
            <span className="mono-label">{signal.label}</span>
            <strong>{signal.value}</strong>
            <small>{signal.text}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
