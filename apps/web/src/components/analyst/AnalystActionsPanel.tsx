import { Icon, type IconName } from '@worldcup/ui';
import { type PoolPick } from '@/store/pool';
import { type AnalystAnswer } from '@/lib/analyst';
import { type AIResult } from '@/lib/aiClient';

export type NativeAIAction =
  | 'conservative-pool'
  | 'compare-family'
  | 'uncertain-matches'
  | 'day-brief'
  | 'audit-picks'
  | 'family-learning'
  | 'compare-strategies'
  | 'ai-scorecard'
  | 'change-radar';

export interface PendingNativeAction {
  id: NativeAIAction;
  title: string;
  detail: string;
  picks?: Record<string, PoolPick>;
  question: string;
  answer: AnalystAnswer;
  meta: AIResult['meta'];
}

export function AIActionPanel({
  groupId,
  cloudStatus,
  onRun,
}: {
  groupId: string;
  cloudStatus: 'syncing' | 'synced' | 'error';
  onRun: (action: NativeAIAction) => void;
}) {
  const actions: Array<{ id: NativeAIAction; icon: IconName; title: string; text: string }> = [
    { id: 'day-brief', icon: 'sparkSmall', title: 'Resumen del día', text: 'Prioriza partido, clima, picks y acción.' },
    { id: 'conservative-pool', icon: 'target', title: 'Rellenar conservadora', text: 'Aplica picks de baja varianza por ranking.' },
    { id: 'audit-picks', icon: 'check', title: 'Auditar picks', text: 'Completa marcadores sin sobrescribir.' },
    { id: 'compare-family', icon: 'trophy', title: 'Comparar familia', text: 'Resume cobertura y tabla visible.' },
    { id: 'family-learning', icon: 'database', title: 'Aprender estilo', text: 'Detecta patrón de riesgo familiar.' },
    { id: 'compare-strategies', icon: 'stats', title: 'Comparar estrategias', text: 'Conservadora, agresiva y contraria.' },
    { id: 'change-radar', icon: 'activity', title: 'Radar de cambios', text: 'Explica por qué difiere un pick.' },
    { id: 'ai-scorecard', icon: 'shield', title: 'Medir IA', text: 'Puntúa estrategias cuando haya FT.' },
    { id: 'uncertain-matches', icon: 'activity', title: 'Detectar inciertos', text: 'Encuentra cruces parejos para revisar.' },
  ];
  return (
    <div className="ai-action-panel">
      <div className="ai-action-head">
        <div>
          <span className="mono-label">Acciones AI-native</span>
          <strong>Opera sobre quiniela y datos locales</strong>
        </div>
        <span className={`badge ${cloudStatus === 'synced' ? 'gold' : ''}`}>
          {cloudStatus === 'synced' ? `Memoria compartida · ${groupId}` : cloudStatus === 'syncing' ? 'Sincronizando memoria' : 'Memoria local activa'}
        </span>
      </div>
      <div className="ai-action-grid">
        {actions.map((action) => (
          <button key={action.id} type="button" className="ai-action-card" onClick={() => onRun(action.id)}>
            <Icon name={action.icon} size={15} />
            <strong>{action.title}</strong>
            <span>{action.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PendingNativeActionPanel({
  pending,
  onApply,
  onCancel,
}: {
  pending: PendingNativeAction | null;
  onApply: () => void;
  onCancel: () => void;
}) {
  if (!pending) return null;
  const entries = Object.entries(pending.picks ?? {});
  return (
    <div className="pending-ai-action">
      <div className="pending-ai-action-main">
        <Icon name="shield" size={15} />
        <div>
          <span className="mono-label">Previsualización antes de aplicar</span>
          <strong>{pending.title}</strong>
          <p>{pending.detail}</p>
        </div>
      </div>
      {entries.length ? (
        <div className="pending-pick-strip">
          {entries.slice(0, 5).map(([matchId, pick]) => (
            <span key={matchId}>
              <strong>{matchId}</strong> {pick.homeGoals ?? '-'}-{pick.awayGoals ?? '-'} · {pick.outcome ?? 'sin ganador'}
            </span>
          ))}
          {entries.length > 5 ? <span>+{entries.length - 5} más</span> : null}
        </div>
      ) : null}
      <div className="pending-ai-actions">
        <button type="button" className="btn gold" onClick={onApply}>
          <Icon name="check" size={14} /> Aplicar cambios
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          <Icon name="close" size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
}
