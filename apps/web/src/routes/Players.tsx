import { Icon, Pill, Empty } from '@worldcup/ui';
import { POSITIONS } from '@worldcup/shared';
import { PlayerCard } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { playerRatingMeta } from '@/generated/playerRatings';
import { usePlayers, useTeams } from '@/hooks';
import { usePlayerFilters } from '@/store/filters';

export function Players() {
  const f = usePlayerFilters();
  const { data: teamsData } = useTeams();
  const { data, isLoading } = usePlayers({ q: f.q, team: f.team, pos: f.pos });
  const players = data?.items ?? [];

  return (
    <div className="page-fade">
      <MockBanner />

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="searchbox" style={{ marginLeft: 0, marginBottom: 10, maxWidth: 360 }}>
          <Icon name="search" size={15} />
          <input
            aria-label="Buscar jugadores"
            placeholder="Buscar jugadores o clubes…"
            value={f.q}
            onChange={(e) => f.set({ q: e.target.value })}
          />
          {f.q && (
            <button type="button" className="fav-btn" onClick={() => f.set({ q: '' })} aria-label="Limpiar">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        <div className="row gap-8 wrap" style={{ marginBottom: 8 }}>
          <Pill on={!f.pos} onClick={() => f.set({ pos: '' })}>
            Todas las posiciones
          </Pill>
          {POSITIONS.map((p) => (
            <Pill key={p} on={f.pos === p} onClick={() => f.set({ pos: p })}>
              {p}
            </Pill>
          ))}
        </div>
        <div className="row gap-8 wrap">
          <Pill on={!f.team} onClick={() => f.set({ team: '' })}>
            Todas las selecciones
          </Pill>
          {(teamsData?.items ?? []).map((t) => (
            <Pill key={t.code} on={f.team === t.code} onClick={() => f.set({ team: t.code })}>
              {t.code}
            </Pill>
          ))}
        </div>
        <div className="ratings-note">
          <span className="rating-source fc26">FC 26</span>
          <span>
            {playerRatingMeta.resolved}/{playerRatingMeta.total} ratings reales cercanos desde base pública FC 26.
          </span>
          <span className="rating-source estimate">Estimado</span>
          <span>{playerRatingMeta.total - playerRatingMeta.resolved} jugadores con modelo por club/selección.</span>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="mono-label">{players.length} jugadores</span>
        {(f.q || f.team || f.pos) && (
          <button type="button" className="card-link" onClick={() => f.reset()}>
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <PlayersSkeleton />
      ) : players.length === 0 ? (
        <Empty icon="players" title="Sin jugadores" text="Las plantillas oficiales aún no se publican (se anuncian días antes del torneo)." />
      ) : (
        <div className="grid player-grid">
          {players.map((p) => (
            <PlayerCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayersSkeleton() {
  return (
    <div className="grid player-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="card player-card" style={{ pointerEvents: 'none' }}>
          <div className="row gap-12" style={{ alignItems: 'center' }}>
            <span style={{ position: 'relative', flex: 'none' }}>
              <div className="skeleton" style={{ width: 46, height: 46, borderRadius: '50%' }} />
              <div className="skeleton" style={{ position: 'absolute', top: -6, left: -8, width: 24, height: 16, borderRadius: 6 }} />
            </span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ width: '60%', height: 14 }} />
              <div className="skeleton" style={{ width: '40%', height: 11 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

