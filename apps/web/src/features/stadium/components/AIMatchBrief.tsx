import React from 'react';
import type { Match } from '../data/matchData';
import type { MatchLineups, Player } from '../data/lineups';
import { getTeamVisualIdentity } from '../data/teamVisualIdentity';

interface AIMatchBriefProps {
  match: Match;
  onSelectPlayer: (player: Player | null) => void;
  selectedPlayerId: string | null;
  lineups?: MatchLineups;
}

/**
 * Hand-authored 2D mini-pitch coordinates for the 8 "marquee" teams only — a
 * deliberate visual-polish layer (flat back line, clean winger spread) that reads
 * better than the auto-derivation for the most-viewed sides. This is intentional
 * curation, NOT duplication of data: every other team is positioned by
 * derive2DCoord() from its real 3D x/z. Keep both in sync if a template's 3D
 * coordinates change.
 */
const COORD_REGISTRY: Record<string, { x: number; y: number }> = {
  // MEX
  'mex-gk': { x: 50, y: 112 },
  'mex-lb': { x: 18, y: 88 },
  'mex-cb-l': { x: 38, y: 92 },
  'mex-cb-r': { x: 62, y: 92 },
  'mex-rb': { x: 82, y: 88 },
  'mex-cm-l': { x: 28, y: 65 },
  'mex-dm': { x: 50, y: 68 },
  'mex-cm-r': { x: 72, y: 65 },
  'mex-rw': { x: 22, y: 38 },
  'mex-st': { x: 50, y: 40 },
  'mex-lw': { x: 78, y: 38 },
  // RSA
  'rsa-gk': { x: 50, y: 112 },
  'rsa-lb': { x: 18, y: 88 },
  'rsa-cb-l': { x: 38, y: 92 },
  'rsa-cb-r': { x: 62, y: 92 },
  'rsa-rb': { x: 82, y: 88 },
  'rsa-cm-l': { x: 28, y: 65 },
  'rsa-dm': { x: 50, y: 68 },
  'rsa-cm-r': { x: 72, y: 65 },
  'rsa-rw': { x: 22, y: 38 },
  'rsa-st': { x: 50, y: 40 },
  'rsa-lw': { x: 78, y: 38 },
  // ARG
  'arg-gk': { x: 50, y: 112 },
  'arg-lb': { x: 18, y: 88 },
  'arg-cb-l': { x: 38, y: 92 },
  'arg-cb-r': { x: 62, y: 92 },
  'arg-rb': { x: 82, y: 88 },
  'arg-cm-l': { x: 28, y: 65 },
  'arg-dm': { x: 50, y: 68 },
  'arg-cm-r': { x: 72, y: 65 },
  'arg-rw': { x: 22, y: 38 },
  'arg-st': { x: 50, y: 40 },
  'arg-ss': { x: 78, y: 38 },
  // FRA
  'fra-gk': { x: 50, y: 112 },
  'fra-lb': { x: 18, y: 88 },
  'fra-cb-l': { x: 38, y: 92 },
  'fra-cb-r': { x: 62, y: 92 },
  'fra-rb': { x: 82, y: 88 },
  'fra-dm-l': { x: 34, y: 68 },
  'fra-dm-r': { x: 66, y: 68 },
  'fra-lw': { x: 20, y: 44 },
  'fra-cam': { x: 50, y: 46 },
  'fra-rw': { x: 80, y: 44 },
  'fra-st': { x: 50, y: 22 },
  // BRA
  'bra-gk': { x: 50, y: 112 },
  'bra-rb': { x: 82, y: 88 },
  'bra-cb-r': { x: 62, y: 92 },
  'bra-cb-l': { x: 38, y: 92 },
  'bra-lb': { x: 18, y: 88 },
  'bra-dm': { x: 38, y: 68 },
  'bra-cm': { x: 62, y: 68 },
  'bra-rw': { x: 82, y: 38 },
  'bra-st-r': { x: 60, y: 30 },
  'bra-st-l': { x: 40, y: 30 },
  'bra-lw': { x: 18, y: 38 },
  // GER
  'ger-gk': { x: 50, y: 112 },
  'ger-rcb': { x: 65, y: 92 },
  'ger-cb': { x: 50, y: 94 },
  'ger-lcb': { x: 35, y: 92 },
  'ger-rwb': { x: 82, y: 76 },
  'ger-lwb': { x: 18, y: 76 },
  'ger-dm': { x: 50, y: 70 },
  'ger-am-r': { x: 65, y: 50 },
  'ger-am-l': { x: 35, y: 50 },
  'ger-st-r': { x: 60, y: 26 },
  'ger-st-l': { x: 40, y: 26 },
  // ESP
  'esp-gk': { x: 50, y: 112 },
  'esp-rb': { x: 82, y: 88 },
  'esp-cb-r': { x: 62, y: 92 },
  'esp-cb-l': { x: 38, y: 92 },
  'esp-lb': { x: 18, y: 88 },
  'esp-dm': { x: 50, y: 68 },
  'esp-cm-r': { x: 72, y: 65 },
  'esp-cm-l': { x: 28, y: 65 },
  'esp-rw': { x: 80, y: 38 },
  'esp-st': { x: 50, y: 30 },
  'esp-lw': { x: 20, y: 38 },
  // NED
  'ned-gk': { x: 50, y: 112 },
  'ned-rwb': { x: 82, y: 78 },
  'ned-rcb': { x: 65, y: 92 },
  'ned-cb': { x: 50, y: 94 },
  'ned-lcb': { x: 35, y: 92 },
  'ned-lwb': { x: 18, y: 78 },
  'ned-dm': { x: 50, y: 70 },
  'ned-cm-r': { x: 68, y: 50 },
  'ned-cm-l': { x: 32, y: 50 },
  'ned-st-r': { x: 60, y: 28 },
  'ned-st-l': { x: 40, y: 28 },
};

