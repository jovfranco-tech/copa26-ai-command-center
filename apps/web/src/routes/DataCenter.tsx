import { useEffect, useMemo, useState } from 'react';
import { fmtDateTime, fmtTime } from '@worldcup/shared';
import { Icon, Empty, type IconName } from '@worldcup/ui';
import { intelDataPacks, intelGeneratedAt, weatherMeta } from '@/generated/intelPacks';
import { playerRatingMeta } from '@/generated/playerRatings';
import {
  fetchAdminOps,
  fetchDataSyncCheck,
  fetchMonitoring,
  fetchPoolStatus,
  type AdminOpsSnapshot,
  type DataSyncCheck,
  type MonitoringSnapshot,
  type PoolPersistenceStatus,
} from '@/lib/api';
import { useMatches, usePlayers, useSyncStatus, useTeams, useVenues } from '@/hooks';
import { useT, type Translate } from '@/i18n';
import { buildDataReadiness, type DataReadiness } from '@/lib/opsIntelligence';
import { usePreferences } from '@/store/preferences';

function confLabel(c: string, t: Translate): string {
  return c === 'Alta' ? t('sourceBadge.high') : c === 'Media' ? t('sourceBadge.medium') : c === 'Manual' ? t('sourceBadge.manual') : t('sourceBadge.pending');
}

