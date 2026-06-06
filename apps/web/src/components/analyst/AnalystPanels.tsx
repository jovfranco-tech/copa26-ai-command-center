import { Icon, type IconName } from '@worldcup/ui';
import { fmtDateTime, type Match as WorldCupMatch, type Team as WorldCupTeam } from '@worldcup/shared';
import { buildDayBrief } from '@/lib/opsIntelligence';
import { type AIMemoryRecord, type AICitation, type AIStructuredAnswer } from '@/lib/aiMemory';
import { type PoolPick } from '@/store/pool';
import { useT } from '@/i18n';

export function StructuredAnswerPanel({ structured }: { structured?: AIStructuredAnswer }) {
  const t = useT();
  if (!structured) return null;
  const cards: Array<{ key: keyof AIStructuredAnswer; label: string; icon: IconName; value?: string }> = [
    { key: 'prediction', label: t('ap.reading'), icon: 'target', value: structured.prediction },
    { key: 'risk', label: t('matchDetail.risk'), icon: 'shield', value: structured.risk },
    { key: 'confidence', label: t('matchDetail.confidence'), icon: 'activity', value: structured.confidence },
    { key: 'nextAction', label: t('dc.nextActionLabel'), icon: 'check', value: structured.nextAction },
  ];

  return (
    <div className="structured-answer-grid">
      {cards.filter((card) => card.value).map((card) => (
        <div key={card.key} className="structured-answer-card">
          <Icon name={card.icon} size={14} />
          <span className="mono-label">{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
      {structured.dataUsed?.length ? (
        <div className="structured-answer-card data-used">
          <Icon name="database" size={14} />
          <span className="mono-label">{t('ap.dataUsed')}</span>
          <div className="row gap-6 wrap">
            {structured.dataUsed.map((item) => (
              <span key={item} className="cite">{item}</span>
            ))}
          </div>
        </div>
      ) : null}
      {structured.ignoredData?.length || structured.rationale ? (
        <div className="structured-answer-card traceability">
          <Icon name="shield" size={14} />
          <span className="mono-label">{t('ap.traceability')}</span>
          {structured.rationale ? <strong>{structured.rationale}</strong> : null}
          {structured.ignoredData?.length ? (
            <div className="row gap-6 wrap">
              {structured.ignoredData.map((item) => (
                <span key={item} className="cite muted-cite">{item}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {structured.quality ? (
        <div className="structured-answer-card quality-check">
          <Icon name="check" size={14} />
          <span className="mono-label">{t('ap.autoEval')}</span>
          <strong>{structured.quality.score}/100 · {structured.quality.label}</strong>
          <div className="row gap-6 wrap">
            {structured.quality.flags.slice(0, 3).map((flag) => (
              <span key={flag} className="cite">{flag}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CitationGrid({ citations }: { citations?: AICitation[] }) {
  if (!citations?.length) return null;
  return (
    <div className="citation-grid">
      {citations.map((citation) => (
        <div key={`${citation.label}-${citation.value}`} className="citation-card">
          <span className="mono-label">{citation.label}</span>
          <strong>{citation.value}</strong>
          <p>{citation.source}</p>
          <div className="row gap-6 wrap">
            {citation.date ? <span className="cite">{citation.date}</span> : null}
            {citation.confidence ? <span className="cite">{citation.confidence}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DailyBriefPanel({
  matches,
  teams,
  picks,
  onRun,
}: {
  matches: WorldCupMatch[];
  teams: WorldCupTeam[];
  picks: Record<string, PoolPick>;
  onRun: () => void;
}) {
  const t = useT();
  const brief = buildDayBrief(matches, teams, picks, t);
  return (
    <div className="card ai-daily-brief">
      <div className="card-hd">
        <Icon name="sparkSmall" size={15} style={{ color: 'var(--gold)' }} />
        <h3>{t('ap.dailyBrief')}</h3>
        <span className="spacer" />
        <button type="button" className="card-link" onClick={onRun}>{t('ap.generate')}</button>
      </div>
      <div className="card-pad">
        <strong>{brief.title}</strong>
        <p>{brief.subtitle}</p>
        <div className="daily-brief-list">
          {brief.highlights.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <small>{brief.nextAction}</small>
      </div>
    </div>
  );
}

export function AIQualityHistory({ records }: { records: AIMemoryRecord[] }) {
  const scored = records.filter((record) => record.structured?.quality);
  const average = scored.length
    ? Math.round(scored.reduce((sum, record) => sum + (record.structured?.quality?.score ?? 0), 0) / scored.length)
    : 0;
  const flags = scored.flatMap((record) => record.structured?.quality?.flags ?? []).slice(0, 4);
  const t = useT();
  return (
    <div className="card ai-quality-history">
      <div className="card-hd">
        <Icon name="check" size={15} style={{ color: 'var(--gold)' }} />
        <h3>{t('ap.aiQuality')}</h3>
      </div>
      <div className="card-pad">
        <div className="ai-quality-score">
          <span className="mono-label">{t('ap.history')}</span>
          <strong>{scored.length ? `${average}/100` : t('ap.noData')}</strong>
          <p>{scored.length ? t('ap.evaluated', { n: scored.length }) : t('ap.qualityActivates')}</p>
        </div>
        {flags.length ? (
          <div className="row gap-6 wrap" style={{ marginTop: 8 }}>
            {flags.map((flag) => (
              <span key={flag} className="cite">{flag}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EntityInsightsPanel({ records, context }: { records: AIMemoryRecord[]; context: string }) {
  const t = useT();
  return (
    <div className="card ai-entity-panel">
      <div className="card-hd">
        <Icon name="activity" size={15} style={{ color: 'var(--gold)' }} />
        <h3>{t('ap.contextInsights')}</h3>
      </div>
      <div className="card-pad">
        {!records.length ? (
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            {t('ap.askAbout', { context: context.toLowerCase() })}
          </p>
        ) : (
          <div className="entity-insight-list">
            {records.map((record) => (
              <div key={record.id} className="entity-insight-row">
                <span className="mono-label">{fmtDateTime(record.createdAt)}</span>
                <strong>{record.structured?.prediction ?? record.question}</strong>
                <p>{record.structured?.nextAction ?? record.answer.slice(0, 120)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
