import { Icon } from '@worldcup/ui';
import { type PoolDiagnostics } from '@/lib/opsIntelligence';

export function FamilyLearningPanel({ diagnostics }: { diagnostics: PoolDiagnostics }) {
  const signals = [
    { label: 'Cobertura', value: `${diagnostics.coveragePct}%`, text: `${diagnostics.missingWinner} ganadores pendientes` },
    { label: 'Marcadores', value: `${diagnostics.scorePct}%`, text: `${diagnostics.missingScore} por cerrar` },
    { label: 'Estilo', value: diagnostics.styleLabel, text: diagnostics.styleDetail },
    { label: 'Estándar', value: diagnostics.leaderLabel, text: diagnostics.familySignal },
  ];
  return (
    <section className="family-learning-panel">
      <div className="family-learning-main">
        <Icon name="ai" size={16} />
        <div>
          <span className="mono-label">Aprendizaje</span>
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