export function DataCenter() {
  const t = useT();
  const { data: sync } = useSyncStatus();
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  const { data: players } = usePlayers();
  const { data: venues } = useVenues();
  const role = usePreferences((s) => s.role);
  const [check, setCheck] = useState<DataSyncCheck | null>(null);
  const [poolStatus, setPoolStatus] = useState<PoolPersistenceStatus | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringSnapshot | null>(null);
  const [adminOps, setAdminOps] = useState<AdminOpsSnapshot | null>(null);
  const [checking, setChecking] = useState(false);

  const played = (matches?.items ?? []).filter((m) => m.status === 'FT').length;
  const upcoming = (matches?.items ?? []).filter((m) => m.status === 'UPCOMING').length;
  const estimatedRatings = playerRatingMeta.total - playerRatingMeta.resolved;
  const aiCallsToday = monitoring?.usage.items?.['ai.analyst'] ?? 0;
  const poolAgentCallsToday = monitoring?.usage.items?.['ai.pool-agent'] ?? 0;
  const readiness = useMemo(
    () =>
      buildDataReadiness({
        teams: teams?.count ?? 0,
        matches: matches?.count ?? 0,
        players: players?.count ?? 0,
        venues: venues?.count ?? 0,
        estimatedRatings,
        resultsSource: check?.resultsSource,
        poolDurable: poolStatus?.durable,
        aiConfigured: monitoring?.ai.configured,
        errors: check?.errors?.length ?? 0,
      }, t),
    [
      teams?.count,
      matches?.count,
      players?.count,
      venues?.count,
      estimatedRatings,
      check?.resultsSource,
      check?.errors?.length,
      poolStatus?.durable,
      monitoring?.ai.configured,
      t,
    ],
  );
  const roleUsage = useMemo(
    () => [
      { role: t('role.admin'), access: t('dc.accessAdmin'), limit: monitoring?.limits.analyst ?? '12 / 10 min', usage: aiCallsToday },
      { role: t('role.family'), access: t('dc.accessStandard'), limit: monitoring?.limits.poolAgent ?? '8 / 10 min', usage: poolAgentCallsToday },
      { role: t('role.guest'), access: t('dc.accessGuest'), limit: t('dc.noRemoteCalls'), usage: 0 },
    ],
    [aiCallsToday, poolAgentCallsToday, monitoring?.limits.analyst, monitoring?.limits.poolAgent, t],
  );

  const runCheck = async () => {
    setChecking(true);
    try {
      const [dataCheck, pool, usage, ops] = await Promise.all([
        fetchDataSyncCheck(),
        fetchPoolStatus(),
        fetchMonitoring(),
        fetchAdminOps(),
      ]);
      setCheck(dataCheck);
      setPoolStatus(pool.persistence);
      setMonitoring(usage);
      setAdminOps(ops);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void runCheck();
  }, []);

  return (
    <div className="page-fade">
      <div className="data-hero card">
        <div>
          <span className="mono-label">{t('titles.data')}</span>
          <h2>{t('dc.heroTitle')}</h2>
          <p>{t('dc.heroDesc')}</p>
        </div>
        <button type="button" className="btn gold" onClick={runCheck} disabled={checking}>
          <Icon name={checking ? 'activity' : 'cloud'} size={15} />
          {checking ? t('dc.checking') : t('dc.refreshNow')}
        </button>
      </div>

      <DataReadinessPanel readiness={readiness} checking={checking} onRunCheck={runCheck} />

      <div className="data-grid">
        <DataTile icon="teams" label={t('dc.teams')} value={teams?.count ?? 0} note={t('dc.calendar2026')} />
        <DataTile icon="calendar" label={t('dc.matches')} value={matches?.count ?? 0} note={t('dc.playedPending', { played, upcoming })} />
        <DataTile icon="players" label={t('dc.players')} value={players?.count ?? 0} note={t('dc.editableSquads')} />
        <DataTile icon="venues" label={t('dc.venues')} value={venues?.count ?? 0} note={t('dc.photosStadiums')} />
      </div>

      <div className="data-command-grid">
        <div className="card card-pad data-command-card">
          <Icon name="route" size={16} style={{ color: 'var(--gold)' }} />
          <span className="mono-label">{t('dc.resultsPipeline')}</span>
          <h3>{t('dc.readyForFeed')}</h3>
          <p>{t('dc.cronDesc')}</p>
          <div className="ops-metrics">
            <OpsMetric label={t('dc.cron')} value="12:00 UTC" />
            <OpsMetric label={t('dc.endpoint')} value="/api/data-sync" />
            <OpsMetric label={t('dc.errors')} value={String(check?.errors?.length ?? 0)} />
          </div>
        </div>
        <div className="card card-pad data-command-card">
          <Icon name="shield" size={16} style={{ color: 'var(--gold)' }} />
          <span className="mono-label">{t('dc.sourceTrust')}</span>
          <h3>{t('dc.sourcesByModule')}</h3>
          <div className="trust-source-list">
            <TrustSource label={t('dc.calendar')} source={t('dc.localVerified')} confidence="Alta" />
            <TrustSource label={t('dc.ratings')} source={playerRatingMeta.source} confidence={estimatedRatings ? 'Media' : 'Alta'} />
            <TrustSource label={t('dc.rankings')} source={t('dc.fifaApril')} confidence="Alta" />
            <TrustSource label={t('dc.weather')} source={t('dc.weatherBaseline')} confidence="Media" />
          </div>
        </div>
        <div className="card card-pad data-command-card">
          <Icon name="activity" size={16} style={{ color: 'var(--gold)' }} />
          <span className="mono-label">{t('dc.publicAccess')}</span>
          <h3>{t('dc.visibleGuardrails')}</h3>
          <p>{t('dc.guardrailsDesc')}</p>
          <div className="ops-metrics">
            <OpsMetric label={t('dc.analyst')} value={monitoring?.limits.analyst ?? '12 / 10 min'} />
            <OpsMetric label={t('dc.copilot')} value={monitoring?.limits.poolAgent ?? '8 / 10 min'} />
            <OpsMetric label={t('dc.scanner')} value={monitoring?.limits.poolScan ?? '6 / 10 min'} />
          </div>
        </div>
      </div>

      <div className="card data-ops-plan">
        <div className="card-hd">
          <Icon name="route" size={15} style={{ color: 'var(--gold)' }} />
          <h3>{t('dc.updatePlan')}</h3>
          <span className="spacer" />
          <span className="mono-label">{t('dc.readyLiveTournament')}</span>
        </div>
        <div className="card-pad data-ops-grid">
          <OpsPlanItem status={check?.resultsSource === 'configured' ? 'ok' : 'wait'} title={t('dc.officialResults')} source={check?.resultsSource === 'configured' ? t('dc.feedConnected') : t('dc.feedUrlPending')} action={check?.nextAction ?? t('dc.connectFeedAction')} />
          <OpsPlanItem status={estimatedRatings ? 'wait' : 'ok'} title={t('dc.finalCallups')} source={t('dc.localEditableSquads')} action={t('dc.replacePlayersAction')} />
          <OpsPlanItem status="wait" title={t('dc.h2hRefs')} source={t('dc.pipelineReady')} action={t('dc.loadAuthorizedAction')} />
          <OpsPlanItem status="ok" title={t('dc.weatherVenues')} source={t('dc.matchesBaseline', { n: weatherMeta.matchesCovered })} action={t('dc.forecastAction')} />
          <OpsPlanItem status={poolStatus?.durable ? 'ok' : 'wait'} title={t('dc.poolMultiDevice')} source={poolStatus?.label ?? t('dc.notReviewed')} action={poolStatus?.durable ? t('dc.poolReadyAction') : t('dc.poolVerifyAction')} />
        </div>
      </div>

      <AdminOpsPanel check={check} adminOps={adminOps} checking={checking} onRunCheck={runCheck} />

      <div className="card" style={{ border: '1px solid var(--gold)', marginTop: '16px', marginBottom: '16px' }}>
        <div className="card-hd">
          <Icon name="cloud" size={15} style={{ color: 'var(--gold)' }} />
          <h3 style={{ color: 'var(--gold)' }}>Cómo sincronizar partidos reales</h3>
        </div>
        <div className="card-pad">
          <p style={{ margin: '0 0 10px 0', lineHeight: 1.5, color: 'var(--tx)' }}>
            El sistema actualmente utiliza datos de demostración local para evitar errores. Para sincronizar tu tablero automáticamente con los goles y eventos del torneo en tiempo real:
          </p>
          <ol style={{ paddingLeft: '20px', margin: '0 0 10px 0', lineHeight: 1.6, color: 'var(--tx-2)' }}>
            <li>Consigue una API de resultados de fútbol (ej. <strong>API-Football</strong> o <strong>Sportradar</strong>) que devuelva un JSON válido.</li>
            <li>Entra a la configuración de este proyecto en tu panel de <strong>Vercel</strong>.</li>
            <li>Navega a <em>Settings &gt; Environment Variables</em>.</li>
            <li>Añade la variable <code>RESULTS_SOURCE_URL</code> y pega la URL de tu API como valor.</li>
            <li>Si tu API requiere autenticación por token, añade la variable <code>RESULTS_AUTH_TOKEN</code>.</li>
          </ol>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--tx-3)' }}>
            <em>Al guardarlo, el sistema descartará el simulador local y comenzará a actualizar el Estadio 3D, las tarjetas de partido y los grupos con los datos oficiales.</em>
          </p>
        </div>
      </div>

      <div className="card ai-native-ops">
        <div className="card-hd">
          <Icon name="ai" size={15} style={{ color: 'var(--gold)' }} />
          <h3>{t('dc.aiNativeOps')}</h3>
          <span className="spacer" />
          <span className="badge gold">{t(`role.${role}`)}</span>
        </div>
        <div className="card-pad ai-native-grid">
          <AINativeTile label={t('dc.model')} value={monitoring?.ai.configured ? t('dc.remoteAi') : t('dc.localFallback')} note={monitoring?.ai.configured ? t('dc.remoteConfigured') : t('dc.localIfNoKey')} />
          <AINativeTile label={t('dc.analystLimit')} value={monitoring?.limits.analyst ?? '30 / 10 min'} note={role === 'guest' ? t('dc.guestLocalEngine') : t('dc.protectUsage')} />
          <AINativeTile label={t('dc.tools')} value={t('dc.sevenConnected')} note={t('dc.toolsList')} />
          <AINativeTile label={t('dc.guardrail')} value={t('dc.noSimNews')} note={t('dc.copilotsDeclare')} />
          <AINativeTile label={t('dc.usageToday')} value={String(monitoring?.usage.items?.['ai.analyst'] ?? 0)} note={t('dc.metricsProvider', { provider: monitoring?.usage.provider ?? 'memory' })} />
        </div>
        <div className="card-pad role-usage-grid">
          {roleUsage.map((item) => (
            <RoleUsageTile key={item.role} {...item} />
          ))}
        </div>
      </div>

      <div className="card data-exec">
        <div className="card-hd">
          <Icon name="activity" size={15} style={{ color: 'var(--gold)' }} />
          <h3>{t('dc.execTrafficLight')}</h3>
          <span className="spacer" />
          <span className="mono-label">{t('dc.sourceDateConfidence')}</span>
        </div>
        <div className="card-pad exec-grid">
          <ExecSignal status="ok" title={t('dc.calendar')} source={t('matchMeta.localTournamentDataset')} date="2026-05-31" confidence="Alta" />
          <ExecSignal status={check?.resultsSource === 'configured' ? 'ok' : 'wait'} title={t('dc.results')} source={check?.resultsSource === 'configured' ? t('dc.feedAuthorized') : t('dc.feedUrlPending')} date={check?.checkedAt ?? t('dc.notReviewedDate')} confidence={check?.resultsSource === 'configured' ? 'Alta' : 'Pendiente'} />
          <ExecSignal status={estimatedRatings ? 'wait' : 'ok'} title={t('dc.ratings')} source={playerRatingMeta.source} date={playerRatingMeta.downloadedAt.slice(0, 10)} confidence={estimatedRatings ? 'Media' : 'Alta'} />
          <ExecSignal status={poolStatus?.durable ? 'ok' : 'wait'} title={t('dc.pool')} source={poolStatus?.label ?? t('dc.notReviewed')} date={check?.checkedAt ?? t('dc.notReviewedDate')} confidence={poolStatus?.durable ? 'Alta' : 'Pendiente'} />
          <ExecSignal status={monitoring?.ai.configured ? 'ok' : 'wait'} title={t('dc.ai')} source={monitoring?.ai.configured ? t('dc.remoteAi') : t('dc.providerPending')} date={monitoring?.usage.day ?? t('dc.notReviewedDate')} confidence={monitoring?.ai.configured ? 'Media' : 'Pendiente'} />
        </div>
      </div>

      <div className="grid data-columns">
        <div className="card">
          <div className="card-hd">
            <Icon name="cloud" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('dc.updateFlow')}</h3>
          </div>
          <div className="card-pad">
            <UpdateStep status="ok" title={t('dc.calendar')} text={t('dc.snapshotLocal', { matches: matches?.count ?? 0, venues: venues?.count ?? 0 })} />
            <UpdateStep status={played ? 'ok' : 'wait'} title={t('dc.results')} text={t('dc.resultsActivate')} />
            <UpdateStep status={played ? 'ok' : 'wait'} title={t('dc.tablesStats')} text={t('dc.recalcFromResults')} />
            <UpdateStep status="ok" title={t('dc.vercelCron')} text={t('dc.dailyReviewUtc')} />
            <UpdateStep status={check?.resultsSource === 'configured' ? 'ok' : 'wait'} title={t('dc.realFeed')} text={check?.nextAction ?? t('dc.feedPreparedAction')} />
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="shield" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('dc.reliability')}</h3>
          </div>
          <div className="card-pad">
            <div className="sync-row">
              <span className="k">{t('dc.baseSource')}</span>
              <span className="num">{sync?.source === 'sqlite' ? t('dashboard.sqliteLocal') : t('standings.localDataset')}</span>
            </div>
            <div className="sync-row">
              <span className="k">{t('dc.lastSync')}</span>
              <span className="num">{sync?.meta.lastSync ?? '—'}</span>
            </div>
            <div className="sync-row">
              <span className="k">{t('dc.ratingsFc26')}</span>
              <span className="num">{playerRatingMeta.resolved}/{playerRatingMeta.total}</span>
            </div>
            <div className="sync-row">
              <span className="k">{t('dc.estimatedRow')}</span>
              <span className="num">{estimatedRatings}</span>
            </div>
            <div className="sync-row">
              <span className="k">{t('dc.pool')}</span>
              <span className="num">{poolStatus?.label ?? t('dc.notReviewed')}</span>
            </div>
            <div className="sync-row">
              <span className="k">{t('dc.ai')}</span>
              <span className="num">{monitoring?.ai.configured ? t('dc.remoteAi') : t('dc.notVerified')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card data-packs">
        <div className="card-hd">
          <Icon name="download" size={15} style={{ color: 'var(--gold)' }} />
          <h3>{t('dc.downloadsData')}</h3>
          <span className="spacer" />
          <span className="mono-label">{fmtDateTime(intelGeneratedAt)}</span>
        </div>
        <div className="card-pad pack-grid">
          {intelDataPacks.map((pack) => (
            <div key={pack.id} className="pack-row">
              <span className={`pack-dot ${pack.status}`} />
              <div>
                <strong>{pack.label}</strong>
                <p>{pack.note}</p>
              </div>
              <span className="num">{pack.count}/{pack.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid data-columns">
        <div className="card">
          <div className="card-hd">
            <Icon name="database" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('dc.persistentPool')}</h3>
          </div>
          <div className="card-pad">
            <p className="muted" style={{ marginTop: 0 }}>
              {poolStatus?.detail ?? t('dc.poolStatusFallback')}
            </p>
            <UpdateStep status={poolStatus?.durable ? 'ok' : 'wait'} title={t('dc.sharedBase')} text={poolStatus?.durable ? t('dc.sharedReady') : t('dc.sharedVerify')} />
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="activity" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('dc.monitoring')}</h3>
          </div>
          <div className="card-pad">
            <div className="sync-row">
              <span className="k">{t('dc.provider')}</span>
              <span className="num">{monitoring?.usage.provider ?? '—'}</span>
            </div>
            {Object.entries(monitoring?.usage.items ?? {}).slice(0, 5).map(([key, value]) => (
              <div key={key} className="sync-row">
                <span className="k">{key}</span>
                <span className="num">{value}</span>
              </div>
            ))}
            <p className="muted" style={{ marginBottom: 0 }}>
              {t('dc.weatherMetricsNote', { n: weatherMeta.matchesCovered })}
            </p>
          </div>
        </div>
      </div>

      {check ? (
        <div className="card data-result">
          <div className="card-hd">
            <Icon name="check" size={15} style={{ color: 'var(--pos)' }} />
            <h3>{t('dc.lastManualCheck')}</h3>
            <span className="spacer" />
            <span className="mono-label">{fmtDateTime(check.checkedAt)}</span>
          </div>
          <div className="card-pad data-result-grid">
            <div>
              <span className="mono-label">{t('dc.statusLabel')}</span>
              <strong>{check.status}</strong>
            </div>
            <div>
              <span className="mono-label">{t('dc.cron')}</span>
              <strong>{check.cron}</strong>
            </div>
            <div>
              <span className="mono-label">{t('dc.results')}</span>
              <strong>{check.results}</strong>
            </div>
            <div>
              <span className="mono-label">{t('dc.nextActionLabel')}</span>
              <strong>{check.nextAction ?? '—'}</strong>
            </div>
          </div>
        </div>
      ) : (
        <Empty icon="cloud" title={t('dc.noManualCheckTitle')} text={t('dc.noManualCheckText')} />
      )}

      <div className="grid data-columns" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-hd">
            <Icon name="list" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('dc.updateLog')}</h3>
          </div>
          <div className="card-pad">
            {(check?.logs?.length ? check.logs : [t('dc.noRemoteLog')]).map((line) => (
              <div key={line} className="data-log-row">{line}</div>
            ))}
            {check?.errors?.length ? (
              <div className="data-error-box">
                {check.errors.map((error) => <span key={error}>{error}</span>)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="clock" size={15} style={{ color: 'var(--gold)' }} />
            <h3>{t('dc.changeHistory')}</h3>
          </div>
          <div className="card-pad">
            <ChangeItem title={t('dc.assetsIntel')} date={intelGeneratedAt} text={t('dc.assetsIntelText')} />
            <ChangeItem title={t('dc.ratings')} date={playerRatingMeta.downloadedAt} text={t('dc.ratingsChangeText', { resolved: playerRatingMeta.resolved, total: playerRatingMeta.total })} />
            <ChangeItem title={t('dc.weather')} date={weatherMeta.generatedAt} text={t('dc.weatherChangeText', { n: weatherMeta.matchesCovered })} />
            <ChangeItem title={t('dc.syncChange')} date={sync?.meta.lastSync ?? t('dc.noDate')} text={t('dc.syncChangeText')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DataReadinessPanel({
  readiness,
  checking,
  onRunCheck,
}: {
  readiness: DataReadiness;
  checking: boolean;
  onRunCheck: () => void;
}) {
  const t = useT();
  return (
    <section className={`data-readiness-panel ${readiness.status}`}>
      <div className="data-readiness-score">
        <span className="mono-label">{t('dc.operationalReadiness')}</span>
        <strong>{readiness.score}</strong>
        <p>{readiness.label}</p>
        <button type="button" className="btn gold" onClick={onRunCheck} disabled={checking}>
          <Icon name={checking ? 'activity' : 'cloud'} size={14} />
          {checking ? t('dc.checking') : t('dc.checkNow')}
        </button>
      </div>
      <div className="data-readiness-checks">
        {readiness.checks.map((check) => (
          <div key={check.id} className={`data-readiness-check ${check.status}`}>
            <span className={check.status === 'ok' ? 'dot-ok' : check.status === 'warn' ? 'dot-warn' : 'dot'} />
            <div>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="data-readiness-actions">
        <span className="mono-label">{t('dc.nextSteps')}</span>
        {readiness.nextActions.map((action) => (
          <p key={action}>{action}</p>
        ))}
      </div>
    </section>
  );
}

function ExecSignal({
  status,
  title,
  source,
  date,
  confidence,
}: {
  status: 'ok' | 'wait';
  title: string;
  source: string;
  date: string;
  confidence: string;
}) {
  const t = useT();
  return (
    <div className="exec-signal">
      <span className={status === 'ok' ? 'dot-ok' : 'dot-warn'} />
      <strong>{title}</strong>
      <span>{source}</span>
      <span className="mono-label">{date}</span>
      <span className="badge">{confLabel(confidence, t)}</span>
    </div>
  );
}

function ChangeItem({ title, date, text }: { title: string; date: string; text: string }) {
  return (
    <div className="change-item">
      <span className="mono-label">{date}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function OpsMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mono-label">{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

function TrustSource({ label, source, confidence }: { label: string; source: string; confidence: string }) {
  const t = useT();
  const ok = confidence === 'Alta';
  return (
    <div className="trust-source-row">
      <span className={ok ? 'dot-ok' : 'dot-warn'} />
      <div>
        <strong>{label}</strong>
        <p>{source}</p>
      </div>
      <span className="badge">{confLabel(confidence, t)}</span>
    </div>
  );
}

function AINativeTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="ai-native-tile">
      <span className="mono-label">{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

function AdminOpsPanel({
  check,
  adminOps,
  checking,
  onRunCheck,
}: {
  check: DataSyncCheck | null;
  adminOps: AdminOpsSnapshot | null;
  checking: boolean;
  onRunCheck: () => void;
}) {
  const t = useT();
  const errors = check?.errors ?? [];
  const ready = adminOps?.summary.ready ?? 0;
  const pending = adminOps?.summary.pending ?? 0;
  const blocked = adminOps?.summary.blocked ?? 0;
  return (
    <div className="card admin-ops-panel">
      <div className="admin-ops-main">
        <span className="mono-label">{t('dc.dataAdmin')}</span>
        <strong>{check?.status ?? t('dc.noManualCheck')}</strong>
        <p>{check?.nextAction ?? t('dc.runCheckAction')}</p>
      </div>
      <div className="admin-ops-grid">
        <OpsMetric label={t('dc.lastCheck')} value={check ? fmtTime(check.checkedAt) : t('data.pending')} />
        <OpsMetric label={t('dc.ready')} value={String(ready)} />
        <OpsMetric label={t('dc.pending')} value={`${pending}/${blocked}`} />
      </div>
      <div className="admin-ops-actions">
        <button type="button" className="btn gold" onClick={onRunCheck} disabled={checking}>
          <Icon name={checking ? 'activity' : 'cloud'} size={14} />
          {checking ? t('dc.checking') : t('dc.forceCheck')}
        </button>
        <span className={errors.length ? 'admin-ops-error' : 'admin-ops-ok'}>
          {errors.length ? errors.slice(0, 2).join(' · ') : t('dc.noErrors')}
        </span>
      </div>
      {check?.phases?.length ? (
        <div className="admin-phase-grid">
          {check.phases.map((phase) => (
            <div key={phase.id} className={`admin-phase ${phase.status}`}>
              <span className={phase.status === 'ok' ? 'dot-ok' : 'dot-warn'} />
              <div>
                <strong>{phase.label}</strong>
                <p>{phase.detail}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {adminOps?.actions.length ? (
        <div className="admin-action-grid">
          {adminOps.actions.map((action) => (
            <div key={action.id} className={`admin-action-card ${action.status}`}>
              <span className={action.status === 'ready' ? 'dot-ok' : action.status === 'blocked' ? 'dot-neg' : 'dot-warn'} />
              <div>
                <strong>{action.label}</strong>
                <p>{action.detail}</p>
                {action.command ? <code>{action.command}</code> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {adminOps?.dataGaps.length ? (
        <div className="admin-gap-grid">
          <span className="mono-label">{t('dc.officialPending')}</span>
          {adminOps.dataGaps.map((gap) => (
            <div key={gap.id} className="admin-gap-row">
              <strong>{gap.label}</strong>
              <p>{gap.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RoleUsageTile({ role, access, limit, usage }: { role: string; access: string; limit: string; usage: number }) {
  const t = useT();
  return (
    <div className="role-usage-tile">
      <span className="mono-label">{role}</span>
      <strong>{t('dc.callsToday', { n: usage })}</strong>
      <p>{access}</p>
      <small>{limit}</small>
    </div>
  );
}

function OpsPlanItem({
  status,
  title,
  source,
  action,
}: {
  status: 'ok' | 'wait';
  title: string;
  source: string;
  action: string;
}) {
  return (
    <div className="ops-plan-item">
      <span className={status === 'ok' ? 'dot-ok' : 'dot-warn'} />
      <div>
        <strong>{title}</strong>
        <p>{source}</p>
        <small>{action}</small>
      </div>
    </div>
  );
}

function DataTile({ icon, label, value, note }: { icon: IconName; label: string; value: number; note: string }) {
  return (
    <div className="card card-pad data-tile">
      <Icon name={icon} size={16} style={{ color: 'var(--gold)' }} />
      <span className="mono-label">{label}</span>
      <strong className="num">{value}</strong>
      <span>{note}</span>
    </div>
  );
}

function UpdateStep({ status, title, text }: { status: 'ok' | 'wait'; title: string; text: string }) {
  return (
    <div className="update-step">
      <span className={status === 'ok' ? 'dot-ok' : 'dot-warn'} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