/**
 * Teams without a hand-authored 2D map (everyone outside the 8 templates) derive
 * their pitch dot from the player's real 3D coordinates (x = depth ±28, z = width
 * ±16), so the formation spreads out instead of collapsing every defender /
 * midfielder onto a single point.
 */
function derive2DCoord(player: Player): { x: number; y: number } {
  const depth = Math.min(28, Math.abs(player.x ?? 0));
  const y = Math.max(22, Math.min(114, 21.5 + depth * 3.23)); // GK (|x|≈28) bottom → FW top
  const x = Math.max(13, Math.min(87, 50 - ((player.z ?? 0) / 16) * 32));
  return { x, y };
}

export const AIMatchBrief: React.FC<AIMatchBriefProps> = ({
  match,
  onSelectPlayer,
  selectedPlayerId,
  lineups,
}) => {
  // Safely resolve lineups — fall back to empty arrays if not provided
  const homePlayers = lineups?.teams?.home?.players ?? [];
  const awayPlayers = lineups?.teams?.away?.players ?? [];

  const homeCode = lineups?.teams?.home?.teamCode ?? match.teams.homeShort;
  const awayCode = lineups?.teams?.away?.teamCode ?? match.teams.awayShort;

  const homeIdentity = getTeamVisualIdentity(homeCode, true);
  const awayIdentity = getTeamVisualIdentity(awayCode, false);

  // Ensure colors are always readable (not white-on-white)
  const homeColor = homeIdentity.primaryColor;
  const awayColor = awayIdentity.primaryColor === '#ffffff' || awayIdentity.primaryColor === '#dfe3ea'
    ? awayIdentity.accentColor
    : awayIdentity.primaryColor;

  // Helper to render a vertical pitch SVG
  const renderVerticalPitch = (players: Player[], side: 'home' | 'away') => {
    return (
      <svg 
        viewBox="0 0 100 130" 
        style={{
          width: '100%',
          maxWidth: '270px',
          margin: '0 auto',
          display: 'block',
          borderRadius: '10px',
          background: 'var(--stadium-pitch-bg, radial-gradient(circle at 50% 50%, #0d1530 0%, #05070e 100%))',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--glass-shadow)',
          transition: 'all 0.3s'
        }}
      >
        {/* Pitch outer markings */}
        <rect x="4" y="4" width="92" height="122" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        
        {/* Center circle and line */}
        <line x1="4" y1="65" x2="96" y2="65" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <circle cx="50" cy="65" r="18" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <circle cx="50" cy="65" r="1" fill="var(--stadium-pitch-line-strong, rgba(255, 255, 255, 0.3))" />

        {/* Penalty Area Bottom */}
        <rect x="22" y="96" width="56" height="30" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <rect x="36" y="112" width="28" height="14" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <path d="M 38,96 A 12,12 0 0,1 62,96" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <circle cx="50" cy="106" r="0.8" fill="var(--stadium-pitch-line-strong, rgba(255, 255, 255, 0.4))" />

        {/* Penalty Area Top */}
        <rect x="22" y="4" width="56" height="30" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <rect x="36" y="4" width="28" height="14" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <path d="M 38,34 A 12,12 0 0,0 62,34" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.07))" strokeWidth="0.8" />
        <circle cx="50" cy="24" r="0.8" fill="var(--stadium-pitch-line-strong, rgba(255, 255, 255, 0.4))" />

        {/* Render Players */}
        {players.map((player) => {
          const pt = COORD_REGISTRY[player.slotId || player.id] ?? derive2DCoord(player);

          const isSelected = selectedPlayerId === player.id;
          
          // Use team identity colors for player nodes
          let markerColor = homeColor;
          if (player.position === 'GK') {
            markerColor = '#fbbf24'; // Gold for GK always
          } else if (side === 'away') {
            markerColor = awayColor;
          }

          return (
            <g 
              key={player.id}
              onClick={() => onSelectPlayer(player)}
              style={{ cursor: 'pointer' }}
              className="lineup-player-node"
            >
              {/* Selected Glow Ring */}
              {isSelected && (
                <circle 
                  cx={pt.x} 
                  cy={pt.y} 
                  r="6.5" 
                  fill="none" 
                  stroke="var(--accent-cyan)" 
                  strokeWidth="1.2"
                  opacity="0.8"
                />
              )}
              {/* Node Circle */}
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r="4.2" 
                fill={markerColor} 
                stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'} 
                strokeWidth="0.8" 
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* Shirt Number */}
              <text 
                x={pt.x} 
                y={pt.y + 1} 
                fontSize="3" 
                fill={player.position === 'GK' ? '#000000' : '#ffffff'} 
                fontWeight="900" 
                textAnchor="middle"
                fontFamily="var(--font-sans)"
              >
                {player.number}
              </text>
              {/* Player Name */}
              <text 
                x={pt.x} 
                y={pt.y + 8} 
                fontSize="2.6" 
                fill={isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'} 
                fontWeight={isSelected ? '800' : '600'} 
                textAnchor="middle"
                fontFamily="var(--font-sans)"
              >
                {player.displayName}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
      
      {/* Sidebar Top Title Header matching Mockup */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
          Estadio 3D · Resumen
        </h4>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {match.isPending && (
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(100, 116, 139, 0.12)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid rgba(100, 116, 139, 0.2)' }}>
              Datos Pendientes
            </span>
          )} 
          <span 
            style={{ 
              fontSize: '0.62rem', 
              fontWeight: 800, 
              color: 'var(--accent-emerald)', 
              background: 'rgba(16, 185, 129, 0.12)', 
              padding: '2px 8px', 
              borderRadius: '4px',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></span>
            {match.status === 'live' ? 'En Vivo' : match.status === 'pre-match' ? 'Pre-partido' : 'Finalizado'}
          </span>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Alineaciones en cancha {match.status === 'live' && `(${match.liveTime || "82'"})`}
        </h2>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
          Posiciones y formaciones actuales de ambos equipos en tiempo real.
        </p>
      </div>

      {/* Split Teams Row Container */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
        
        {/* Team 1: Home Team */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: homeColor }}></span>
              {(lineups?.teams?.home?.teamName ?? match.teams.home).toUpperCase()}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              {lineups?.teams?.home?.formation ?? '4-3-3'}
            </span>
          </div>
          {renderVerticalPitch(homePlayers, 'home')}
        </div>

        {/* Team 2: Away Team */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: awayColor === '#ffffff' ? '#94a3b8' : awayColor }}></span>
              {(lineups?.teams?.away?.teamName ?? match.teams.away).toUpperCase()}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              {lineups?.teams?.away?.formation ?? '4-3-3'}
            </span>
          </div>
          {renderVerticalPitch(awayPlayers, 'away')}
        </div>

      </div>

      {/* Spanish Licensing Disclaimer */}
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.3', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', flexShrink: 0 }}>
        Prototipo privado no oficial de análisis deportivo. No está afiliado a FIFA, organizadores del torneo, selecciones ni sedes oficiales.
      </div>

    </div>
  );
};
