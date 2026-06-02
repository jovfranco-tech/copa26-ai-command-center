import { useState } from 'react';
import './index.css';
import { MATCH_FIXTURES } from './data/matchData';
import type { Match } from './data/matchData';
import { StadiumScene } from './components/StadiumScene';
import { Tactical2DMap } from './components/Tactical2DMap';
import { AIMatchBrief } from './components/AIMatchBrief';
import { SelectedPlayerPanel } from './components/SelectedPlayerPanel';
import type { Player } from './data/lineups';
import { 
  Trophy, 
  Map, 
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

function App() {
  const [fixtures, setFixtures] = useState<Match[]>(MATCH_FIXTURES);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('match-1');
  const [reduceEffects, setReduceEffects] = useState<boolean>(false);
  const [webGlFallback, setWebGlFallback] = useState<boolean>(false);
  const [activeZone, setActiveZone] = useState<'none' | 'field' | 'stands' | 'screens' | 'lights'>('none');
  const [cameraView, setCameraView] = useState<'general' | 'transmision' | 'tactica' | 'porteria' | 'alineaciones'>('alineaciones');
  const [cameraResetTrigger] = useState<number>(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [visualizationMode] = useState<'nombres' | 'compactas' | 'seleccionar' | 'limpia'>('seleccionar');
  const [showTacticalZones] = useState<boolean>(true);

  // New states for visual alignment with mockup
  const [mentalidad, setMentalidad] = useState<'equilibrada' | 'ofensiva'>('equilibrada');
  const [ritmo, setRitmo] = useState<'moderado' | 'alto'>('moderado');
  const [shareFeedback, setShareFeedback] = useState<boolean>(false);

  // Lookup currently selected match
  const currentMatchIndex = fixtures.findIndex(m => m.id === selectedMatchId);
  const currentMatch = fixtures[currentMatchIndex] || fixtures[0];

  // Handler to update selected fixture
  const handleMatchChange = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveZone('none');
    setSelectedPlayer(null);
  };

  // Handler to update selected match status
  const handleStatusChange = (status: 'pre-match' | 'live' | 'post-match') => {
    const updated = [...fixtures];
    updated[currentMatchIndex] = {
      ...currentMatch,
      status,
      score: status === 'pre-match' 
        ? { home: 0, away: 0 } 
        : status === 'live' 
        ? { home: 3, away: 2 } 
        : { home: 1, away: 3 },
      liveTime: status === 'live' ? "82'" : undefined
    };
    setFixtures(updated);
  };

  // Cycle match status on overlay click (Previa -> En Vivo -> Finalizado)
  const cycleStatus = () => {
    const statuses: ('pre-match' | 'live' | 'post-match')[] = ['pre-match', 'live', 'post-match'];
    const currentIndex = statuses.indexOf(currentMatch.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    handleStatusChange(statuses[nextIndex]);
  };

  // Handler to change environment weather
  const handleWeatherChange = (weather: 'clear' | 'rain' | 'snow' | 'fog') => {
    const updated = [...fixtures];
    updated[currentMatchIndex] = {
      ...currentMatch,
      weather
    };
    setFixtures(updated);
  };

  // Handler to change environment time of day
  const handleTimeChange = (timeOfDay: 'day' | 'sunset' | 'night') => {
    const updated = [...fixtures];
    updated[currentMatchIndex] = {
      ...currentMatch,
      timeOfDay
    };
    setFixtures(updated);
  };

  // Click handler for Share
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareFeedback(true);
    setTimeout(() => setShareFeedback(false), 2000);
  };

  // Toggle between day and night modes
  const toggleTimeOfDay = () => {
    const nextTime = currentMatch.timeOfDay === 'day' ? 'night' : 'day';
    handleTimeChange(nextTime);
  };

  // Cycle through weather options for clima táctico
  const cycleWeather = () => {
    const weathers: ('clear' | 'rain' | 'fog' | 'snow')[] = ['clear', 'rain', 'fog', 'snow'];
    const currentIndex = weathers.indexOf(currentMatch.weather);
    const nextIndex = (currentIndex + 1) % weathers.length;
    
    // Auto-update time of day as well to fit weather mood
    const nextWeather = weathers[nextIndex];
    handleWeatherChange(nextWeather);
    
    if (nextWeather === 'clear') {
      handleTimeChange('day'); // Day mode for clear weather
    } else if (nextWeather === 'rain') {
      handleTimeChange('sunset'); // Sunset rain
    } else {
      handleTimeChange('night'); // Night mode for fog/snow
    }
  };

  const zoneOverlay = getZoneTitleAndInfo();

  // Helper to retrieve weather icon and text details
  const getWeatherDetails = () => {
    switch (currentMatch.weather) {
      case 'rain':
        return {
          icon: <CloudRain size={16} style={{ color: 'var(--accent-blue)' }} />,
          label: 'Lluvia intensa',
          temp: '14°C'
        };
      case 'fog':
        return {
          icon: <CloudFog size={16} style={{ color: 'var(--text-muted)' }} />,
          label: 'Niebla densa',
          temp: '8°C'
        };
      case 'snow':
        return {
          icon: <Snowflake size={16} style={{ color: '#ffffff' }} />,
          label: 'Nieve ligera',
          temp: '1°C'
        };
      case 'clear':
      default:
        return {
          icon: <Moon size={16} style={{ color: 'var(--accent-cyan)' }} />,
          label: 'Cielo despejado',
          temp: '22°C'
        };
    }
  };

  const weatherDetails = getWeatherDetails();

  // Text info for clickable zone overlays (Mexican Spanish)
  function getZoneTitleAndInfo() {
    switch (activeZone) {
      case 'field':
        return {
          title: 'Estrategia y Táctica del Campo',
          info: currentMatch.pitchZoneInsights.field,
          accent: 'var(--accent-emerald)'
        };
      case 'stands':
        return {
          title: 'Energía de la Afición y Gradas',
          info: currentMatch.pitchZoneInsights.stands,
          accent: 'var(--accent-blue)'
        };
      case 'screens':
        return {
          title: 'Marcador y Transmisión de Pantallas',
          info: currentMatch.pitchZoneInsights.screens,
          accent: 'var(--accent-violet)'
        };
      case 'lights':
        return {
          title: 'Torres de Iluminación del Estadio',
          info: currentMatch.pitchZoneInsights.lights,
          accent: 'var(--accent-cyan)'
        };
      default:
        return null;
    }
  }

  return (
    <div className="app-container">
      {/* Premium Dashboard Header in Spanish */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-badge">PROTOTIPO DE ANÁLISIS</div>
          <h1 className="brand-title">
            <Trophy size={20} style={{ color: 'var(--accent-cyan)' }} />
            Laboratorio de Estadio 3D
          </h1>
        </div>

        {/* Global Settings & Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* WebGL Fallback Mode */}
          <button 
            className={`stadium-btn ${webGlFallback ? 'active' : ''}`}
            onClick={() => setWebGlFallback(!webGlFallback)}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            title="Cambia entre la vista 3D interactiva y el respaldo vectorizado en 2D"
          >
            <Map size={14} />
            {webGlFallback ? 'Forzar Vista 3D' : 'Forzar Respaldo 2D'}
          </button>

          {/* Day / Night Mode Toggle */}
          <button 
            className={`stadium-btn ${currentMatch.timeOfDay === 'day' ? 'active' : ''}`}
            onClick={toggleTimeOfDay}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            title="Cambiar entre modo Día y modo Noche"
          >
            {currentMatch.timeOfDay === 'day' ? <Sun size={14} /> : <Moon size={14} />}
            {currentMatch.timeOfDay === 'day' ? 'Entorno: Día' : 'Entorno: Noche'}
          </button>

          {/* Reduce Effects Performance Toggle */}
          <button 
            className={`stadium-btn ${reduceEffects ? 'active' : ''}`}
            onClick={() => setReduceEffects(!reduceEffects)}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            disabled={webGlFallback}
            title="Desactiva sombras en tiempo real y partículas de clima de alta densidad para mayor fluidez"
          >
            {reduceEffects ? <EyeOff size={14} /> : <Eye size={14} />}
            {reduceEffects ? 'Efectos: Reducidos' : 'Efectos: Completos'}
          </button>

          {/* Share Button (Mockup visual addition) */}
          <button 
            className={`stadium-btn share-btn ${shareFeedback ? 'active' : ''}`}
            onClick={handleShare}
            style={{ 
              fontSize: '0.8rem', 
              padding: '6px 12px', 
              color: 'var(--accent-cyan)', 
              borderColor: 'rgba(0, 242, 254, 0.2)',
              position: 'relative'
            }}
            title="Compartir enlace de análisis deportivo"
          >
            <Share2 size={14} style={{ color: 'var(--accent-cyan)' }} />
            {shareFeedback ? '¡Copiado!' : 'Compartir'}
          </button>
        </div>
      </header>

      {/* Main Grid Workspace: Aligned to 2 Columns (1fr 380px) */}
      <main className="app-main">
        
        {/* COLUMN 1: VISUALIZATION PANELS + TACTICAL BOTTOM CARD ROW */}
        <section className="left-viewport-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>
          
          {/* Spatial Canvas Container */}
          <div className="canvas-wrapper" style={{ flex: 1, position: 'relative', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* OVERLAY: Top-Left Match Info & Selector */}
            <div className="canvas-overlay-top-left">
              <div className="match-title-group" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <select 
                    className="match-select-overlay"
                    value={selectedMatchId}
                    onChange={(e) => handleMatchChange(e.target.value)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      paddingRight: '16px',
                      appearance: 'none',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)'
                    }}
                  >
                    {fixtures.map(match => (
                      <option key={match.id} value={match.id} style={{ background: '#090d22', color: '#ffffff' }}>
                        {match.teams.home} vs {match.teams.away}
                      </option>
                    ))}
                  </select>
                  <span style={{ pointerEvents: 'none', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #94a3b8', display: 'inline-block', marginLeft: '-10px' }} />
                </div>
                <span className="match-desc-label" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                  {currentMatch.group} · {currentMatch.status === 'live' ? 'Final reimaginada' : currentMatch.status === 'pre-match' ? 'Pre-partido' : 'Finalizado'}
                </span>
              </div>
              <span 
                className="live-badge-glow" 
                onClick={cycleStatus}
                style={{ 
                  background: currentMatch.status === 'live' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(94, 163, 184, 0.12)', 
                  borderColor: currentMatch.status === 'live' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(94, 163, 184, 0.3)', 
                  color: currentMatch.status === 'live' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
                title="Haga clic para simular cambiar el estado del partido"
              >
                <span className="live-dot" style={{ backgroundColor: currentMatch.status === 'live' ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}></span>
                {currentMatch.status === 'live' ? 'En Vivo' : currentMatch.status === 'pre-match' ? 'Previa' : 'Final'}
              </span>
            </div>

            {/* OVERLAY: Top-Middle Help Pill */}
            <div className="canvas-overlay-top-middle">
              Arrastra para orbitar | Rueda para zoom | Clic derecho para desplazar
            </div>

            {/* OVERLAY: Top-Right Quick Camera Toggles */}
            <div className="canvas-overlay-top-right">
              <button 
                className={`camera-toggle-btn ${cameraView === 'tactica' ? 'active' : ''}`}
                onClick={() => setCameraView('tactica')}
                title="Cambiar a vista de plano cenital vertical"
              >
                {cameraView === 'tactica' && <span className="toggle-dot"></span>}
                Cámara táctica
              </button>
              <button 
                className={`camera-toggle-btn ${cameraView === 'transmision' ? 'active' : ''}`}
                onClick={() => setCameraView('transmision')}
                title="Cambiar a vista lateral tipo transmisión de TV"
              >
                {cameraView === 'transmision' && <span className="toggle-dot"></span>}
                Vista TV
              </button>
            </div>

            {/* 3D R3F Viewport or 2D Chalkboard Fallback */}
            {!webGlFallback ? (
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
              />
            ) : (
              <Tactical2DMap 
                match={currentMatch}
                activeZone={activeZone}
                onZoneClick={(zone) => setActiveZone(activeZone === zone ? 'none' : zone)}
                selectedPlayerId={selectedPlayer ? selectedPlayer.id : null}
                onSelectPlayer={setSelectedPlayer}
              />
            )}

            {/* Interactive Floating Card Overlay */}
            {zoneOverlay && (
              <div className="overlay-card pulse-glow-border" style={{ borderLeft: `3px solid ${zoneOverlay.accent}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: zoneOverlay.accent }}>
                    {zoneOverlay.title}
                  </h4>
                  <button 
                    onClick={() => setActiveZone('none')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {zoneOverlay.info}
                </p>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '8px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                  <Info size={10} />
                  <span>Interactúa con las zonas en 3D para ver telemetría.</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tactical Stats Bar (Horizontal 5-Widget Row) */}
          <div className="tactical-stats-bar">
            
            {/* Widget 1: Posesión Estimada */}
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
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15.915" 
                    fill="none" 
                    stroke="var(--accent-cyan)" 
                    strokeWidth="3.5" 
                    strokeDasharray="52 48" 
                    strokeDashoffset="25" 
                  />
                </svg>
              </div>
            </div>

            {/* Widget 2: Presión Actual */}
            <div className="tactical-widget-card">
              <div>
                <span className="widget-label">Presión actual</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Alta
                </div>
              </div>
              <div className="signal-bars">
                <span className="bar filled"></span>
                <span className="bar filled"></span>
                <span className="bar filled"></span>
                <span className="bar filled"></span>
                <span className="bar"></span>
              </div>
            </div>

            {/* Widget 3: Mentalidad (Interactive Toggle) */}
            <div className="tactical-widget-card" style={{ flexGrow: 1.1 }}>
              <div>
                <span className="widget-label">Mentalidad</span>
              </div>
              <div className="toggle-group">
                <button 
                  className={`toggle-btn ${mentalidad === 'equilibrada' ? 'active' : ''}`}
                  onClick={() => setMentalidad('equilibrada')}
                  title="Bloques e intensidades posicionales balanceadas"
                >
                  <span className="bullet"></span>
                  Equilibrada
                </button>
                <button 
                  className={`toggle-btn ${mentalidad === 'ofensiva' ? 'active' : ''}`}
                  onClick={() => setMentalidad('ofensiva')}
                  title="Fuerza proyección de líneas de ataque y carrileros"
                >
                  <span className="bullet"></span>
                  Ofensiva
                </button>
              </div>
            </div>

            {/* Widget 4: Ritmo de Juego (Interactive Speed Toggle) */}
            <div className="tactical-widget-card" style={{ flexGrow: 1.1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="widget-label">Ritmo de juego</span>
                <div className="toggle-group" style={{ marginTop: '2px' }}>
                  <button 
                    className={`toggle-btn ${ritmo === 'moderado' ? 'active' : ''}`}
                    onClick={() => setRitmo('moderado')}
                    title="Simulación táctica en velocidad estándar"
                  >
                    Moderado
                  </button>
                  <button 
                    className={`toggle-btn ${ritmo === 'alto' ? 'active' : ''}`}
                    onClick={() => setRitmo('alto')}
                    title="Simulación táctica acelerada"
                  >
                    Alto
                  </button>
                </div>
              </div>
              <div className="widget-chart-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="40" height="22" viewBox="0 0 50 28">
                  <path d="M 5,25 A 20,20 0 0,1 45,25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" strokeLinecap="round" />
                  <path 
                    d="M 5,25 A 20,20 0 0,1 45,25" 
                    fill="none" 
                    stroke="var(--accent-cyan)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    strokeDasharray={ritmo === 'alto' ? '63' : '31.5'} 
                  />
                  <line 
                    x1="25" y1="25" 
                    x2={ritmo === 'alto' ? "39" : "25"} 
                    y2={ritmo === 'alto' ? "11" : "5"} 
                    stroke="#ffffff" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    style={{ transition: 'all 0.4s ease', transformOrigin: '25px 25px' }}
                  />
                  <circle cx="25" cy="25" r="3.5" fill="#ffffff" />
                </svg>
              </div>
            </div>

            {/* Widget 5: Clima Táctico (Interactive Cycling Card) */}
            <div 
              className="tactical-widget-card interactive-card" 
              onClick={cycleWeather} 
              style={{ cursor: 'pointer' }}
              title="Haz clic para alternar climas (Despejado -> Lluvia -> Niebla -> Nieve)"
            >
              <div>
                <span className="widget-label">Clima táctico</span>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                  {weatherDetails.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, marginTop: '1px' }}>
                  {weatherDetails.temp}
                </div>
              </div>
              <div className="widget-chart-wrapper" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {weatherDetails.icon}
              </div>
            </div>

          </div>

        </section>
        
        {/* COLUMN 2: SIDEBAR - Hibrid Panel (Lineups 2D / Selected Player Panel) */}
        <section className="panel-container">
          <div className="glass-panel" style={{ height: '100%' }}>
            {selectedPlayer ? (
              <SelectedPlayerPanel 
                player={selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                weather={currentMatch.weather}
                status={currentMatch.status}
              />
            ) : (
              <AIMatchBrief 
                match={currentMatch} 
                onSelectPlayer={setSelectedPlayer}
                selectedPlayerId={null}
              />
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
