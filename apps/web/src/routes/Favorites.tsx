import { useState } from 'react';
import { Empty, Pill } from '@worldcup/ui';
import type { StandingRow } from '@worldcup/shared';
import { MatchRow, PlayerCard, TeamCard } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, usePlayers, useStandings, useTeams } from '@/hooks';
import { useFavorites } from '@/store/favorites';

type Tab = 'teams' | 'players' | 'matches' | 'notes';

export function Favorites() {
  const favTeams = useFavorites((s) => s.teams);
  const favPlayers = useFavorites((s) => s.players);
  const favMatches = useFavorites((s) => s.matches);
  const notes = useFavorites((s) => s.notes);
  const setNotes = useFavorites((s) => s.setNotes);
  const [tab, setTab] = useState<Tab>('teams');

  const { data: teamsData } = useTeams();
  const { data: playersData } = usePlayers();
  const { data: matchData } = useMatches();
  const { data: standings } = useStandings();

  const teams = (teamsData?.items ?? []).filter((t) => favTeams.includes(t.code));
  const players = (playersData?.items ?? []).filter((p) => favPlayers.includes(p.id));
  const matches = (matchData?.items ?? []).filter((m) => favMatches.includes(m.id));

  const standingByCode: Record<string, StandingRow> = {};
  for (const rows of Object.values(standings?.groups ?? {})) for (const r of rows) standingByCode[r.team] = r;

  return (
    <div className="page-fade">
      <MockBanner />
      <div className="row gap-6 wrap" style={{ marginBottom: 16 }}>
        <Pill on={tab === 'teams'} onClick={() => setTab('teams')}>
          Selecciones {favTeams.length}
        </Pill>
        <Pill on={tab === 'players'} onClick={() => setTab('players')}>
          Jugadores {favPlayers.length}
        </Pill>
        <Pill on={tab === 'matches'} onClick={() => setTab('matches')}>
          Partidos {favMatches.length}
        </Pill>
        <Pill on={tab === 'notes'} onClick={() => setTab('notes')}>
          Notas
        </Pill>
      </div>

      {tab === 'teams' &&
        (teams.length ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
            {teams.map((t) => (
              <TeamCard key={t.code} code={t.code} standing={standingByCode[t.code]} />
            ))}
          </div>
        ) : (
          <Empty icon="star" title="Sin selecciones favoritas" text="Marca una selección con la estrella en cualquier tarjeta." />
        ))}

      {tab === 'players' &&
        (players.length ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
            {players.map((p) => (
              <PlayerCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <Empty icon="star" title="Sin jugadores favoritos" text="Marca un jugador con la estrella en cualquier tarjeta." />
        ))}

      {tab === 'matches' &&
        (matches.length ? (
          <div className="card card-pad">
            {matches.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        ) : (
          <Empty icon="star" title="Sin partidos guardados" text="Guarda un partido desde su página de detalle." />
        ))}

      {tab === 'notes' && (
        <div className="card card-pad">
          <div className="mono-label" style={{ marginBottom: 8 }}>
            Notas personales · solo en este dispositivo
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Apuntes, predicciones, cosas a seguir…"
            rows={12}
            style={{
              width: '100%',
              background: 'var(--bg-1)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--tx)',
              padding: 12,
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
