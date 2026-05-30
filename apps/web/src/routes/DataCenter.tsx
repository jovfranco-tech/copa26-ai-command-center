import { useState } from 'react';
import { Icon, Empty, type IconName } from '@worldcup/ui';
import { playerRatingMeta } from '@/generated/playerRatings';
import { fetchDataSyncCheck, type DataSyncCheck } from '@/lib/api';
import { useMatches, usePlayers, useSyncStatus, useTeams, useVenues } from '@/hooks';

export function DataCenter() {
  const { data: sync } = useSyncStatus();
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  const { data: players } = usePlayers();
  const { data: venues } = useVenues();
  const [check, setCheck] = useState<DataSyncCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const played = (matches?.items ?? []).filter((m) => m.status === 'FT').length;
  const upcoming = (matches?.items ?? []).filter((m) => m.status === 'UPCOMING').length;
  const estimatedRatings = playerRatingMeta.total - playerRatingMeta.resolved;

  const runCheck = async () => {
    setChecking(true);
    try {
      setCheck(await fetchDataSyncCheck());
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
            <UpdateStep status="ok" title="Calendario" text="Snapshot local de openfootball con 104 partidos y sedes." />
            <UpdateStep status={played ? 'ok' : 'wait'} title="Resultados" text="Se activan cuando empiecen los partidos del 11 de junio de 2026." />
            <UpdateStep status={played ? 'ok' : 'wait'} title="Tablas y estadísticas" text="Se recalculan desde resultados reales cuando existan marcadores." />
            <UpdateStep status="ok" title="Cron Vercel" text="Revisión diaria a las 12:00 UTC en producción." />
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
