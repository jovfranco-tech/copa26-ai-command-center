import React from 'react';
import type { Match } from '../data/matchData';
import { MATCH_LINEUPS } from '../data/lineups';
import type { Player } from '../data/lineups';

interface Tactical2DMapProps {
  match: Match;
  activeZone: string;
  onZoneClick: (zone: 'field' | 'stands' | 'screens' | 'lights') => void;
  selectedPlayerId: string | null;
  onSelectPlayer: (player: Player | null) => void;
  lineups?: typeof MATCH_LINEUPS;
}

export const Tactical2DMap: React.FC<Tactical2DMapProps> = ({
  match,
  activeZone,
  onZoneClick,
  selectedPlayerId,
  onSelectPlayer,
  lineups = MATCH_LINEUPS
}) => {
  const { homeColor, awayColor } = match.teams;

  const homePlayers = lineups.teams.home.players;
  const awayPlayers = lineups.teams.away.players;

  // Coordinate translation functions
  // Translate 3D x [-33, 33] -> SVG x [10, 190]
  const translate3DX = (x: number) => {
    return 100 + (x / 33) * 88;
  };

  // Translate 3D z [-23, 23] -> SVG y [10, 90]
  const translate3DZ = (z: number) => {
    return 50 + (z / 23) * 42;
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
      {/* Chalkboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: homeColor }}></span>
            Pizarrón Táctico 2D
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Esquema de formaciones y alineación en vivo (Min 82)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="status-indicator status-live" style={{ fontSize: '0.7rem' }}>
            <span className="status-dot"></span>
            ESQUEMA EN VIVO
          </span>
        </div>
      </div>

      {/* SVG Canvas Board */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <svg 
          viewBox="0 0 200 100" 
          style={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '12px', 
            background: 'var(--stadium-pitch-bg, radial-gradient(circle at 50% 50%, #0d1530 0%, #05070e 100%))',
            border: activeZone === 'field' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            boxShadow: activeZone === 'field' ? '0 0 20px rgba(0, 242, 254, 0.25)' : 'none',
            transition: 'all 0.3s'
          }}
          onClick={() => onZoneClick('field')}
        >
          {/* Pitch markings */}
          <rect x="5" y="5" width="190" height="90" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.15))" strokeWidth="0.8" />
          <line x1="100" y1="5" x2="100" y2="95" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.15))" strokeWidth="0.8" />
          <circle cx="100" cy="50" r="15" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.15))" strokeWidth="0.8" />
          <circle cx="100" cy="50" r="1.5" fill="var(--stadium-pitch-line-strong, rgba(255, 255, 255, 0.6))" />

          {/* Goal boxes */}
          <rect x="5" y="25" width="15" height="50" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.15))" strokeWidth="0.8" />
          <rect x="180" y="25" width="15" height="50" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.15))" strokeWidth="0.8" />
          <rect x="5" y="38" width="5" height="24" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.15))" strokeWidth="0.8" />
          <rect x="190" y="38" width="5" height="24" fill="none" stroke="var(--stadium-pitch-line, rgba(255, 255, 255, 0.15))" strokeWidth="0.8" />

          {/* Penalty spots */}
          <circle cx="16" cy="50" r="1" fill="var(--stadium-pitch-line-strong, rgba(255, 255, 255, 0.5))" />
          <circle cx="184" cy="50" r="1" fill="var(--stadium-pitch-line-strong, rgba(255, 255, 255, 0.5))" />

          {/* Heatmap overlay (simulated map) */}
          {match.analytics.heatZones.map((zone, idx) => (
            <circle
              key={idx}
              cx={zone.x + 100}
              cy={zone.y + 50}
              r={zone.r * 1.5}
              fill={`url(#heat-grad-2d-${idx})`}
              opacity="0.25"
            />
          ))}

          {/* Define heat gradients */}
          <defs>
            {match.analytics.heatZones.map((zone, idx) => (
              <radialGradient id={`heat-grad-2d-${idx}`} key={idx}>
                <stop offset="0%" stopColor="#10b981" stopOpacity={zone.val} />
                <stop offset="65%" stopColor="#00f2fe" stopOpacity={zone.val * 0.4} />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            ))}
            
            {/* Soft pulse glow filter */}
            <filter id="glow-effect-2d" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Tactical Action Hotspot connectors (passing lanes) */}
          <path 
            d="M 68 30 L 78 40 L 86 50" 
            fill="none" 
            stroke="var(--accent-blue)" 
            strokeWidth="0.8" 
            strokeDasharray="2, 2"
            opacity="0.6"
          />
          <path 
            d="M 130 50 L 120 75 L 114 50" 
            fill="none" 
            stroke="var(--accent-orange)" 
            strokeWidth="0.8" 
            strokeDasharray="2, 2"
            opacity="0.6"
          />

          {/* Home Team players (Argentina) */}
          {homePlayers.map((player) => {
            const svgX = translate3DX(player.x);
            const svgY = translate3DZ(player.z);
            const isSelected = selectedPlayerId === player.id;
            const markerColor = player.position === 'GK' ? '#f59e0b' : homeColor;

            return (
              <g 
                key={`home-${player.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlayer(isSelected ? null : player);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Selected Pulse Ring */}
                {isSelected && (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r="5.5"
                    fill="none"
                    stroke="var(--accent-cyan)"
                    strokeWidth="1.2"
                    opacity="0.8"
                  />
                )}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r="3.5"
                  fill={isSelected ? 'var(--accent-cyan)' : markerColor}
                  stroke="#ffffff"
                  strokeWidth="0.6"
                  filter="url(#glow-effect-2d)"
                />
                <text
                  x={svgX}
                  y={svgY + 0.8}
                  fontSize="2.4"
                  fill="#000"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  {player.number}
                </text>
                <text 
                  x={svgX} 
                  y={svgY - 4.5} 
                  fontSize="2.8" 
                  fill={isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)'} 
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {player.displayName}
                </text>
              </g>
            );
          })}

          {/* Away Team players (Francia) */}
          {awayPlayers.map((player) => {
            const svgX = translate3DX(player.x);
            const svgY = translate3DZ(player.z);
            const isSelected = selectedPlayerId === player.id;
            const markerColor = player.position === 'GK' ? '#10b981' : awayColor;

            return (
              <g 
                key={`away-${player.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlayer(isSelected ? null : player);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Selected Pulse Ring */}
                {isSelected && (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r="5.5"
                    fill="none"
                    stroke="var(--accent-cyan)"
                    strokeWidth="1.2"
                    opacity="0.8"
                  />
                )}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r="3.5"
                  fill={isSelected ? 'var(--accent-cyan)' : markerColor}
                  stroke="#ffffff"
                  strokeWidth="0.6"
                  filter="url(#glow-effect-2d)"
                />
                <text
                  x={svgX}
                  y={svgY + 0.8}
                  fontSize="2.4"
                  fill="#fff"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  {player.number}
                </text>
                <text 
                  x={svgX} 
                  y={svgY - 4.5} 
                  fontSize="2.8" 
                  fill={isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'} 
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {player.displayName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Squad Lineups Grid (Argentina left, France right) - Phase 6 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
        {/* Home Team Lineup Column */}
        <div style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: homeColor }}>{lineups.teams.home.teamName.toUpperCase()}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>F: {lineups.teams.home.formation}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
            {homePlayers.map(p => {
              const isSel = selectedPlayerId === p.id;
              return (
                <div 
                  key={p.id}
                  onClick={() => onSelectPlayer(isSel ? null : p)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '4px 6px', 
                    borderRadius: '4px',
                    background: isSel ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                    border: isSel ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '3px', 
                      background: p.position === 'GK' ? '#f59e0b' : homeColor, 
                      color: '#000', 
                      fontSize: '0.55rem', 
                      fontWeight: 800,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {p.number}
                    </span>
                    <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{p.displayName}</span>
                  </div>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.position}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Away Team Lineup Column */}
        <div style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: awayColor === '#ffffff' ? '#94a3b8' : awayColor }}>{lineups.teams.away.teamName.toUpperCase()}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>F: {lineups.teams.away.formation}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
            {awayPlayers.map(p => {
              const isSel = selectedPlayerId === p.id;
              return (
                <div 
                  key={p.id}
                  onClick={() => onSelectPlayer(isSel ? null : p)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '4px 6px', 
                    borderRadius: '4px',
                    background: isSel ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                    border: isSel ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '3px', 
                      background: p.position === 'GK' ? '#10b981' : awayColor === '#ffffff' ? '#94a3b8' : awayColor, 
                      color: '#fff', 
                      fontSize: '0.55rem', 
                      fontWeight: 800,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {p.number}
                    </span>
                    <span style={{ fontWeight: isSel ? 700 : 500, color: isSel ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{p.displayName}</span>
                  </div>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.position}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
