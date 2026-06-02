import { useEffect, useMemo, useState } from 'react';
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
import { buildDataReadiness, type DataReadiness } from '@/lib/opsIntelligence';
import { usePreferences } from '@/store/preferences';

export function DataCenter() {
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
      }),
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
    ],
  );
  const roleUsage = useMemo(
    () => [
      { role: 'Admin', access: 'IA remota + actualización manual', limit: monitoring?.limits.analyst ?? '30 / 10 min', usage: aiCallsToday },
      { role: 'Familia', access: 'Analista limitado + quiniela', limit: monitoring?.limits.poolAgent ?? 'Protegido por endpoint', usage: poolAgentCallsToday },
      { role: 'Invitado', access: 'Solo motor local', limit: '0 llamadas remotas', usage: 0 },
    ],
    [aiCallsToday, poolAgentCallsToday, monitoring?.limits.analyst, monitoring?.limits.poolAgent],
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
          <span className="mono-label">Centro de datos</span>
          <h2>Actualizaciones claras antes y durante el Mundial</h2>
          <p>
            El calendario base vive en el dataset local. El cron diario revisa salud del flujo; cuando haya resultados,
            se reingestan datos y se redeploya para actualizar tablas, estadísticas y analista.
          </p>
        </div>
        <button type="button" className="btn gold" onClick={runCheck} disabled={checking}>
          <Icon name={checking ? 'activity' : 'cloud'} size={15} />
          {checking ? 'Revisando…' : 'Actualizar ahora'}
        </button>
      </div>

      <DataReadinessPanel readiness={readiness} checking={checking} onRunCheck={runCheck} />

      <div className="data-grid">
        <DataTile icon="teams" label="Selecciones" value={teams?.count ?? 0} note="Calendario 2026" />
        <DataTile icon="calendar" label="Partidos" value={matches?.count ?? 0} note={`${played} jugados · ${upcoming} pendientes`} />
        <DataTile icon="players" label="Jugadores" value={players?.count ?? 0} note="Plantillas editables" />
        <DataTile icon="venues" label="Sedes" value={venues?.count ?? 0} note="Fotos y estadios" />
      </div>

      <div className="data-command-grid">
        <div className="card card-pad data-command-card">
          <Icon name="route" size={16} style={{ color: 'var(--gold)' }} />
          <span className="mono-label">Pipeline de resultados</span>
          <h3>Preparado para feed real</h3>
          <p>
            El cron revisa salud todos los dias. Cuando exista un feed autorizado, `RESULTS_SOURCE_URL` activa ingesta,
            recalculo de tablas, historial y tarjetas de partido.
          </p>
          <div className="ops-metrics">
            <OpsMetric label="Cron" value="12:00 UTC" />
            <OpsMetric label="Endpoint" value="/api/data-sync" />
            <OpsMetric label="Errores" value={String(check?.errors?.length ?? 0)} />
          </div>
        </div>
        <div className="card card-pad data-command-card">
          <Icon name="shield" size={16} style={{ color: 'var(--gold)' }} />
          <span className="mono-label">Origen y confianza</span>
          <h3>Fuentes visibles por módulo</h3>
          <div className="trust-source-list">
            <TrustSource label="Calendario" source="Dataset local verificado" confidence="Alta" />
            <TrustSource label="Ratings" source={playerRatingMeta.source} confidence={estimatedRatings ? 'Media' : 'Alta'} />
            <TrustSource label="Rankings" source="FIFA API · abril 2026" confidence="Alta" />
            <TrustSource label="Clima" source="Baseline historico por sede" confidence="Media" />
          </div>
        </div>
        <div className="card card-pad data-command-card">
          <Icon name="activity" size={16} style={{ color: 'var(--gold)' }} />
          <span className="mono-label">Admin manual</span>
          <h3>Control de operación</h3>
          <p>
            Usa el botón de actualización para comprobar producción, Firestore, consumo de IA y próximos pasos antes de
            compartir el link familiar.
          </p>
          <button type="button" className="btn ghost" onClick={runCheck} disabled={checking}>
            <Icon name={checking ? 'sparkSmall' : 'cloud'} size={14} />
            {checking ? 'Revisando...' : 'Revisar producción'}
          </button>
        </div>
      </div>

      <div className="card data-ops-plan">
        <div className="card-hd">
          <Icon name="route" size={15} style={{ color: 'var(--gold)' }} />
          <h3>Plan de actualización real</h3>
          <span className="spacer" />
          <span className="mono-label">Listo para torneo en vivo</span>
        </div>
        <div className="card-pad data-ops-grid">
          <OpsPlanItem status={check?.resultsSource === 'configured' ? 'ok' : 'wait'} title="Resultados oficiales" source={check?.resultsSource === 'configured' ? 'Feed autorizado conectado' : 'RESULTS_SOURCE_URL pendiente'} action={check?.nextAction ?? 'Conectar feed cuando exista proveedor confiable.'} />
          <OpsPlanItem status={estimatedRatings ? 'wait' : 'ok'} title="Convocatorias finales" source="Plantillas locales editables" action="Reemplazar jugadores cuando cada selección publique lista final." />
          <OpsPlanItem status="wait" title="H2H y árbitros" source="Pipeline preparado" action="Cargar fuente autorizada; no se inventan árbitros ni historial." />
          <OpsPlanItem status="ok" title="Clima y sedes" source={`${weatherMeta.matchesCovered} partidos con baseline`} action="Cambiar a forecast cercano cuando falten menos días." />
          <OpsPlanItem status={poolStatus?.durable ? 'ok' : 'wait'} title="Quiniela multi-dispositivo" source={poolStatus?.label ?? 'Sin revisar'} action={poolStatus?.durable ? 'Lista para familia; monitorear reglas y consumo.' : 'Verificar persistencia antes de compartir.'} />
        </div>
      </div>

      <AdminOpsPanel check={check} adminOps={adminOps} checking={checking} onRunCheck={runCheck} />

      <div className="card ai-native-ops">
        <div className="card-hd">
          <Icon name="ai" size={15} style={{ color: 'var(--gold)' }} />
          <h3>AI native operativo</h3>
          <span className="spacer" />
          <span className="badge gold">{role === 'admin' ? 'Admin' : role === 'family' ? 'Familia' : 'Invitado'}</span>
        </div>
        <div className="card-pad ai-native-grid">
          <AINativeTile label="Modelo" value={monitoring?.ai.configured ? monitoring.ai.model : 'Local fallback'} note={monitoring?.ai.configured ? 'Proveedor remoto configurado.' : 'Responde con analista local si falta clave.'} />
          <AINativeTile label="Limite analista" value={monitoring?.limits.analyst ?? '30 / 10 min'} note={role === 'guest' ? 'Modo invitado usa motor local.' : 'Protege consumo cuando compartes link.'} />
          <AINativeTile label="Herramientas" value="7 conectadas" note="Calendario, equipos, jugadores, sedes, tablas, adjuntos y memoria." />
          <AINativeTile label="Uso hoy" value={String(monitoring?.usage.items?.['ai.analyst'] ?? 0)} note={`Proveedor de métricas: ${monitoring?.usage.provider ?? 'memory'}.`} />
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
          <h3>Semaforo ejecutivo</h3>
          <span className="spacer" />
          <span className="mono-label">Fuente · fecha · confianza</span>
        </div>
        <div className="card-pad exec-grid">
          <ExecSignal status="ok" title="Calendario" source="Dataset local del torneo" date="2026-05-31" confidence="Alta" />
          <ExecSignal status={check?.resultsSource === 'configured' ? 'ok' : 'wait'} title="Resultados" source={check?.resultsSource === 'configured' ? 'Feed autorizado' : 'RESULTS_SOURCE_URL pendiente'} date={check?.checkedAt ?? 'Sin revision'} confidence={check?.resultsSource === 'configured' ? 'Alta' : 'Pendiente'} />
          <ExecSignal status={estimatedRatings ? 'wait' : 'ok'} title="Ratings" source={playerRatingMeta.source} date={playerRatingMeta.downloadedAt.slice(0, 10)} confidence={estimatedRatings ? 'Media' : 'Alta'} />
          <ExecSignal status={poolStatus?.durable ? 'ok' : 'wait'} title="Quiniela" source={poolStatus?.label ?? 'Sin revisar'} date={check?.checkedAt ?? 'Sin revision'} confidence={poolStatus?.durable ? 'Alta' : 'Pendiente'} />
          <ExecSignal status={monitoring?.ai.configured ? 'ok' : 'wait'} title="IA" source={monitoring?.ai.model ?? 'Proveedor pendiente'} date={monitoring?.usage.day ?? 'Sin revision'} confidence={monitoring?.ai.configured ? 'Media' : 'Pendiente'} />
        </div>
      </div>

      <div className="grid data-columns">
        <div className="card">
          <div className="card-hd">
            <Icon name="cloud" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Flujo de actualización</h3>
          </div>
          <div className="card-pad">
            <UpdateStep status="ok" title="Calendario" text={`Snapshot local de datos con ${matches?.count ?? 0} partidos y ${venues?.count ?? 0} sedes.`} />
            <UpdateStep status={played ? 'ok' : 'wait'} title="Resultados" text="Se activan cuando empiecen los partidos del 11 de junio de 2026." />
            <UpdateStep status={played ? 'ok' : 'wait'} title="Tablas y estadísticas" text="Se recalculan desde resultados reales cuando existan marcadores." />
            <UpdateStep status="ok" title="Cron Vercel" text="Revisión diaria a las 12:00 UTC en producción." />
            <UpdateStep status={check?.resultsSource === 'configured' ? 'ok' : 'wait'} title="Feed real" text={check?.nextAction ?? 'Preparado para RESULTS_SOURCE_URL cuando exista un feed autorizado.'} />
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="shield" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Confiabilidad</h3>
          </div>
          <div className="card-pad">
            <div className="sync-row">
              <span className="k">Fuente base</span>
              <span className="num">{sync?.source === 'sqlite' ? 'SQLite local' : 'Dataset local'}</span>
            </div>
            <div className="sync-row">
              <span className="k">Última sync</span>
              <span className="num">{sync?.meta.lastSync ?? '—'}</span>
            </div>
            <div className="sync-row">
              <span className="k">Ratings FC 26</span>
              <span className="num">{playerRatingMeta.resolved}/{playerRatingMeta.total}</span>
            </div>
            <div className="sync-row">
              <span className="k">Estimados</span>
              <span className="num">{estimatedRatings}</span>
            </div>
            <div className="sync-row">
              <span className="k">Quiniela</span>
              <span className="num">{poolStatus?.label ?? 'Sin revisar'}</span>
            </div>
            <div className="sync-row">
              <span className="k">IA</span>
              <span className="num">{monitoring?.ai.configured ? monitoring.ai.model : 'No verificada'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card data-packs">
        <div className="card-hd">
          <Icon name="download" size={15} style={{ color: 'var(--gold)' }} />
          <h3>Descargas y datos preparados</h3>
          <span className="spacer" />
          <span className="mono-label">{new Date(intelGeneratedAt).toLocaleString()}</span>
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
            <h3>Quiniela persistente</h3>
          </div>
          <div className="card-pad">
            <p className="muted" style={{ marginTop: 0 }}>
              {poolStatus?.detail ?? 'Pulsa actualizar ahora para verificar si producción ya tiene una base remota durable.'}
            </p>
            <UpdateStep status={poolStatus?.durable ? 'ok' : 'wait'} title="Base compartida" text={poolStatus?.durable ? 'Lista para varios dispositivos.' : 'Revisa las reglas de Firestore antes de compartir el link.'} />
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <Icon name="activity" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Monitoreo</h3>
          </div>
          <div className="card-pad">
            <div className="sync-row">
              <span className="k">Proveedor</span>
              <span className="num">{monitoring?.usage.provider ?? '—'}</span>
            </div>
            {Object.entries(monitoring?.usage.items ?? {}).slice(0, 5).map(([key, value]) => (
              <div key={key} className="sync-row">
                <span className="k">{key}</span>
                <span className="num">{value}</span>
              </div>
            ))}
            <p className="muted" style={{ marginBottom: 0 }}>
              {weatherMeta.matchesCovered} partidos con clima base; cron y endpoints emiten métricas para logs/KV.
            </p>
          </div>
        </div>
      </div>

      {check ? (
        <div className="card data-result">
          <div className="card-hd">
            <Icon name="check" size={15} style={{ color: 'var(--pos)' }} />
            <h3>Última revisión manual</h3>
            <span className="spacer" />
            <span className="mono-label">{new Date(check.checkedAt).toLocaleString()}</span>
          </div>
          <div className="card-pad data-result-grid">
            <div>
              <span className="mono-label">Estado</span>
              <strong>{check.status}</strong>
            </div>
            <div>
              <span className="mono-label">Cron</span>
              <strong>{check.cron}</strong>
            </div>
            <div>
              <span className="mono-label">Resultados</span>
              <strong>{check.results}</strong>
            </div>
            <div>
              <span className="mono-label">Siguiente acción</span>
              <strong>{check.nextAction ?? '—'}</strong>
            </div>
          </div>
        </div>
      ) : (
        <Empty icon="cloud" title="Sin revisión manual todavía" text="Pulsa actualizar ahora para comprobar el flujo de datos desde producción." />
      )}

      <div className="grid data-columns" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-hd">
            <Icon name="list" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Log de actualizacion</h3>
          </div>
          <div className="card-pad">
            {(check?.logs?.length ? check.logs : ['Sin log remoto todavia. Ejecuta Actualizar ahora.']).map((line) => (
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
            <h3>Historial de cambios</h3>
          </div>
          <div className="card-pad">
            <ChangeItem title="Assets e intel" date={intelGeneratedAt} text="Fotos, kits, clima, sedes, entrenadores y packs de datos regenerados." />
            <ChangeItem title="Ratings" date={playerRatingMeta.downloadedAt} text={`${playerRatingMeta.resolved}/${playerRatingMeta.total} ratings FC 26 cargados; el resto queda estimado.`} />
            <ChangeItem title="Clima" date={weatherMeta.generatedAt} text={`${weatherMeta.matchesCovered} partidos con baseline historico.`} />
            <ChangeItem title="Sync" date={sync?.meta.lastSync ?? 'Sin fecha'} text="Calendario base y tablas se recalculan desde resultados cuando existan marcadores." />
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
  return (
    <section className={`data-readiness-panel ${readiness.status}`}>
      <div className="data-readiness-score">
        <span className="mono-label">Preparación operativa</span>
        <strong>{readiness.score}</strong>
        <p>{readiness.label}</p>
        <button type="button" className="btn gold" onClick={onRunCheck} disabled={checking}>
          <Icon name={checking ? 'activity' : 'cloud'} size={14} />
          {checking ? 'Revisando...' : 'Revisar ahora'}
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
        <span className="mono-label">Siguientes pasos</span>
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
  return (
    <div className="exec-signal">
      <span className={status === 'ok' ? 'dot-ok' : 'dot-warn'} />
      <strong>{title}</strong>
      <span>{source}</span>
      <span className="mono-label">{date}</span>
      <span className="badge">{confidence}</span>
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
  const ok = confidence === 'Alta';
  return (
    <div className="trust-source-row">
      <span className={ok ? 'dot-ok' : 'dot-warn'} />
      <div>
        <strong>{label}</strong>
        <p>{source}</p>
      </div>
      <span className="badge">{confidence}</span>
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
  const errors = check?.errors ?? [];
  const ready = adminOps?.summary.ready ?? 0;
  const pending = adminOps?.summary.pending ?? 0;
  const blocked = adminOps?.summary.blocked ?? 0;
  return (
    <div className="card admin-ops-panel">
      <div className="admin-ops-main">
        <span className="mono-label">Admin de datos</span>
        <strong>{check?.status ?? 'Sin revisión manual'}</strong>
        <p>{check?.nextAction ?? 'Ejecuta una revisión para validar cron, feed, Firestore y límites de IA.'}</p>
      </div>
      <div className="admin-ops-grid">
        <OpsMetric label="Última revisión" value={check ? new Date(check.checkedAt).toLocaleTimeString() : 'Pendiente'} />
        <OpsMetric label="Listas" value={String(ready)} />
        <OpsMetric label="Pendientes" value={`${pending}/${blocked}`} />
      </div>
      <div className="admin-ops-actions">
        <button type="button" className="btn gold" onClick={onRunCheck} disabled={checking}>
          <Icon name={checking ? 'activity' : 'cloud'} size={14} />
          {checking ? 'Revisando...' : 'Forzar revisión'}
        </button>
        <span className={errors.length ? 'admin-ops-error' : 'admin-ops-ok'}>
          {errors.length ? errors.slice(0, 2).join(' · ') : 'Sin errores reportados'}
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
          <span className="mono-label">Pendientes oficiales</span>
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
  return (
    <div className="role-usage-tile">
      <span className="mono-label">{role}</span>
      <strong>{usage} llamadas hoy</strong>
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
