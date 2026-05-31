import { useState } from 'react';
import { Icon, Empty, type IconName } from '@worldcup/ui';
import { intelDataPacks, intelGeneratedAt, weatherMeta } from '@/generated/intelPacks';
import { playerRatingMeta } from '@/generated/playerRatings';
import {
  fetchDataSyncCheck,
  fetchMonitoring,
  fetchPoolStatus,
  type DataSyncCheck,
  type MonitoringSnapshot,
  type PoolPersistenceStatus,
} from '@/lib/api';
import { useMatches, usePlayers, useSyncStatus, useTeams, useVenues } from '@/hooks';

export function DataCenter() {
  const { data: sync } = useSyncStatus();
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  const { data: players } = usePlayers();
  const { data: venues } = useVenues();
  const [check, setCheck] = useState<DataSyncCheck | null>(null);
  const [poolStatus, setPoolStatus] = useState<PoolPersistenceStatus | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringSnapshot | null>(null);
  const [checking, setChecking] = useState(false);

  const played = (matches?.items ?? []).filter((m) => m.status === 'FT').length;
  const upcoming = (matches?.items ?? []).filter((m) => m.status === 'UPCOMING').length;
  const estimatedRatings = playerRatingMeta.total - playerRatingMeta.resolved;

  const runCheck = async () => {
    setChecking(true);
    try {
      const [dataCheck, pool, usage] = await Promise.all([
        fetchDataSyncCheck(),
        fetchPoolStatus(),
        fetchMonitoring(),
      ]);
      setCheck(dataCheck);
      setPoolStatus(pool.persistence);
      setMonitoring(usage);
    } finally {
      setChecking(false);
    }
  };

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

      <div className="data-grid">
        <DataTile icon="teams" label="Selecciones" value={teams?.count ?? 0} note="Calendario 2026" />
        <DataTile icon="calendar" label="Partidos" value={matches?.count ?? 0} note={`${played} jugados · ${upcoming} pendientes`} />
        <DataTile icon="players" label="Jugadores" value={players?.count ?? 0} note="Plantillas editables" />
        <DataTile icon="venues" label="Sedes" value={venues?.count ?? 0} note="Fotos y estadios" />
      </div>

      <div className="grid data-columns">
        <div className="card">
          <div className="card-hd">
            <Icon name="cloud" size={15} style={{ color: 'var(--gold)' }} />
            <h3>Flujo de actualización</h3>
          </div>
          <div className="card-pad">
            <UpdateStep status="ok" title="Calendario" text="Snapshot local de datos con 104 partidos y sedes." />
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
