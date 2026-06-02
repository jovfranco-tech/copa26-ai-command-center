import React from 'react';
import type { Match } from '../data/matchData';
import { MATCH_LINEUPS } from '../data/lineups';
import type { Player } from '../data/lineups';

interface AIMatchBriefProps {
  match: Match;
  onSelectPlayer: (player: Player | null) => void;
  selectedPlayerId: string | null;
  lineups?: typeof MATCH_LINEUPS;
}

export const AIMatchBrief: React.FC<AIMatchBriefProps> = ({
  match,
  onSelectPlayer,
  selectedPlayerId,
  lineups = MATCH_LINEUPS
}) => {
  const argPlayers = lineups.teams.home.players;
  const fraPlayers = lineups.teams.away.players;

  // Exact coordinates for visual vertical layout (matches mockup layout perfectly)
  const argCoords: Record<string, { x: number, y: number }> = {
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
  };

  const fraCoords: Record<string, { x: number, y: number }> = {
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
  };

  // Helper to render a vertical pitch SVG
  const renderVerticalPitch = (players: Player[], coords: Record<string, { x: number, y: number }>, teamCode: 'ARG' | 'FRA') => {
    return (
      <svg 
        viewBox="0 0 100 130" 
        style={{ 
          width: '100%', 
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
          const pt = coords[player.slotId || player.id];
          if (!pt) return null;

          const isSelected = selectedPlayerId === player.id;
          
          // Color coding matching mockup
          let markerColor = 'var(--accent-cyan)';
          if (player.position === 'GK') {
            markerColor = '#fbbf24'; // Yellow/Gold GK
          } else if (teamCode === 'FRA') {
            markerColor = 'var(--accent-blue)'; // Lighter blue for France on dark pitch
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
          En Vivo
        </span>
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
        
        {/* Team 1: Argentina */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
              ARGENTINA
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              4-3-3
            </span>
          </div>
          {renderVerticalPitch(argPlayers, argCoords, 'ARG')}
        </div>

        {/* Team 2: Francia */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
              FRANCIA
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              4-2-3-1
            </span>
          </div>
          {renderVerticalPitch(fraPlayers, fraCoords, 'FRA')}
        </div>

      </div>

      {/* Spanish Licensing Disclaimer */}
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.3', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', flexShrink: 0 }}>
        Prototipo privado no oficial de análisis deportivo. No está afiliado a FIFA, organizadores del torneo, selecciones ni sedes oficiales.
      </div>

    </div>
  );
};
