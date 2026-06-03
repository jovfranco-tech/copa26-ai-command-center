import { useState, useMemo, useCallback } from 'react';
import './index.css';
import { MATCH_FIXTURES, getDemoAnalytics, PLACEHOLDER_INSIGHTS, PLACEHOLDER_ANALYTICS } from './data/matchData';
import type { Match } from './data/matchData';
import { StadiumScene } from './components/StadiumScene';
import { Tactical2DMap } from './components/Tactical2DMap';
import { WebGLBoundary } from './components/WebGLBoundary';
import { AIMatchBrief } from './components/AIMatchBrief';
import { SelectedPlayerPanel } from './components/SelectedPlayerPanel';
import type { Player } from './data/lineups';
import { usePlayers, useMatches, useTeamsMap, useVenuesMap } from '../../hooks';
import { TeamFlag, TeamCrest } from '../../components/identity';
import { mapDatabasePlayersToLineups } from './data/stadiumDataMapper';
import { getTeamVisualIdentity } from './data/teamVisualIdentity';
import type { Match as SharedMatch } from '@worldcup/shared';
import {
  EyeOff,
  Eye,
  Info,
  X,
  Share2,
  CloudRain,
  CloudFog,
  Snowflake,
  Moon,
  Sun
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Bridge: convert a real shared Match to the stadium Match interface
// ─────────────────────────────────────────────────────────────────────────────

function bridgeRealMatch(
  real: SharedMatch,
  teamName: (code: string) => string,
  venueName: (id: string) => string,
): Match {
  const homeVisual = getTeamVisualIdentity(real.home, true);
  const awayVisual = getTeamVisualIdentity(real.away, false);

  // Derive time-of-day from match kick-off hour
  const hour = parseInt(real.time?.split(':')[0] ?? '15', 10);
  const timeOfDay: 'day' | 'sunset' | 'night' = hour < 16 ? 'day' : hour < 20 ? 'sunset' : 'night';

  // Map real status to stadium status
  const statusMap: Record<string, 'pre-match' | 'live' | 'post-match'> = {
    UPCOMING: 'pre-match',
    LIVE: 'live',
    FT: 'post-match',
  };
  const status = statusMap[real.status] ?? 'pre-match';

  // Get curated demo analytics if available
  const { entry, isDemo } = getDemoAnalytics(real.home, real.away);

  return {
    id: real.id,
    teams: {
      home: teamName(real.home),
      away: teamName(real.away),
      homeShort: real.home,
      awayShort: real.away,
      homeColor: homeVisual.primaryColor,
      awayColor: awayVisual.primaryColor,
      homeStandsColor: homeVisual.secondaryColor,
      awayStandsColor: awayVisual.secondaryColor,
    },
    stadiumName: venueName(real.venue),
    group: real.stage,
    timeOfDay,
    weather: 'clear',
    status,
    score: { home: real.homeGoals ?? 0, away: real.awayGoals ?? 0 },
    liveTime: real.minute != null ? `${real.minute}'` : undefined,
    spectators: venueName(real.venue) !== 'Sede por confirmar' ? venueName(real.venue) : 'Aforo local',
    pitchZoneInsights: entry?.pitchZoneInsights ?? PLACEHOLDER_INSIGHTS,
    analytics: entry?.analytics ?? PLACEHOLDER_ANALYTICS,
    isDemo,
    isPending: !isDemo,
  };
}

function App() {
  const { data: dbPlayersData } = usePlayers();
  const { data: matchesData, isLoading: matchesLoading } = useMatches();
  const teamsMap = useTeamsMap();
  const venuesMap = useVenuesMap();

  const dbPlayers = dbPlayersData?.items ?? [];

  const [modoInmersivo, setModoInmersivo] = useState<boolean>(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('M001');
  const [reduceEffects, setReduceEffects] = useState<boolean>(false);
  const [webGlFallback, setWebGlFallback] = useState<boolean>(false);
  const [activeZone, setActiveZone] = useState<'none' | 'field' | 'stands' | 'screens' | 'lights'>('none');
  const [cameraView, setCameraView] = useState<'general' | 'transmision' | 'tactica' | 'porteria' | 'alineaciones'>('alineaciones');
  const [cameraResetTrigger] = useState<number>(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [visualizationMode] = useState<'nombres' | 'compactas' | 'seleccionar' | 'limpia'>('seleccionar');
  const [showTacticalZones] = useState<boolean>(true);
  const [mentalidad, setMentalidad] = useState<'equilibrada' | 'ofensiva'>('equilibrada');
  const [ritmo, setRitmo] = useState<'moderado' | 'alto'>('moderado');
  const [shareFeedback, setShareFeedback] = useState<boolean>(false);
  const [weatherOverride, setWeatherOverride] = useState<Record<string, 'clear' | 'rain' | 'fog' | 'snow'>>({});
  const [timeOverride, setTimeOverride] = useState<Record<string, 'day' | 'sunset' | 'night'>>({});

  // ── Helper lookups ──────────────────────────────────────────────────────────
  const teamName = useCallback((code: string) => teamsMap[code]?.name ?? code, [teamsMap]);
  const venueName = useCallback(
    (id: string) => {
      const v = venuesMap[id];
      return v ? v.stadium : 'Sede por confirmar';
    },
    [venuesMap],
  );

  // ── Build stadium match list from real API data (fallback to MATCH_FIXTURES) ─
  const fixtures = useMemo<Match[]>(() => {
    const realMatches = matchesData?.items ?? [];
    if (realMatches.length > 0) {
      return realMatches.map((m) => bridgeRealMatch(m, teamName, venueName));
    }
    // Emergency offline fallback — clearly labeled in matchData.ts
    return MATCH_FIXTURES;
  }, [matchesData, teamName, venueName]);

  // Apply per-match user overrides (weather / time of day)
  const fixturesWithOverrides = useMemo<Match[]>(() => {
    return fixtures.map((m) => ({
      ...m,
      weather: weatherOverride[m.id] ?? m.weather,
      timeOfDay: timeOverride[m.id] ?? m.timeOfDay,
    }));
  }, [fixtures, weatherOverride, timeOverride]);

  // ── Current match ───────────────────────────────────────────────────────────
  const currentMatchIndex = fixturesWithOverrides.findIndex((m) => m.id === selectedMatchId);
  const currentMatch =
    fixturesWithOverrides[currentMatchIndex] ??
    fixturesWithOverrides.find((m) => m.id === 'M001') ??
    fixturesWithOverrides[0];

  // ── Lineup mapping ──────────────────────────────────────────────────────────
  const mappedLineups = useMemo(() => {
    const statusMap: Record<Match['status'], 'pre-match' | 'live' | 'post-match'> = {
      'pre-match': 'pre-match',
      live: 'live',
      'post-match': 'post-match',
    };
    const minute = currentMatch.liveTime ? parseInt(currentMatch.liveTime) : 0;
    return mapDatabasePlayersToLineups(
      dbPlayers,
      currentMatch.teams.homeShort,
      currentMatch.teams.awayShort,
      currentMatch.id,
      statusMap[currentMatch.status],
      minute,
    );
  }, [dbPlayers, currentMatch]);

  // ── Match change handler ────────────────────────────────────────────────────
  const handleMatchChange = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveZone('none');

    const nextMatch = fixturesWithOverrides.find((m) => m.id === matchId) ?? fixturesWithOverrides[0];
    const nextMinute = nextMatch.liveTime ? parseInt(nextMatch.liveTime) : 0;
    const nextLineups = mapDatabasePlayersToLineups(
      dbPlayers,
      nextMatch.teams.homeShort,
      nextMatch.teams.awayShort,
      nextMatch.id,
      nextMatch.status === 'live' ? 'live' : nextMatch.status === 'post-match' ? 'post-match' : 'pre-match',
      nextMinute,
    );

    if (selectedPlayer) {
      const isStillPresent =
        nextLineups.teams.home.players.some((p) => p.id === selectedPlayer.id) ||
        nextLineups.teams.away.players.some((p) => p.id === selectedPlayer.id);
      if (!isStillPresent) {
        setSelectedPlayer(nextLineups.teams.home.players[0] || null);
      }
    }
  };

  // ── Weather/time overrides ──────────────────────────────────────────────────
  const handleWeatherChange = (weather: 'clear' | 'rain' | 'snow' | 'fog') => {
    setWeatherOverride((prev) => ({ ...prev, [currentMatch.id]: weather }));
  };

  const handleTimeChange = (timeOfDay: 'day' | 'sunset' | 'night') => {
    setTimeOverride((prev) => ({ ...prev, [currentMatch.id]: timeOfDay }));
  };

  const cycleWeather = () => {
    const weathers: ('clear' | 'rain' | 'fog' | 'snow')[] = ['clear', 'rain', 'fog', 'snow'];
    const currentIndex = weathers.indexOf(currentMatch.weather);
    const nextWeather = weathers[(currentIndex + 1) % weathers.length];
    handleWeatherChange(nextWeather);
    if (nextWeather === 'clear') handleTimeChange('day');
    else if (nextWeather === 'rain') handleTimeChange('sunset');
    else handleTimeChange('night');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareFeedback(true);
    setTimeout(() => setShareFeedback(false), 2000);
  };

  // ── Zone overlay ────────────────────────────────────────────────────────────
  function getZoneTitleAndInfo() {
    switch (activeZone) {
      case 'field':
        return { title: 'Estrategia y Táctica del Campo', info: currentMatch.pitchZoneInsights.field, accent: 'var(--accent-emerald)' };
      case 'stands':
        return { title: 'Energía de la Afición y Gradas', info: currentMatch.pitchZoneInsights.stands, accent: 'var(--accent-blue)' };
      case 'screens':
        return { title: 'Marcador y Transmisión de Pantallas', info: currentMatch.pitchZoneInsights.screens, accent: 'var(--accent-violet)' };
      case 'lights':
        return { title: 'Torres de Iluminación del Estadio', info: currentMatch.pitchZoneInsights.lights, accent: 'var(--accent-cyan)' };
      default:
        return null;
    }
  }

  const zoneOverlay = getZoneTitleAndInfo();

  // ── Weather icon/label ──────────────────────────────────────────────────────
  const getWeatherDetails = () => {
    switch (currentMatch.weather) {
      case 'rain':
        return { icon: <CloudRain size={16} style={{ color: 'var(--accent-blue)' }} />, label: 'Lluvia intensa', temp: '14°C' };
      case 'fog':
        return { icon: <CloudFog size={16} style={{ color: 'var(--text-muted)' }} />, label: 'Niebla densa', temp: '8°C' };
      case 'snow':
        return { icon: <Snowflake size={16} style={{ color: '#ffffff' }} />, label: 'Nieve ligera', temp: '1°C' };
      case 'clear':
      default:
        return { icon: <Moon size={16} style={{ color: 'var(--accent-cyan)' }} />, label: 'Cielo despejado', temp: '22°C' };
    }
  };
  const weatherDetails = getWeatherDetails();

  const selectedPlayerMapped = selectedPlayer
    ? mappedLineups.teams.home.players.find((p) => p.id === selectedPlayer.id) ||
      mappedLineups.teams.away.players.find((p) => p.id === selectedPlayer.id) ||
      selectedPlayer
    : null;

  // ── Group matches by stage for dropdown display ─────────────────────────────
  const matchLabel = (m: Match) => `${m.teams.home} vs ${m.teams.away}`;
  const matchGroupLabel = (m: Match) => m.group;

  return (
    <div className={`stadium-feature-root app-container ${modoInmersivo ? 'stadium-immersive-mode' : 'stadium-integrated-mode'}`}>
      {/* Compact Stadium Toolbar */}
      <div className="stadium-toolbar">
        {/* Left: Context label + data status */}
        <div className="toolbar-left">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Análisis táctico en cancha
          </span>
          {matchesLoading && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '1px 6px' }}>
              Cargando calendario…
            </span>
          )}
          {!matchesLoading && currentMatch.isPending && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '1px 6px' }}>
              Calendario local
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="toolbar-controls">
          {/* Theme */}
          <div className="segmented-control">
            <button type="button" className={`segmented-btn ${!modoInmersivo ? 'active' : ''}`} onClick={() => setModoInmersivo(false)} title="Alinear con el tema claro del dashboard">
              Tema Claro
            </button>
            <button type="button" className={`segmented-btn ${modoInmersivo ? 'active' : ''}`} onClick={() => setModoInmersivo(true)} title="Modo oscuro inmersivo táctico">
              Inmersivo
            </button>
          </div>

          {/* 3D/2D */}
          <div className="segmented-control">
            <button type="button" className={`segmented-btn ${!webGlFallback ? 'active' : ''}`} onClick={() => setWebGlFallback(false)} title="Activar visualización interactiva en 3D">
              Vista 3D
            </button>
            <button type="button" className={`segmented-btn ${webGlFallback ? 'active' : ''}`} onClick={() => setWebGlFallback(true)} title="Activar esquema táctico en 2D">
              Vista 2D
            </button>
          </div>

          {/* Time of day */}
          <div className="segmented-control">
            <button type="button" className={`segmented-btn ${currentMatch.timeOfDay === 'day' ? 'active' : ''}`} onClick={() => handleTimeChange('day')} title="Visualización diurna">
              <Sun size={12} /> Día
            </button>
            <button type="button" className={`segmented-btn ${currentMatch.timeOfDay === 'night' ? 'active' : ''}`} onClick={() => handleTimeChange('night')} title="Visualización nocturna">
              <Moon size={12} /> Noche
            </button>
          </div>

          {/* Effects */}
          <div className="segmented-control" style={{ opacity: webGlFallback ? 0.5 : 1, pointerEvents: webGlFallback ? 'none' : 'auto' }}>
            <button type="button" className={`segmented-btn ${!reduceEffects ? 'active' : ''}`} onClick={() => setReduceEffects(false)} title="Renderizar efectos visuales completos">
              <Eye size={12} /> Full FX
            </button>
            <button type="button" className={`segmented-btn ${reduceEffects ? 'active' : ''}`} onClick={() => setReduceEffects(true)} title="Reducir efectos visuales para mejor rendimiento">
              <EyeOff size={12} /> Lite FX
            </button>
          </div>

          {/* Share */}
          <button type="button" className={`stadium-btn-sm ${shareFeedback ? 'active' : ''}`} onClick={handleShare} title="Compartir enlace">
            <Share2 size={12} />
            {shareFeedback ? '¡Copiado!' : 'Compartir'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <main className="app-main">

        {/* COLUMN 1: Visualization + Tactical Bottom Bar */}
        <section className="left-viewport-container">

          {/* Canvas Container */}
          <div className="canvas-wrapper">

            {/* OVERLAY: Top-Left Match Selector */}
            <div className="canvas-overlay-top-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TeamCrest code={currentMatch.teams.homeShort} size={24} />
                <TeamFlag code={currentMatch.teams.homeShort} size={13} />
              </div>

              <div className="match-title-group" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <select
                    className="match-select-overlay"
                    value={selectedMatchId}
                    onChange={(e) => handleMatchChange(e.target.value)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      paddingRight: '12px',
                      appearance: 'none',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)',
                      maxWidth: '180px',
                    }}
                  >
                    {fixturesWithOverrides.map((match) => (
                      <option key={match.id} value={match.id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        {matchLabel(match)}
                      </option>
                    ))}
                  </select>
                  <span style={{ pointerEvents: 'none', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #94a3b8', display: 'inline-block', marginLeft: '-6px' }} />
                </div>
                <span className="match-desc-label" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '1px' }}>
                  {matchGroupLabel(currentMatch)} ·{' '}
                  {currentMatch.status === 'live'
                    ? 'En Vivo'
                    : currentMatch.status === 'pre-match'
                    ? 'Pre-partido'
                    : 'Finalizado'}
                  {currentMatch.isPending && ' · Calendario local'}
                  {currentMatch.isDemo && ' · Datos demo'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TeamFlag code={currentMatch.teams.awayShort} size={13} />
                <TeamCrest code={currentMatch.teams.awayShort} size={24} />
              </div>

              <span
                className="live-badge-glow"
                style={{
                  background: currentMatch.status === 'live' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(94, 163, 184, 0.12)',
                  borderColor: currentMatch.status === 'live' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(94, 163, 184, 0.3)',
                  color: currentMatch.status === 'live' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  marginLeft: '4px',
                }}
              >
                <span className="live-dot" style={{ backgroundColor: currentMatch.status === 'live' ? 'var(--accent-emerald)' : 'var(--text-secondary)' }} />
                {currentMatch.status === 'live' ? 'En Vivo' : currentMatch.status === 'pre-match' ? 'Previa' : 'Final'}
              </span>
            </div>

            {/* OVERLAY: Bottom-Middle Help Pill */}
            <div className="canvas-overlay-bottom-middle">
              Arrastra para orbitar | Rueda para zoom | Clic derecho para desplazar
            </div>

            {/* OVERLAY: Top-Right Camera Toggles */}
            <div className="canvas-overlay-top-right">
              <button className={`camera-toggle-btn ${cameraView === 'tactica' ? 'active' : ''}`} onClick={() => setCameraView('tactica')} title="Vista cenital vertical">
                {cameraView === 'tactica' && <span className="toggle-dot" />}
                Cámara táctica
              </button>
              <button className={`camera-toggle-btn ${cameraView === 'transmision' ? 'active' : ''}`} onClick={() => setCameraView('transmision')} title="Vista lateral tipo TV">
                {cameraView === 'transmision' && <span className="toggle-dot" />}
                Vista TV
              </button>
            </div>

            {/* 3D or 2D Viewport */}
            {!webGlFallback ? (
              <WebGLBoundary
                fallback={
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 20, background: 'rgba(220, 38, 38, 0.9)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ffffff', padding: '10px 14px', borderRadius: '8px', fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                      ⚠️ <strong>Fallo de Gráficos 3D:</strong> WebGL no se pudo inicializar. Se ha activado la vista de mapa táctico 2D.
                    </div>
                    <Tactical2DMap
                      match={currentMatch}
                      activeZone={activeZone}
                      onZoneClick={(zone) => setActiveZone(activeZone === zone ? 'none' : zone)}
                      selectedPlayerId={selectedPlayer ? selectedPlayer.id : null}
                      onSelectPlayer={setSelectedPlayer}
                      lineups={mappedLineups}
                    />
                  </div>
                }
              >
                <StadiumScene
                  match={currentMatch}
                  reduceEffects={reduceEffects}
                  activeZone={activeZone}
                  onZoneClick={(zone) => setActiveZone(activeZone === zone ? 'none' : zone)}
                  cameraView={cameraView}
                  cameraResetTrigger={cameraResetTrigger}
                  selectedPlayerId={selectedPlayer ? selectedPlayer.id : null}
                  onSelectPlayer={setSelectedPlayer}
                  visualizationMode={visualizationMode}
                  showTacticalZones={showTacticalZones}
                  mentalidad={mentalidad}
                  ritmo={ritmo}
                  lineups={mappedLineups}
                />
              </WebGLBoundary>
            ) : (
              <Tactical2DMap
                match={currentMatch}
                activeZone={activeZone}
                onZoneClick={(zone) => setActiveZone(activeZone === zone ? 'none' : zone)}
                selectedPlayerId={selectedPlayer ? selectedPlayer.id : null}
                onSelectPlayer={setSelectedPlayer}
                lineups={mappedLineups}
              />
            )}

            {/* Zone overlay card */}
            {zoneOverlay && (
              <div className="overlay-card pulse-glow-border" style={{ borderLeft: `3px solid ${zoneOverlay.accent}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: zoneOverlay.accent }}>
                    {zoneOverlay.title}
                  </h4>
                  <button onClick={() => setActiveZone('none')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {zoneOverlay.info}
                </p>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '8px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                  <Info size={10} />
                  <span>
                    {currentMatch.isPending
                      ? 'Datos pendientes — disponibles cuando comience el partido.'
                      : 'Interactúa con las zonas en 3D para ver telemetría.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tactical Stats Bar */}
          <div className="tactical-stats-bar">

            {/* Widget 1: Posesión */}
            <div className="tactical-widget-card">
              <div>
                <span className="widget-label">Posesión estimada</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>• 52%</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>• 48%</span>
                </div>
              </div>
              <div className="widget-chart-wrapper">
                <svg width="34" height="34" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10182c" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--accent-cyan)" strokeWidth="3.5" strokeDasharray="52 48" strokeDashoffset="25" />
                </svg>
              </div>
            </div>

            {/* Widget 2: Presión */}
            <div className="tactical-widget-card">
              <div>
                <span className="widget-label">Presión actual</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  Alta
                </div>
              </div>
              <div className="signal-bars">
                <span className="bar filled" /><span className="bar filled" /><span className="bar filled" /><span className="bar filled" /><span className="bar" />
              </div>
            </div>

            {/* Widget 3: Mentalidad */}
            <div className="tactical-widget-card" style={{ flexGrow: 1.1 }}>
              <div><span className="widget-label">Mentalidad</span></div>
              <div className="toggle-group">
                <button className={`toggle-btn ${mentalidad === 'equilibrada' ? 'active' : ''}`} onClick={() => setMentalidad('equilibrada')} title="Bloques balanceados">
                  <span className="bullet" />Equilibrada
                </button>
                <button className={`toggle-btn ${mentalidad === 'ofensiva' ? 'active' : ''}`} onClick={() => setMentalidad('ofensiva')} title="Proyección ofensiva">
                  <span className="bullet" />Ofensiva
                </button>
              </div>
            </div>

            {/* Widget 4: Ritmo */}
            <div className="tactical-widget-card" style={{ flexGrow: 1.1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="widget-label">Ritmo de juego</span>
                <div className="toggle-group" style={{ marginTop: '2px' }}>
                  <button className={`toggle-btn ${ritmo === 'moderado' ? 'active' : ''}`} onClick={() => setRitmo('moderado')} title="Velocidad estándar">Moderado</button>
                  <button className={`toggle-btn ${ritmo === 'alto' ? 'active' : ''}`} onClick={() => setRitmo('alto')} title="Velocidad acelerada">Alto</button>
                </div>
              </div>
              <div className="widget-chart-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="40" height="22" viewBox="0 0 50 28">
                  <path d="M 5,25 A 20,20 0 0,1 45,25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 5,25 A 20,20 0 0,1 45,25" fill="none" stroke="var(--accent-cyan)" strokeWidth="4" strokeLinecap="round" strokeDasharray={ritmo === 'alto' ? '63' : '31.5'} />
                  <line x1="25" y1="25" x2={ritmo === 'alto' ? '39' : '25'} y2={ritmo === 'alto' ? '11' : '5'} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all 0.4s ease', transformOrigin: '25px 25px' }} />
                  <circle cx="25" cy="25" r="3.5" fill="#ffffff" />
                </svg>
              </div>
            </div>

            {/* Widget 5: Clima */}
            <div className="tactical-widget-card interactive-card" onClick={cycleWeather} style={{ cursor: 'pointer' }} title="Clic para alternar climas">
              <div>
                <span className="widget-label">Clima táctico</span>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>{weatherDetails.label}</div>
                <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, marginTop: '1px' }}>{weatherDetails.temp}</div>
              </div>
              <div className="widget-chart-wrapper" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {weatherDetails.icon}
              </div>
            </div>

          </div>
        </section>

        {/* COLUMN 2: Sidebar — Player Panel or Match Brief */}
        <section className="panel-container">
          <div
            className="glass-panel"
            style={{
              height: '100%',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              ...(selectedPlayerMapped
                ? (() => {
                    const teamVisual = getTeamVisualIdentity(selectedPlayerMapped.team);
                    const borderColor = selectedPlayerMapped.position === 'GK' ? '#fbbf24' : teamVisual.primaryColor;
                    return { borderColor, boxShadow: `0 0 24px ${borderColor}20` };
                  })()
                : {}),
            }}
          >
            {selectedPlayerMapped ? (
              <SelectedPlayerPanel
                player={selectedPlayerMapped}
                onClose={() => setSelectedPlayer(null)}
                weather={currentMatch.weather}
                status={currentMatch.status}
              />
            ) : (
              <AIMatchBrief
                match={currentMatch}
                onSelectPlayer={setSelectedPlayer}
                selectedPlayerId={null}
                lineups={mappedLineups}
              />
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
