import { useState } from 'react';
import { Empty, Pill, Icon } from '@worldcup/ui';
import type { StandingRow } from '@worldcup/shared';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MatchRow, PlayerCard, TeamCard } from '@/components/cards';
import { MockBanner } from '@/components/MockBanner';
import { useMatches, usePlayers, useStandings, useTeams } from '@/hooks';
import { useFavorites, type TacticalNote } from '@/store/favorites';

type Tab = 'teams' | 'players' | 'matches' | 'notes';

function SavedChart({ chart }: { chart: TacticalNote['chart'] }) {
  if (!chart || !chart.data || !chart.data.length || !chart.keys || !chart.keys.length) return null;
  const key = chart.keys[0];
  return (
    <div className="card" style={{ marginTop: 10, border: '1px solid var(--gold-line)', background: 'var(--bg-2)' }}>
      <div className="card-hd" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{chart.title}</h4>
      </div>
      <div className="card-pad" style={{ height: 160, paddingTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--tx-3)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--tx-3)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 6 }} />
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey={key} stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--tx-3)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--tx-3)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 6 }} />
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
              <Bar dataKey={key} fill="var(--gold)" radius={[3, 3, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Favorites() {
  const favTeams = useFavorites((s) => s.teams);
  const favPlayers = useFavorites((s) => s.players);
  const favMatches = useFavorites((s) => s.matches);
  const notes = useFavorites((s) => s.notes);
  const setNotes = useFavorites((s) => s.setNotes);
  const tacticalNotes = useFavorites((s) => s.tacticalNotes ?? []);
  const removeNote = useFavorites((s) => s.removeTacticalNote);
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
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
          {/* Personal notes textbox */}
          <div className="card card-pad">
            <div className="mono-label" style={{ marginBottom: 8 }}>
              Notas personales · editables
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Apuntes, predicciones, cosas a seguir…"
              rows={5}
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

          {/* AI saved notes */}
          <div className="row spread" style={{ marginTop: 10 }}>
            <span className="mono-label" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
              Notas Tácticas de Gala (IA)
            </span>
          </div>

          {tacticalNotes.length === 0 ? (
            <Empty
              icon="ai"
              title="Sin análisis guardados"
              text="Hazle preguntas tácticas al Analista IA y pulsa en la estrella de guardar para archivarlas aquí de forma permanente."
            />
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {tacticalNotes.map((n) => (
                <div key={n.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="row spread" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="mono-label" style={{ fontSize: 10, color: 'var(--gold)' }}>Pregunta:</span>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                        "{n.query}"
                      </h4>
                    </div>
                    <button
                      onClick={() => removeNote(n.id)}
                      className="fav-btn"
                      style={{ padding: 4, marginLeft: 8, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      title="Eliminar nota"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <span className="mono-label" style={{ fontSize: 10, color: 'var(--tx-3)' }}>Análisis:</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--tx-2)' }}>
                      {n.response}
                    </p>
                    
                    {n.chart && <SavedChart chart={n.chart} />}
                  </div>
                  
                  <div className="mono-label" style={{ fontSize: 10, textAlign: 'right', marginTop: 4 }}>
                    Guardado: {n.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
