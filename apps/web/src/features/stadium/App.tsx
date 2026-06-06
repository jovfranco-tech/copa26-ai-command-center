import { useState, useMemo, useCallback, useRef } from 'react';
import './index.css';
import { MATCH_FIXTURES, getDemoAnalytics, PLACEHOLDER_INSIGHTS, PLACEHOLDER_INSIGHTS_EN, DEMO_PITCH_INSIGHTS_EN, PLACEHOLDER_ANALYTICS } from './data/matchData';
import type { Match } from './data/matchData';
import { useT, useLang, type Translate } from '@/i18n';
import { StadiumScene } from './components/StadiumScene';
import { Tactical2DMap } from './components/Tactical2DMap';
import { WebGLBoundary } from './components/WebGLBoundary';
import { FormationOverlay } from './components/FormationOverlay';
import { SelectedPlayerPanel } from './components/SelectedPlayerPanel';
import type { Player } from './data/lineups';
import { usePlayers, useMatches, useTeamsMap, useVenuesMap, useLiveOverlay } from '../../hooks';
import { TeamFlag, TeamCrest } from '../../components/identity';
import { buildMatchLineups } from './data/stadiumDataMapper';
import { OFFICIAL_LINEUPS, type OfficialMatchLineup } from './data/officialLineups';
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
  t: Translate,
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
  const demoKey = `${real.home.toUpperCase()}-${real.away.toUpperCase()}`;
  const venueTbd = t('estadio3d.venueTbd');

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
    spectators: venueName(real.venue) !== venueTbd ? venueName(real.venue) : t('estadio3d.localCapacity'),
    pitchZoneInsights: entry?.pitchZoneInsights ?? PLACEHOLDER_INSIGHTS,
    pitchZoneInsightsEn: DEMO_PITCH_INSIGHTS_EN[demoKey] ?? PLACEHOLDER_INSIGHTS_EN,
    analytics: entry?.analytics ?? PLACEHOLDER_ANALYTICS,
    isDemo,
    isPending: !isDemo,
  };
}

