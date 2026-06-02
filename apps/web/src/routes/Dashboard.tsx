import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon, Section, StatTile, Skeleton, type IconName } from '@worldcup/ui';
import { avg, fmtGD, type Match, type Team } from '@worldcup/shared';
import { MatchCard, MatchRow, Ticker, PlayerMini } from '@/components/cards';
import { TeamCrest } from '@/components/identity';
import { MatchdayHero } from '@/components/MatchdayHero';
import { MockBanner } from '@/components/MockBanner';
import { TournamentTimeline } from '@/components/TournamentTimeline';
import { useMatches, useStandings, useStats, useSyncStatus, useHolographicTilt, useTeams, useTeamsMap } from '@/hooks';
import { focusMatch, lockLabel, weatherSummary } from '@/lib/matchMeta';
import { buildDayBrief, buildPoolDiagnostics } from '@/lib/opsIntelligence';
import { shareTextCard } from '@/lib/shareCards';
import { useFavorites } from '@/store/favorites';
import { usePool, type PoolPick } from '@/store/pool';
import { getBrowserAudioContext, stadiumAudio } from '@/lib/audioSynth';

/** Derive the tournament "focus day": a live day, else latest played, else next up. */
function focusDate(matches: Match[]): string {
  const live = matches.find((m) => m.status === 'LIVE');
  if (live) return live.date;
  const played = matches.filter((m) => m.status === 'FT').map((m) => m.date).sort();
  if (played.length) return played[played.length - 1]!;
  const up = matches.filter((m) => m.status === 'UPCOMING').map((m) => m.date).sort();
  return up[0] ?? '';
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: matchData, isLoading } = useMatches();
  const { data: stats } = useStats();
  const { data: standings } = useStandings();
  const { data: sync } = useSyncStatus();
  const { data: teamsData } = useTeams();
  const favTeams = useFavorites((s) => s.teams);
  const favPlayers = useFavorites((s) => s.players);
  const favMatches = useFavorites((s) => s.matches);
  const pool = usePool();

  const matches = useMemo(() => matchData?.items ?? [], [matchData]);
  const day = useMemo(() => focusDate(matches), [matches]);
  const today = matches.filter((m) => m.date === day);
  const live = matches.filter((m) => m.status === 'LIVE');
  const heroMatch = useMemo(() => focusMatch(matches), [matches]);
  const upcoming = matches.filter((m) => m.status === 'UPCOMING').slice(0, 5);
  const results = matches.filter((m) => m.status === 'FT').slice(-6).reverse();
  const played = matches.filter((m) => m.status === 'FT').length;
  const goals = matches
    .filter((m) => m.status === 'FT')
    .reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
  const scorers = stats?.topScorers.slice(0, 5) ?? [];

  const tickerItems = [...live, ...today.filter((m) => m.status !== 'LIVE')].slice(0, 8);

  if (isLoading) {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <Skeleton h={90} />
        <Skeleton h={220} />
      </div>
    );
  }

  return (
      <div className="page-fade">
        <MockBanner />
        <MatchdayHero match={heroMatch} />
        <FamilyLaunchPanel match={heroMatch} />
        <ProactiveAlerts match={heroMatch} picks={pool.picks} favoritesCount={favTeams.length + favPlayers.length + favMatches.length} />
        <OperationalPulse
          matches={matches}
          teams={teamsData?.items ?? []}
          picks={pool.picks}
          favoritesCount={favTeams.length + favPlayers.length + favMatches.length}
        />

        <div className="stat-strip" style={{ marginBottom: 18 }}>
        <StatTile icon="ball" label="Goles" value={goals} sub="Torneo" spark={[40, 55, 38, 70, 62, 90, 100]} />
        <StatTile icon="whistle" label="Jugados" value={played} sub={`de ${matches.length}`} />
        <StatTile icon="flame" label="Goles/partido" value={avg(goals, played)} sub="Fase de grupos" accent="var(--pos)" />
        <StatTile
          icon="target"
          label="En vivo"
          value={live.length}
          sub={live.length ? 'En juego' : 'Ninguno'}
          accent={live.length ? 'var(--live)' : undefined}
        />
        <StatTile icon="star" label="Seguimiento" value={favTeams.length + favPlayers.length} sub="Selecciones + jugadores" />
      </div>

      <div className="home-grid">
        <div className="grid">
          <AIBrief day={day} todayCount={today.length} liveCount={live.length} />

          <Section title="En vivo y hoy" label="Marcador">
            {tickerItems.length ? (
              <Ticker items={tickerItems} />
            ) : (
              <p className="muted" style={{ fontSize: 12.5 }}>
                Sin partidos para el día destacado.
              </p>
            )}
          </Section>

          <Section
            title="Partidos de hoy"
            label={day}
            action={
              <button type="button" className="card-link" onClick={() => navigate({ to: '/matches' })}>
                Centro de partidos <Icon name="chevR" size={13} />
              </button>
            }
          >
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))' }}>
              {today.slice(0, 4).map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
            </div>
          </Section>

          <div className="card">
            <div className="card-hd">
              <Icon name="target" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Mi seguimiento</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/favorites' })}>
                Gestionar
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 8 }}>
              {favTeams.length + favPlayers.length + favMatches.length === 0 ? (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  Marca selecciones, jugadores y partidos para armar tu seguimiento.
                </p>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                  {favTeams.map((c) => (
                    <div
                      key={c}
                      className="row gap-8 clickable"
                      style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
                      onClick={() => navigate({ to: '/teams/$code', params: { code: c } })}
                    >
                      <TeamCrest code={c} size={26} />
                      <span style={{ fontWeight: 600, fontSize: 12.5 }} className="nowrap">
                        {c}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Section title="Últimos resultados" label="Final">
            <div className="card card-pad">
              {results.length ? (
                results.map((m) => <MatchRow key={m.id} m={m} />)
              ) : (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  Aún no se ha jugado ningún partido.
                </p>
              )}
            </div>
          </Section>

          <TournamentTimeline matches={matches} />
        </div>

        {/* rail */}
        <div className="rail">
          <LiveActivityWidget />
          <SyncCard sync={sync} />

          {standings && (
            <div className="card">
              <div className="card-hd">
                <Icon name="standings" size={15} style={{ color: 'var(--gold)' }} />
                <h3>Resumen de grupo</h3>
                <span className="spacer" />
                <button type="button" className="card-link" onClick={() => navigate({ to: '/standings' })}>
                  Tablas completas
                </button>
              </div>
              <div className="card-pad" style={{ paddingTop: 4 }}>
                {(standings.groups.A ?? []).slice(0, 4).map((r, i) => (
                  <div
                    key={r.team}
                    className="row gap-8 clickable"
                    style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}
                    onClick={() => navigate({ to: '/teams/$code', params: { code: r.team } })}
                  >
                    <span className="rank num" style={{ width: 18 }}>
                      {i + 1}
                    </span>
                    <TeamCrest code={r.team} size={20} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 12.5 }}>{r.team}</span>
                    <span className={`num ${r.GD > 0 ? 'gd-pos' : r.GD < 0 ? 'gd-neg' : ''}`} style={{ fontSize: 12 }}>
                      {fmtGD(r.GD)}
                    </span>
                    <span className="num tx-gold" style={{ fontWeight: 700 }}>
                      {r.Pts}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-hd">
              <Icon name="ball" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Goleadores</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/stats' })}>
                Todos
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 6 }}>
              {scorers.length ? (
                scorers.map((p, i) => (
                  <PlayerMini key={p.id} p={p} rank={i + 1} metric={(x) => `${x.goals}G`} />
                ))
              ) : (
                <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                  Sin goleadores todavía.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <Icon name="clock" size={15} style={{ color: 'var(--gold)' }} />
              <h3>Próximos</h3>
              <span className="spacer" />
              <button type="button" className="card-link" onClick={() => navigate({ to: '/matches' })}>
                Calendario
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 4 }}>
              {upcoming.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationalPulse({
  matches,
  teams,
  picks,
  favoritesCount,
}: {
  matches: Match[];
  teams: Team[];
  picks: Record<string, PoolPick>;
  favoritesCount: number;
}) {
  const navigate = useNavigate();
  const brief = buildDayBrief(matches, teams, picks);
  const diagnostics = buildPoolDiagnostics(matches, picks);
  return (
    <section className="ops-pulse-board">
      <div className="ops-pulse-main">
        <span className="mono-label">Centro operativo</span>
        <strong>{brief.title}</strong>
        <p>{brief.subtitle}</p>
        <div className="ops-pulse-actions">
          <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
            <Icon name="trophy" size={14} /> Completar quiniela
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate({ to: '/analyst' })}>
            <Icon name="ai" size={14} /> Pedir plan IA
          </button>
        </div>
      </div>
      <div className="ops-pulse-grid">
        <PulseTile icon="target" label="Picks" value={`${diagnostics.coveragePct}%`} text={diagnostics.recommendedAction} />
        <PulseTile icon="activity" label="Marcadores" value={`${diagnostics.scorePct}%`} text={`${diagnostics.missingScore} por cerrar`} />
        <PulseTile icon="star" label="Favoritos" value={String(favoritesCount)} text={favoritesCount ? 'Alertas personalizadas' : 'Agrega seguimiento'} />
        <PulseTile icon="sparkSmall" label="IA siguiente" value="1 acción" text={brief.nextAction} />
      </div>
    </section>
  );
}

function PulseTile({ icon, label, value, text }: { icon: IconName; label: string; value: string; text: string }) {
  return (
    <div className="ops-pulse-tile">
      <Icon name={icon} size={14} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </div>
  );
}

function ProactiveAlerts({
  match,
  picks,
  favoritesCount,
}: {
  match: Match | null;
  picks: Record<string, { outcome?: string; homeGoals?: number; awayGoals?: number }>;
  favoritesCount: number;
}) {
  const navigate = useNavigate();
  if (!match) return null;
  const pick = picks[match.id];
  const weather = weatherSummary(match.id);
  const alerts = [
    {
      icon: 'target' as const,
      title: pick?.outcome ? 'Pick activo' : 'Pick pendiente',
      text: pick?.homeGoals != null && pick.awayGoals != null ? `Tu marcador: ${pick.homeGoals}-${pick.awayGoals}` : 'Captura marcador antes del cierre.',
      action: 'Abrir quiniela',
      to: '/pool' as const,
    },
    {
      icon: 'rain' as const,
      title: 'Clima a vigilar',
      text: `${weather.label} · ${weather.confidence}`,
      action: 'Ver partido',
      to: '/matches' as const,
    },
    {
      icon: 'star' as const,
      title: 'Seguimiento',
      text: favoritesCount ? `${favoritesCount} favoritos activos.` : 'Marca equipos o jugadores para alertas más útiles.',
      action: 'Favoritos',
      to: '/favorites' as const,
    },
  ];
  return (
    <div className="proactive-alert-strip">
      <div>
        <span className="mono-label">Alertas proactivas</span>
        <strong>{lockLabel(match)}</strong>
      </div>
      {alerts.map((alert) => (
        <button key={alert.title} type="button" className="proactive-alert" onClick={() => navigate({ to: alert.to })}>
          <Icon name={alert.icon} size={14} />
          <span>
            <strong>{alert.title}</strong>
            <small>{alert.text}</small>
          </span>
          <em>{alert.action}</em>
        </button>
      ))}
    </div>
  );
}

function FamilyLaunchPanel({ match }: { match: Match | null }) {
  const navigate = useNavigate();
  const teams = useTeamsMap();
  const [sharing, setSharing] = useState(false);

  const shareMatchday = async () => {
    if (!match) return;
    setSharing(true);
    try {
      await shareTextCard({
        title: 'Partido del día',
        subtitle: `${teams[match.home]?.name ?? match.home} vs ${teams[match.away]?.name ?? match.away}`,
        lines: [
          `Fecha: ${match.date} ${match.time}`,
          `Sede: ${match.venue}`,
          'Acceso directo a quiniela familiar, modo TV y centro de datos.',
        ],
        footer: 'Mundial 2026 privado',
        fileName: `partido-del-dia-${match.id}.png`,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="matchday-launch-strip card">
      <div>
        <span className="mono-label">Accesos del día</span>
        <strong>De la previa a la quiniela en un toque</strong>
      </div>
      <button type="button" className="btn gold" onClick={() => navigate({ to: '/pool' })}>
        <Icon name="trophy" size={15} /> Quiniela
      </button>
      <button type="button" className="btn ghost" onClick={() => navigate({ to: '/tv' })}>
        <Icon name="present" size={15} /> Pantalla grande
      </button>
      <button type="button" className="btn ghost" onClick={() => navigate({ to: '/data' })}>
        <Icon name="database" size={15} /> Estado de datos
      </button>
      <button type="button" className="btn ghost" onClick={shareMatchday} disabled={!match || sharing}>
        <Icon name="share" size={15} /> {sharing ? 'Creando...' : 'Compartir'}
      </button>
    </div>
  );
}

function AIBrief({ day, todayCount, liveCount }: { day: string; todayCount: number; liveCount: number }) {
  const navigate = useNavigate();
  const { data: stats } = useStats();
  const top = stats?.topScorers[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const playPodcastChime = () => {
    try {
      const ctx = getBrowserAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
      
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // AudioContext blocked
    }
  };

  const stopPodcast = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
  };

  const startPodcast = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setIsPlaying(true);
    playPodcastChime();

    const sentences = [
      "¡Bienvenidos a El Minuto Táctico de la Copa del Mundo de Gala!",
      `Hoy es el día destacado del torneo, ${day || 'de hoy'}. Contamos con ${todayCount} partidos de altísimo nivel programados.`,
      liveCount > 0 
        ? `Y ojo, ¡tenemos ${liveCount} partidos disputándose en vivo en este preciso instante en la cima!` 
        : "En este momento todos los equipos de la quiniela familiar afinan sus estrategias.",
      top && top.goals > 0 
        ? `La bota de oro está que arde: ${top.name} lidera la tabla de artilleros con un espectacular registro de ${top.goals} goles. ¿Podrá alguien alcanzar su ritmo arrollador?` 
        : "",
      "¡Esto es todo por ahora en El Minuto Táctico! Sigue al tanto de tu quiniela familiar y que gane el mejor estratega. ¡Hasta la próxima!"
    ].filter(Boolean);

    activeIndexRef.current = 0;
    utterancesRef.current = sentences.map((text) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-MX';
      u.rate = 1.0;
      u.pitch = 1.05;

      u.onend = () => {
        const nextIdx = activeIndexRef.current + 1;
        if (nextIdx < utterancesRef.current.length) {
          activeIndexRef.current = nextIdx;
          synthRef.current?.speak(utterancesRef.current[nextIdx]);
        } else {
          setIsPlaying(false);
        }
      };

      u.onerror = () => {
        setIsPlaying(false);
      };

      return u;
    });

    setTimeout(() => {
      if (utterancesRef.current.length > 0) {
        synthRef.current?.speak(utterancesRef.current[0]);
      }
    }, 450);
  };

  return (
    <div className="card brief">
      <div className="card-hd">
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--gold-soft)',
            color: 'var(--gold)',
          }}
        >
          <Icon name="ai" size={15} />
        </span>
        <h3>Resumen IA del Mundial</h3>
        <span className="spacer" />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn ${isPlaying ? 'gold animate-pulse' : 'ghost'} btn-sm`}
            onClick={isPlaying ? stopPodcast : startPodcast}
            style={{ padding: '4px 10px', fontSize: 11.5 }}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={11} />
            {isPlaying ? 'Parar Minuto' : 'Minuto Táctico 🎙️'}
          </button>
          <button type="button" className="btn ghost btn-sm" onClick={() => navigate({ to: '/analyst' })} style={{ padding: '4px 10px', fontSize: 11.5 }}>
            <Icon name="sparkSmall" size={13} /> Analista
          </button>
        </div>
      </div>
      <div className="card-pad brief-body">
        {isPlaying && (
          <div className="row gap-8 align-center animate-fade-in" style={{ background: 'rgba(201, 162, 75, 0.08)', border: '1px solid rgba(201,162,75,0.15)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 12 }}>
              <div style={{ width: 2, height: 8, background: 'var(--gold)', animation: 'pulse-briefing 0.7s infinite alternate' }} />
              <div style={{ width: 2, height: 12, background: 'var(--gold)', animation: 'pulse-briefing 0.5s infinite alternate 0.2s' }} />
              <div style={{ width: 2, height: 6, background: 'var(--gold)', animation: 'pulse-briefing 0.6s infinite alternate 0.4s' }} />
              <div style={{ width: 2, height: 10, background: 'var(--gold)', animation: 'pulse-briefing 0.8s infinite alternate 0.1s' }} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold-2)' }}>Transmitiendo Boletín de Gala en Vivo...</span>
          </div>
        )}
        <div className="brief-pt">
          <span className="dot" />
          <span style={{ flex: 1 }}>
            Día destacado {day || '—'}: <span className="hl">{todayCount} partidos</span>
            {liveCount ? (
              <>
                , <span className="hl">{liveCount} en vivo</span> ahora
              </>
            ) : null}
            .
          </span>
        </div>
        {top && top.goals > 0 && (
          <div className="brief-pt">
            <span className="dot" />
            <span style={{ flex: 1 }}>
              <span className="hl">{top.name}</span> lidera el goleo con {top.goals} goles y {top.assists}{' '}
              asistencias.
            </span>
          </div>
        )}
        <div className="mono-label" style={{ marginTop: 10 }}>
          Generado desde datos locales · haz clic en Minuto Táctico para escuchar el boletín vocal
        </div>
      </div>
    </div>
  );
}

function SyncCard({ sync }: { sync: ReturnType<typeof useSyncStatus>['data'] }) {
  const navigate = useNavigate();
  const meta = sync?.meta;
  const isMock = sync?.source === 'mock';
  return (
    <div className="card">
      <div className="card-hd">
        <span className={isMock ? 'dot-warn' : 'dot-ok'} />
        <h3>Datos locales</h3>
        <span className="spacer" />
        <button type="button" className="card-link" onClick={() => navigate({ to: '/data' })}>
          Revisar
        </button>
      </div>
      <div className="card-pad" style={{ paddingTop: 4 }}>
        <div className="sync-row">
          <span className="k">Estado</span>
          <span className="badge gold">{meta?.cacheStatus ?? 'Datos abiertos'}</span>
        </div>
        <div className="sync-row">
          <span className="k">Fuente</span>
          <span className="num" style={{ fontSize: 12 }}>
            {sync?.source === 'sqlite' ? 'SQLite local' : 'Datos del torneo'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Actualizado</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta?.lastSync ?? '—'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Dataset</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta?.db ?? '—'}
          </span>
        </div>
        <div className="sync-row">
          <span className="k">Banderas</span>
          <span className="num" style={{ fontSize: 12 }}>
            {meta ? `${meta.assets.flags} selecciones` : '0'}
          </span>
        </div>
      </div>
    </div>
  );
}

function LiveActivityWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [minute, setMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [goalFlash, setGoalFlash] = useState(false);
  const [lastScorer, setLastScorer] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useHolographicTilt(containerRef);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setMinute((prev) => {
          if (prev >= 90) {
            setIsRunning(false);
            if (interval) clearInterval(interval);
            return 90;
          }
          const nextMin = prev + 1;
          
          const MEX_CHANCE = 0.025;
          const ARG_CHANCE = 0.020;
          const rand = Math.random();
          
          if (rand < MEX_CHANCE) {
            setHomeScore((s) => s + 1);
            setGoalFlash(true);
            setTimeout(() => setGoalFlash(false), 1200);
            const scorers = ['Santi Giménez', 'Chucky Lozano', 'Edson Álvarez', 'Luis Chávez'];
            const scorer = scorers[Math.floor(Math.random() * scorers.length)];
            setLastScorer(`⚽ GOL MÉXICO! ${scorer} (${nextMin}')`);
            if (soundEnabledRef.current) {
              stadiumAudio.triggerGoalSequence('home');
            }
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
          } else if (rand < MEX_CHANCE + ARG_CHANCE) {
            setAwayScore((s) => s + 1);
            setGoalFlash(true);
            setTimeout(() => setGoalFlash(false), 1200);
            const scorers = ['Leo Messi', 'Lautaro Martínez', 'Julián Álvarez', 'Enzo Fernández'];
            const scorer = scorers[Math.floor(Math.random() * scorers.length)];
            setLastScorer(`⚽ GOL ARGENTINA! ${scorer} (${nextMin}')`);
            if (soundEnabledRef.current) {
              stadiumAudio.triggerGoalSequence('away');
            }
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
          }
          
          return nextMin;
        });
      }, 350);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const resetSimulation = () => {
    setIsRunning(false);
    setMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setGoalFlash(false);
    setLastScorer('');
    if ('vibrate' in navigator) navigator.vibrate([15]);
  };

  const getLivePoints = (predHome: number, predAway: number, actualHome: number, actualAway: number): number => {
    const predOutcome = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const actualOutcome = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
    if (predHome === actualHome && predAway === actualAway) return 3;
    if (predOutcome === actualOutcome) return 1;
    return 0;
  };

  const liveLeaderboard = useMemo(() => {
    const players = [
      { name: 'Jovan (Tú)', pickHome: 2, pickAway: 1, isUser: true },
      { name: '🤖 Optimista', pickHome: 3, pickAway: 1, isUser: false },
      { name: '🤖 Estadístico', pickHome: 1, pickAway: 1, isUser: false },
      { name: '🤖 Contrarian', pickHome: 0, pickAway: 2, isUser: false },
    ];

    const mapped = players.map((p) => {
      const pts = getLivePoints(p.pickHome, p.pickAway, homeScore, awayScore);
      return {
        ...p,
        pts,
        pickStr: `${p.pickHome}-${p.pickAway}`,
      };
    });

    return mapped.sort((a, b) => b.pts - a.pts);
  }, [homeScore, awayScore]);

  return (
    <div ref={containerRef} className={`live-activity-card holographic-card ${goalFlash ? 'goal-flash' : ''}`} style={{ marginBottom: 16 }}>
      {/* Header */}
      <div className="row spread align-center" style={{ marginBottom: 12 }}>
        <div className="row gap-6 align-center">
          <span className="live-badge">Actividad en Vivo</span>
          <span className="mono-label" style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}>Lock Screen</span>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if ('vibrate' in navigator) navigator.vibrate([10]);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: soundEnabled ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease',
            }}
            title={soundEnabled ? "Desactivar Sonido 3D" : "Activar Sonido 3D"}
          >
            <Icon name={soundEnabled ? 'volume' : 'mute'} size={13} />
          </button>
        </div>
        <div className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
          {minute === 90 ? 'Fin' : minute > 0 ? `${minute}'` : '0\''}
        </div>
      </div>

      {/* Main Score UI */}
      <div className="row spread align-center" style={{ padding: '8px 4px' }}>
        {/* Home Team */}
        <div className="la-crest-container">
          <TeamCrest code="MEX" size={32} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>MEX</span>
        </div>

        {/* Score */}
        <div className="row gap-12 align-center">
          <span className="la-score">{homeScore}</span>
          <span className="la-score-divider">:</span>
          <span className="la-score">{awayScore}</span>
        </div>

        {/* Away Team */}
        <div className="la-crest-container">
          <TeamCrest code="ARG" size={32} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>ARG</span>
        </div>
      </div>

      {/* Scorer Alerts */}
      {lastScorer && (
        <div
          className="animate-fade-in"
          style={{
            background: 'rgba(201, 162, 75, 0.1)',
            border: '1px solid rgba(201, 162, 75, 0.2)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            color: 'var(--gold-2)',
            textAlign: 'center',
            marginTop: 8,
            fontWeight: 600,
          }}
        >
          {lastScorer}
        </div>
      )}

      {/* Progress Timeline */}
      <div className="la-timeline-track">
        <div className="la-timeline-fill" style={{ width: `${(minute / 90) * 100}%` }} />
      </div>

      {/* Live Leaderboard Podium Inside Widget */}
      <div style={{ marginTop: 12 }}>
        <div className="mono-label" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Live Quiniela (Pronóstico vs Pts)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {liveLeaderboard.map((u, i) => (
            <div key={u.name} className={`la-podium-row ${u.isUser ? 'user' : ''}`}>
              <div className="row gap-6 align-center">
                <span className="num muted" style={{ width: 12 }}>{i + 1}</span>
                <span style={{ fontWeight: u.isUser ? 700 : 500 }}>{u.name}</span>
                <span className="muted" style={{ fontSize: 10 }}>({u.pickStr})</span>
              </div>
              <span className="num tx-gold" style={{ fontWeight: 800 }}>
                {u.pts} {u.pts === 1 ? 'pt' : 'pts'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="row gap-8" style={{ marginTop: 14 }}>
        <button
          type="button"
          className={`btn btn-sm ${isRunning ? 'ghost' : 'gold'}`}
          style={{ flex: 1, fontSize: 11, height: 28 }}
          onClick={() => {
            setIsRunning(!isRunning);
            if ('vibrate' in navigator) navigator.vibrate([10]);
          }}
        >
          <Icon name={isRunning ? 'pause' : 'play'} size={11} />
          {isRunning ? 'Pausar' : minute > 0 && minute < 90 ? 'Reanudar' : 'Simular Goles'}
        </button>

        {(minute > 0 || isRunning) && (
          <button
            type="button"
            className="btn ghost btn-sm"
            style={{ fontSize: 11, height: 28, padding: '0 10px', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            onClick={resetSimulation}
          >
            <Icon name="close" size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
