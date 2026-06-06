import { Icon } from '@worldcup/ui';
import { fmtDateTime } from '@worldcup/shared';
import { type AIMemoryRecord } from '@/lib/aiMemory';
import { useT } from '@/i18n';

export function AIMemoryPanel({
  records,
  onReuse,
  onClear,
}: {
  records: AIMemoryRecord[];
  onReuse: (record: AIMemoryRecord) => void;
  onClear: () => void;
}) {
  const t = useT();
  return (
    <div className="card ai-memory-panel">
      <div className="card-hd">
        <Icon name="database" size={15} style={{ color: 'var(--gold)' }} />
        <h3>{t('aiAnalyst.aiMemory')}</h3>
        <span className="spacer" />
        {records.length ? (
          <button type="button" className="card-link" onClick={onClear}>{t('amp.clear')}</button>
        ) : null}
      </div>
      <div className="card-pad">
        {!records.length ? (
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            {t('amp.empty')}
          </p>
        ) : (
          <div className="ai-memory-list">
            {records.slice(0, 6).map((record) => (
              <button key={record.id} type="button" className="ai-memory-row" onClick={() => onReuse(record)}>
                <span className="mono-label">{fmtDateTime(record.createdAt)}</span>
                <strong>{record.question}</strong>
                <small>
                  {record.mode === 'remote' ? record.model ?? t('dc.remoteAi') : record.mode === 'simulation' ? t('amp.simLocal') : t('amp.local')}
                  {' · '}
                  {record.entityType ?? t('amp.global')}
                  {' · '}
                  {record.confidence}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