function App() {
  const t = useT();
  const lang = useLang();
  const { data: dbPlayersData } = usePlayers();
  const { data: matchesData, isLoading: matchesLoading } = useMatches();
  const teamsMap = useTeamsMap();
  const venuesMap = useVenuesMap();

  const dbPlayers = useMemo(() => dbPlayersData?.items ?? [], [dbPlayersData]);

  const [modoInmersivo, setModoInmersivo] = useState<boolean>(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('M001');
  // Default the 3D scene to "Lite" (reduced effects) on small / touch screens so
  // the WebGL stadium stays smooth on phones; users can flip to full FX anytime.
  const [reduceEffects, setReduceEffects] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
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
      return v ? v.stadium : t('estadio3d.venueTbd');
    },
    [venuesMap, t],
  );

  // ── Build stadium match list from real API data (fallback to MATCH_FIXTURES) ─
  const fixtures = useMemo<Match[]>(() => {
    const realMatches = matchesData?.items ?? [];
    if (realMatches.length > 0) {
      return realMatches.map((m) => bridgeRealMatch(m, teamName, venueName, t));
    }
    // Emergency offline fallback — clearly labeled in matchData.ts
    return MATCH_FIXTURES;
  }, [matchesData, teamName, venueName, t]);

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

  // ── Live overlay: admin-published official lineups (merged over the static store)
  const overlayLineups = useLiveOverlay().data?.lineups;
  const officialSource = useMemo<Record<string, OfficialMatchLineup>>(
    () => ({ ...OFFICIAL_LINEUPS, ...(overlayLineups ?? {}) }),
    [overlayLineups],
  );

  // ── Lineup mapping ──────────────────────────────────────────────────────────
  const mappedLineups = useMemo(() => {
    const statusMap: Record<Match['status'], 'pre-match' | 'live' | 'post-match'> = {
      'pre-match': 'pre-match',
      live: 'live',
      'post-match': 'post-match',
    };
    const minute = currentMatch.liveTime ? parseInt(currentMatch.liveTime) : 0;
    return buildMatchLineups(
      dbPlayers,
      currentMatch.teams.homeShort,
      currentMatch.teams.awayShort,
      currentMatch.id,
      statusMap[currentMatch.status],
      minute,
      officialSource,
      lang,
    );
  }, [dbPlayers, currentMatch, officialSource, lang]);

  // ── Match change handler ────────────────────────────────────────────────────
  const handleMatchChange = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveZone('none');

    const nextMatch = fixturesWithOverrides.find((m) => m.id === matchId) ?? fixturesWithOverrides[0];
    const nextMinute = nextMatch.liveTime ? parseInt(nextMatch.liveTime) : 0;
    const nextLineups = buildMatchLineups(
      dbPlayers,
      nextMatch.teams.homeShort,
      nextMatch.teams.awayShort,
      nextMatch.id,
      nextMatch.status === 'live' ? 'live' : nextMatch.status === 'post-match' ? 'post-match' : 'pre-match',
      nextMinute,
      officialSource,
      lang,
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

  const stadiumCanvasRef = useRef<HTMLDivElement>(null);

  const handleScreenshot = async () => {
    // Find the canvas element inside the stadium and export it as PNG
    const canvasEl = stadiumCanvasRef.current?.querySelector('canvas');
    if (!canvasEl) {
      // Fallback: copy URL
      navigator.clipboard.writeText(window.location.href);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
      return;
    }
    try {
      const dataUrl = canvasEl.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `estadio-${currentMatch.teams.homeShort}-vs-${currentMatch.teams.awayShort}.png`;
      link.click();
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    } catch {
      // Canvas may be tainted — fallback to URL copy
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }
  };

  // ── Zone overlay ────────────────────────────────────────────────────────────
  function getZoneTitleAndInfo() {
    const insights =
      lang === 'en' ? currentMatch.pitchZoneInsightsEn ?? currentMatch.pitchZoneInsights : currentMatch.pitchZoneInsights;
    switch (activeZone) {
      case 'field':
        return { title: t('estadio3d.zoneFieldTitle'), info: insights.field, accent: 'var(--accent-emerald)' };
      case 'stands':
        return { title: t('estadio3d.zoneStandsTitle'), info: insights.stands, accent: 'var(--accent-blue)' };
      case 'screens':
        return { title: t('estadio3d.zoneScreensTitle'), info: insights.screens, accent: 'var(--accent-violet)' };
      case 'lights':
        return { title: t('estadio3d.zoneLightsTitle'), info: insights.lights, accent: 'var(--accent-cyan)' };
      default:
        return null;
    }
  }

  const zoneOverlay = getZoneTitleAndInfo();

  // ── Weather icon/label ──────────────────────────────────────────────────────
  const getWeatherDetails = () => {
    switch (currentMatch.weather) {
      case 'rain':
        return { icon: <CloudRain size={16} style={{ color: 'var(--accent-blue)' }} />, label: t('estadio3d.weatherRain'), temp: '14°C' };
      case 'fog':
        return { icon: <CloudFog size={16} style={{ color: 'var(--text-muted)' }} />, label: t('estadio3d.weatherFog'), temp: '8°C' };
      case 'snow':
        return { icon: <Snowflake size={16} style={{ color: '#ffffff' }} />, label: t('estadio3d.weatherSnow'), temp: '1°C' };
      case 'clear':
      default:
        return { icon: <Moon size={16} style={{ color: 'var(--accent-cyan)' }} />, label: t('estadio3d.weatherClear'), temp: '22°C' };
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

  const statusLabel = currentMatch.status === 'live' ? t('estadio3d.live') : currentMatch.status === 'pre-match' ? t('estadio3d.preMatch') : t('estadio3d.finished');
  const statusBg = currentMatch.status === 'live' ? 'rgba(16,185,129,0.12)' : 'rgba(94,163,184,0.12)';
  const statusBorder = currentMatch.status === 'live' ? 'rgba(16,185,129,0.3)' : 'rgba(94,163,184,0.3)';
  const statusColor = currentMatch.status === 'live' ? 'var(--accent-emerald)' : 'var(--tx-2)';

  return (
    <div
      className={`stadium-feature-root ${modoInmersivo ? 'stadium-immersive-mode' : 'stadium-integrated-mode'}`}
      data-stadium-version="v0.2.2-opus-stadium-layout-reset"
    >
      <div className="stadium-page">

        {/* ═══════════ ZONE 1: Header + Toolbar ═══════════ */}
        <div className="stadium-header-card">
          <div className="stadium-title-row">
            <span className="stadium-title-label">{t('estadio3d.title')}</span>
            {matchesLoading && <span className="stadium-status-tag">{t('estadio3d.loadingSchedule')}</span>}
            {!matchesLoading && currentMatch.isPending && <span className="stadium-status-tag">{t('estadio3d.localSchedule')}</span>}
          </div>
          <div className="stadium-toolbar-grid">
            <div className="segmented-control">
              <button type="button" className={`segmented-btn ${!modoInmersivo ? 'active' : ''}`} onClick={() => setModoInmersivo(false)}>{t('estadio3d.modeClear')}</button>
              <button type="button" className={`segmented-btn ${modoInmersivo ? 'active' : ''}`} onClick={() => setModoInmersivo(true)}>{t('estadio3d.modeImmersive')}</button>
            </div>
            <div className="segmented-control">
              <button type="button" className={`segmented-btn ${!webGlFallback ? 'active' : ''}`} onClick={() => setWebGlFallback(false)}>3D</button>
              <button type="button" className={`segmented-btn ${webGlFallback ? 'active' : ''}`} onClick={() => setWebGlFallback(true)}>2D</button>
            </div>
            <div className="segmented-control">
              <button type="button" className={`segmented-btn ${currentMatch.timeOfDay === 'day' ? 'active' : ''}`} onClick={() => handleTimeChange('day')}><Sun size={11} /> {t('estadio3d.day')}</button>
              <button type="button" className={`segmented-btn ${currentMatch.timeOfDay === 'night' ? 'active' : ''}`} onClick={() => handleTimeChange('night')}><Moon size={11} /> {t('estadio3d.night')}</button>
            </div>
            <div className="segmented-control" style={{ opacity: webGlFallback ? 0.4 : 1, pointerEvents: webGlFallback ? 'none' : 'auto' }}>
              <button type="button" className={`segmented-btn ${!reduceEffects ? 'active' : ''}`} onClick={() => setReduceEffects(false)}><Eye size={11} /> FX</button>
              <button type="button" className={`segmented-btn ${reduceEffects ? 'active' : ''}`} onClick={() => setReduceEffects(true)}><EyeOff size={11} /> Lite</button>
            </div>
            <button type="button" className={`stadium-btn-sm ${shareFeedback ? 'active' : ''}`} onClick={handleShare}>
              <Share2 size={11} />{shareFeedback ? t('estadio3d.copied') : t('estadio3d.share')}
            </button>
            <button type="button" className={`stadium-btn-sm ${shareFeedback ? 'active' : ''}`} onClick={handleScreenshot} title={t('estadio3d.screenshotTitle')}>
              <Share2 size={11} />{t('estadio3d.screenshot')}
            </button>
          </div>
        </div>

        {/* ═══════════ ZONE 2: Match Context (outside canvas — no overlap possible) ═══════════ */}
        <div className="stadium-match-card">
          <div className="team-summary">
            <TeamCrest code={currentMatch.teams.homeShort} size={22} />
            <TeamFlag code={currentMatch.teams.homeShort} size={12} />
          </div>

          <div className="match-selector-center">
            <select
              className="match-select-control"
              value={selectedMatchId}
              onChange={(e) => handleMatchChange(e.target.value)}
            >
              {fixturesWithOverrides.map((match) => (
                <option key={match.id} value={match.id} style={{ background: 'var(--bg-1)', color: 'var(--tx)' }}>
                  {matchLabel(match)}
                </option>
              ))}
            </select>
            <span className="match-context-label">
              {currentMatch.group} · {statusLabel}
              {currentMatch.isPending && ` · ${t('estadio3d.localSchedule')}`}
              {currentMatch.isDemo && ` · ${t('estadio3d.demoData')}`}
            </span>
          </div>

          <div className="team-summary">
            <TeamFlag code={currentMatch.teams.awayShort} size={12} />
            <TeamCrest code={currentMatch.teams.awayShort} size={22} />
          </div>

          <span className="match-status-badge" style={{ background: statusBg, borderColor: statusBorder, color: statusColor }}>
            <span className="status-dot-mini" style={{ backgroundColor: statusColor }} />
            {currentMatch.status === 'live' ? t('estadio3d.live') : currentMatch.status === 'pre-match' ? t('estadio3d.preview') : t('estadio3d.final')}
          </span>

          {/* Camera controls — in same bar, far right, never collides */}
          <div className="camera-controls-row">
            <button className={`camera-toggle-btn ${cameraView === 'tactica' ? 'active' : ''}`} onClick={() => setCameraView('tactica')}>
              {cameraView === 'tactica' && <span className="toggle-dot" />}{t('estadio3d.tactical')}
            </button>
            <button className={`camera-toggle-btn ${cameraView === 'transmision' ? 'active' : ''}`} onClick={() => setCameraView('transmision')}>
              {cameraView === 'transmision' && <span className="toggle-dot" />}{t('estadio3d.tv')}
            </button>
          </div>
        </div>

        {/* ═══════════ ZONE 3: Workspace Grid (canvas + side panel) ═══════════ */}
        <div className="stadium-workspace-grid">

          {/* Left: 3D/2D Visualization */}
          <div className="stadium-visual-card">
            <div className="stadium-canvas-shell" ref={stadiumCanvasRef}>
              {/* Only tiny overlay hints inside canvas — no major UI */}
              <div className="canvas-hint-pill">
                {t('estadio3d.canvasHint')}
              </div>

              {!webGlFallback ? (
                <WebGLBoundary
                  fallback={
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <div className="webgl-error-banner">
                        ⚠️ <strong>{t('estadio3d.webglFailTitle')}</strong> {t('estadio3d.webglFailBody')}
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
            </div>

            {/* Zone overlay — OUTSIDE canvas, in normal flow below it */}
            {zoneOverlay && (
              <div className="zone-info-card" style={{ borderLeftColor: zoneOverlay.accent }}>
                <div className="zone-info-header">
                  <h4 style={{ color: zoneOverlay.accent }}>{zoneOverlay.title}</h4>
                  <button onClick={() => setActiveZone('none')} className="zone-close-btn"><X size={13} /></button>
                </div>
                <p className="zone-info-text">{zoneOverlay.info}</p>
                <div className="zone-info-hint">
                  <Info size={10} />
                  <span>
                    {currentMatch.isPending
                      ? t('estadio3d.zoneHintPending')
                      : t('estadio3d.zoneHintLive')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Side Panel (player card or AI brief) — normal flow, never overlays canvas */}
          <section className="stadium-side-panel">
            <div
              className="side-panel-glass"
              style={selectedPlayerMapped ? {
                borderColor: selectedPlayerMapped.position === 'GK' ? '#fbbf24' : getTeamVisualIdentity(selectedPlayerMapped.team).primaryColor,
              } : undefined}
            >
              {selectedPlayerMapped ? (
                <SelectedPlayerPanel
                  player={selectedPlayerMapped}
                  onClose={() => setSelectedPlayer(null)}
                  weather={currentMatch.weather}
                  status={currentMatch.status}
                />
              ) : (
                <FormationOverlay
                  match={currentMatch}
                  onSelectPlayer={setSelectedPlayer}
                  selectedPlayerId={null}
                  lineups={mappedLineups}
                />
              )}
            </div>
          </section>
        </div>

        {/* ═══════════ ZONE 4: Tactical Widgets (full-width, below workspace) ═══════════ */}
        <div className="stadium-tactical-grid">
          <div className="tactical-widget-card">
            <div>
              <span className="widget-label">{t('estadio3d.possession')}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span className="num" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>• 52%</span>
                <span className="num" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>• 48%</span>
              </div>
            </div>
            <div className="widget-chart-wrapper">
              <svg width="30" height="30" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--line)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--accent-cyan)" strokeWidth="3.5" strokeDasharray="52 48" strokeDashoffset="25" />
              </svg>
            </div>
          </div>

          <div className="tactical-widget-card">
            <div>
              <span className="widget-label">{t('estadio3d.pressure')}</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--tx)', marginTop: '4px' }}>{t('estadio3d.pressureHigh')}</div>
            </div>
            <div className="signal-bars">
              <span className="bar filled" /><span className="bar filled" /><span className="bar filled" /><span className="bar filled" /><span className="bar" />
            </div>
          </div>

          <div className="tactical-widget-card">
            <div><span className="widget-label">{t('estadio3d.mentality')}</span></div>
            <div className="toggle-group">
              <button className={`toggle-btn ${mentalidad === 'equilibrada' ? 'active' : ''}`} onClick={() => setMentalidad('equilibrada')}>
                <span className="bullet" />{t('estadio3d.mentalityBalanced')}
              </button>
              <button className={`toggle-btn ${mentalidad === 'ofensiva' ? 'active' : ''}`} onClick={() => setMentalidad('ofensiva')}>
                <span className="bullet" />{t('estadio3d.mentalityOffensive')}
              </button>
            </div>
          </div>

          <div className="tactical-widget-card">
            <div>
              <span className="widget-label">{t('estadio3d.tempo')}</span>
              <div className="toggle-group">
                <button className={`toggle-btn ${ritmo === 'moderado' ? 'active' : ''}`} onClick={() => setRitmo('moderado')}>{t('estadio3d.tempoModerate')}</button>
                <button className={`toggle-btn ${ritmo === 'alto' ? 'active' : ''}`} onClick={() => setRitmo('alto')}>{t('estadio3d.tempoHigh')}</button>
              </div>
            </div>
            <div className="widget-chart-wrapper">
              <svg width="36" height="20" viewBox="0 0 50 28">
                <path d="M 5,25 A 20,20 0 0,1 45,25" fill="none" stroke="var(--line)" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 5,25 A 20,20 0 0,1 45,25" fill="none" stroke="var(--accent-cyan)" strokeWidth="4" strokeLinecap="round" strokeDasharray={ritmo === 'alto' ? '63' : '31.5'} />
                <line x1="25" y1="25" x2={ritmo === 'alto' ? '39' : '25'} y2={ritmo === 'alto' ? '11' : '5'} stroke="var(--tx)" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all 0.4s ease', transformOrigin: '25px 25px' }} />
                <circle cx="25" cy="25" r="3.5" fill="var(--tx)" />
              </svg>
            </div>
          </div>

          <div className="tactical-widget-card interactive-card" onClick={cycleWeather} style={{ cursor: 'pointer' }} title={t('estadio3d.weatherToggleTitle')}>
            <div>
              <span className="widget-label">{t('estadio3d.weather')}</span>
              <div style={{ fontSize: '0.68rem', color: 'var(--tx-2)', marginTop: '2px', fontWeight: 600 }}>{weatherDetails.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--tx)', fontWeight: 700 }}>{weatherDetails.temp}</div>
            </div>
            <div className="widget-chart-wrapper" style={{ background: 'var(--bg-2)', borderRadius: '50%', padding: '5px' }}>
              {weatherDetails.icon}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
