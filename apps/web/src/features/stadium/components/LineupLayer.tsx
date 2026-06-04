import React, { useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html as HtmlDrei } from '@react-three/drei';
import * as THREE from 'three';
import { MATCH_LINEUPS, getTacticalZoneType } from '../data/lineups';
import type { Player } from '../data/lineups';
import { getTeamVisualIdentity } from '../data/teamVisualIdentity';

interface LineupLayerProps {
  selectedPlayerId: string | null;
  onSelectPlayer: (player: Player | null) => void;
  visualizationMode: 'nombres' | 'compactas' | 'seleccionar' | 'limpia';
  showTacticalZones?: boolean;
  mentalidad?: 'equilibrada' | 'ofensiva';
  ritmo?: 'moderado' | 'alto';
  lineups?: typeof MATCH_LINEUPS;
}

// Define passing links between players for visual lanes
const PASS_LINKS: Record<string, string[]> = {
  // Argentina (ARG)
  'arg-ss': ['arg-cm-r', 'arg-st', 'arg-rb'], // Messi -> De Paul, Álvarez, Molina
  'arg-st': ['arg-ss', 'arg-rw'], // Álvarez -> Messi, Di María
  'arg-cm-r': ['arg-ss', 'arg-rb', 'arg-dm'], // De Paul -> Messi, Molina, Enzo
  'arg-dm': ['arg-cm-l', 'arg-cm-r', 'arg-cb-l'], // Enzo -> Mac Allister, De Paul, Otamendi
  // France (FRA)
  'fra-lw': ['fra-st', 'fra-cam', 'fra-lb'], // Mbappé -> Giroud, Griezmann, Theo
  'fra-cam': ['fra-lw', 'fra-rw', 'fra-dm-r'], // Griezmann -> Mbappé, Dembélé, Tchouaméni
  'fra-st': ['fra-lw', 'fra-cam'], // Giroud -> Mbappé, Griezmann
};

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(cleanHex.length === 3 ? 1 : 2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(cleanHex.length === 3 ? 2 : 4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createZoneTexture = (primaryColor: string, accentColor: string, isGk: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (isGk) {
      gradient.addColorStop(0, 'rgba(251, 191, 36, 1.0)');   // Amber yellow center
      gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.5)');  // Warm gold mid
      gradient.addColorStop(1.0, 'rgba(245, 158, 11, 0)');
    } else {
      gradient.addColorStop(0, hexToRgba(primaryColor, 1.0)); // Primary color center
      gradient.addColorStop(0.5, hexToRgba(accentColor, 0.6)); // Accent color mid-ring
      gradient.addColorStop(1.0, hexToRgba(accentColor, 0));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
};

export const LineupLayer: React.FC<LineupLayerProps> = ({
  selectedPlayerId,
  onSelectPlayer,
  visualizationMode,
  showTacticalZones = true,
  mentalidad,
  ritmo,
  lineups = MATCH_LINEUPS
}) => {
  const allPlayers = useMemo(() => {
    const baseList = [
      ...lineups.teams.home.players,
      ...lineups.teams.away.players
    ];
    if (mentalidad === 'ofensiva') {
      return baseList.map(p => {
        if (p.position === 'GK') return p;
        const shiftX = p.team === lineups.teams.home.teamCode ? 4.5 : -4.5;
        return {
          ...p,
          x: p.x + shiftX
        };
      });
    }
    return baseList;
  }, [mentalidad, lineups.teams.home.players, lineups.teams.away.players, lineups.teams.home.teamCode]);

  const homeZoneTexture = useMemo(() => {
    const visual = getTeamVisualIdentity(lineups.teams.home.teamCode);
    return createZoneTexture(visual.primaryColor, visual.accentColor, false);
  }, [lineups.teams.home.teamCode]);

  const homeGkZoneTexture = useMemo(() => {
    const visual = getTeamVisualIdentity(lineups.teams.home.teamCode);
    return createZoneTexture(visual.primaryColor, visual.accentColor, true);
  }, [lineups.teams.home.teamCode]);

  const awayZoneTexture = useMemo(() => {
    const visual = getTeamVisualIdentity(lineups.teams.away.teamCode);
    return createZoneTexture(visual.primaryColor, visual.accentColor, false);
  }, [lineups.teams.away.teamCode]);

  const awayGkZoneTexture = useMemo(() => {
    const visual = getTeamVisualIdentity(lineups.teams.away.teamCode);
    return createZoneTexture(visual.primaryColor, visual.accentColor, true);
  }, [lineups.teams.away.teamCode]);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null;
    return allPlayers.find(p => p.id === selectedPlayerId) || null;
  }, [selectedPlayerId, allPlayers]);

  const closestOpponentIds = useMemo(() => {
    if (!selectedPlayer) return [];
    
    // Find closest players from opposing team
    const opponentTeam = selectedPlayer.team === lineups.teams.home.teamCode 
      ? lineups.teams.away.players 
      : lineups.teams.home.players;

    return opponentTeam
      .map(p => {
        const dx = p.x - selectedPlayer.x;
        const dz = p.z - selectedPlayer.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return { id: p.id, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(p => p.id);
  }, [selectedPlayer, lineups.teams.home.players, lineups.teams.away.players, lineups.teams.home.teamCode]);

  const activePassingLanes = useMemo(() => {
    if (!selectedPlayer) return [];
    
    // Determine target nodes for passing lanes
    const targets = PASS_LINKS[selectedPlayer.id] || [];
    return targets.map(targetId => {
      const targetPlayer = allPlayers.find(p => p.id === targetId);
      if (!targetPlayer) return null;
      const selectedVisual = getTeamVisualIdentity(selectedPlayer.team);
      return {
        from: [selectedPlayer.x, selectedPlayer.z] as [number, number],
        to: [targetPlayer.x, targetPlayer.z] as [number, number],
        color: selectedVisual.accentColor,
        id: `${selectedPlayer.id}-to-${targetId}`
      };
    }).filter((lane): lane is { from: [number, number], to: [number, number], color: string, id: string } => lane !== null);
  }, [selectedPlayer, allPlayers]);

  const isLimpia = visualizationMode === 'limpia';
  const isNombres = visualizationMode === 'nombres';
  const isCompactas = visualizationMode === 'compactas';
  const isSeleccionar = visualizationMode === 'seleccionar';

  return (
    <group>
      {/* 3D Passing Vectors Layer */}
      {activePassingLanes.map((lane) => (
        <PassingLane
          key={lane.id}
          from={lane.from}
          to={lane.to}
          color={lane.color}
        />
      ))}

      {/* 3D Player Badges Layer */}
      {allPlayers.map((player) => {
        const isSelected = selectedPlayerId === player.id;
        
        // Calculate if we should show the influence zone for this player (Phase 4)
        let showZone = false;
        let opacity = 0.12;

        if (showTacticalZones && !isLimpia) {
          if (isCompactas) {
            showZone = true;
            opacity = 0.06; // reduced opacity to avoid overlap clutter
          } else if (isNombres) {
            // "Nombres" mode: only show selected player zone very sutil
            if (isSelected) {
              showZone = true;
              opacity = 0.04;
            }
          } else if (isSeleccionar) {
            // "Detalle" mode: show selected player zone and up to 3 closest opponents
            if (isSelected) {
              showZone = true;
              opacity = 0.22;
            } else if (closestOpponentIds.includes(player.id)) {
              showZone = true;
              opacity = 0.08; // soft opponent zone of conflict
            }
          }
        }

        const influenceRadius = 1.8 + (player.influenceScore / 100) * 4.2;

        const zoneTexture = player.position === 'GK'
          ? (player.team === lineups.teams.home.teamCode ? homeGkZoneTexture : awayGkZoneTexture)
          : (player.team === lineups.teams.home.teamCode ? homeZoneTexture : awayZoneTexture);

        return (
          <PlayerMarker3D
            key={player.id}
            player={player}
            isSelected={isSelected}
            onSelect={() => onSelectPlayer(selectedPlayerId === player.id ? null : player)}
            visualizationMode={visualizationMode}
            isHome={player.team === lineups.teams.home.teamCode}
            showInfluenceZone={showZone}
            influenceRadius={influenceRadius}
            influenceOpacity={opacity}
            zoneTexture={zoneTexture}
            ritmo={ritmo}
          />
        );
      })}
    </group>
  );
};

// Passing Lane Visual Cylinder
interface PassingLaneProps {
  from: [number, number];
  to: [number, number];
  color: string;
}

const PassingLane: React.FC<PassingLaneProps> = ({ from, to, color }) => {
  const [x1, z1] = from;
  const [x2, z2] = to;

  const dx = x2 - x1;
  const dz = z2 - z1;
  const distance = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const mx = x1 + dx / 2;
  const mz = z1 + dz / 2;

  const laneRef = React.useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (laneRef.current) {
      const elapsed = state.clock.getElapsedTime();
      const opacity = 0.35 + Math.sin(elapsed * 5) * 0.15;
      const mat = laneRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = opacity;
    }
  });

  return (
    <mesh ref={laneRef} position={[mx, 0.05, mz]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[distance, 0.015, 0.12]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={0.4} 
        depthWrite={false}
      />
    </mesh>
  );
};

// Player 3D Pin & HTML Badge
interface PlayerMarker3DProps {
  player: Player;
  isSelected: boolean;
  onSelect: () => void;
  visualizationMode: 'nombres' | 'compactas' | 'seleccionar' | 'limpia';
  isHome: boolean;
  showInfluenceZone: boolean;
  influenceRadius: number;
  influenceOpacity: number;
  zoneTexture: THREE.CanvasTexture;
  ritmo?: 'moderado' | 'alto';
}

const PlayerMarker3D: React.FC<PlayerMarker3DProps> = ({
  player,
  isSelected,
  onSelect,
  visualizationMode,
  isHome,
  showInfluenceZone,
  influenceRadius,
  influenceOpacity,
  zoneTexture,
  ritmo
}) => {
  const [hovered, setHovered] = useState(false);
  const visual = getTeamVisualIdentity(player.team);
  const teamColor = visual.primaryColor;

  // Colors for Goalkeepers
  const playerColor = useMemo(() => {
    if (player.position === 'GK') {
      return '#fbbf24'; // standard gold for goalkeepers
    }
    return teamColor;
  }, [player, teamColor]);

  // Accent and shadows for selected player detail card
  const teamAccent = useMemo(() => {
    return visual.accentColor;
  }, [visual]);

  const primaryRgb = useMemo(() => {
    const hex = visual.primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(hex.length === 3 ? 1 : 2, 4), 16) || 0;
    const b = parseInt(hex.substring(hex.length === 3 ? 2 : 4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  }, [visual]);

  const shadowGlow = useMemo(() => {
    const hex = visual.accentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(hex.length === 3 ? 1 : 2, 4), 16) || 0;
    const b = parseInt(hex.substring(hex.length === 3 ? 2 : 4, 6), 16) || 0;
    return `0 12px 32px rgba(${r}, ${g}, ${b}, 0.22), 0 0 15px rgba(${r}, ${g}, ${b}, 0.1)`;
  }, [visual]);

  // Handle animations of selection ring and floating group
  const ringRef = React.useRef<THREE.Mesh>(null);
  const floatingGroupRef = React.useRef<THREE.Group>(null);
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const speedMultiplier = ritmo === 'alto' ? 1.8 : 1.0;
    
    // Animate the selection ring pulse scale
    if (ringRef.current && isSelected) {
      const s = 1.0 + Math.sin(elapsed * 5 * speedMultiplier) * 0.12;
      ringRef.current.scale.set(s, 1, s);
    }

    // Animate the floating group (stem + shield + badges)
    if (floatingGroupRef.current) {
      const targetScale = isSelected ? 1.16 : hovered ? 1.08 : 1.0;
      const currentScale = floatingGroupRef.current.scale.x;
      const lerpSpeed = isSelected ? 0.3 : 0.15; // Faster snap on selection
      const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpSpeed);
      floatingGroupRef.current.scale.set(nextScale, nextScale, nextScale);
      
      if (isSelected || hovered) {
        const floatOffset = Math.sin(elapsed * 3.5 * speedMultiplier) * 0.05;
        floatingGroupRef.current.position.y = floatOffset;
      }
    }
  });



  // Visual modes flags
  const isLimpia = visualizationMode === 'limpia';
  const isNombres = visualizationMode === 'nombres';
  const isCompactas = visualizationMode === 'compactas';
  const isSeleccionar = visualizationMode === 'seleccionar';

  // Performance: Only render HtmlDrei overlays for interactive (selected/hovered) players
  // in heavy modes. 'nombres' keeps all badges (lightweight text). 'limpia' shows none.
  // - 'limpia': No HtmlDrei at all
  // - 'nombres': All players show simple text badge (lightweight)
  // - 'compactas': Only hovered/selected player shows compact card
  // - 'seleccionar': Only selected/hovered players show badge (selected gets full card instead)
  const isInteractive = isSelected || hovered;
  const showBadge = !isLimpia && !isCompactas && !(isSelected && isSeleccionar) && (isNombres || isInteractive);
  const showCompactCard = isCompactas && isInteractive && !isSelected;
  const showFullCard = isSelected && !isLimpia;

  return (
    <group 
      position={[player.x, 0.2, player.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 3D Player Tectonic Influence Zone (Phase 4) */}
      {showInfluenceZone && (
        <mesh 
          position={[0, 0.005, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[influenceRadius, 32]} />
          <meshBasicMaterial 
            map={zoneTexture}
            transparent 
            opacity={influenceOpacity} 
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* 3D Base Projection Pad on Grass (Locked to pitch) */}
      <mesh receiveShadow castShadow position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.015, 32]} />
        <meshStandardMaterial 
          color="#0b1329" 
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Selected Emissive Pulse Ring (Locked to pitch) */}
      {isSelected && (
        <mesh ref={ringRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65, 0.85, 24]} />
          <meshBasicMaterial 
            color="var(--accent-cyan)" 
            transparent 
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Hover Ring (Locked to pitch) */}
      {hovered && !isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.72, 24]} />
          <meshBasicMaterial 
            color={playerColor} 
            transparent 
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Dynamic Data Beam (Locked to pitch) */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.16, 16, 1, true]} />
        <meshBasicMaterial 
          color={isSelected || hovered ? 'var(--accent-cyan)' : playerColor}
          transparent
          opacity={isSelected ? 0.25 : hovered ? 0.15 : 0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Floating Holographic Stem and Shield Token Group */}
      <group ref={floatingGroupRef}>
        {/* 3D Support Stem (Trophy/Badge design) */}
        <mesh castShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.34, 8]} />
          <meshStandardMaterial 
            color="#334155" 
            metalness={0.8} 
            roughness={0.2} 
          />
        </mesh>

        {/* 3D Tilted Player Badge Token (Outer Metal Rim) */}
        <mesh 
          castShadow 
          position={[0, 0.35, 0]} 
          rotation={[Math.PI / 2 - 0.25, 0, 0]}
        >
          <cylinderGeometry args={[0.35, 0.35, 0.05, 32]} />
          <meshStandardMaterial 
            color={isSelected ? 'var(--accent-cyan)' : visual.accentColor} 
            depthWrite={false}
            metalness={0.9}
            emissive={isSelected ? 'var(--accent-cyan)' : '#000000'}
            emissiveIntensity={isSelected ? 0.6 : 0}
          />
        </mesh>

        {/* 3D Tilted Player Badge Token (Inner Team Color Plate) */}
        <mesh 
          castShadow 
          position={[0, 0.35, 0.012]} 
          rotation={[Math.PI / 2 - 0.25, 0, 0]}
        >
          <cylinderGeometry args={[0.30, 0.30, 0.055, 32]} />
          <meshStandardMaterial 
            color={playerColor} 
            roughness={0.3}
            metalness={0.2}
            emissive={isSelected ? playerColor : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>

        {/* 1. Normal Premium Player Badge (Dorsal + Tag) */}
        {showBadge && (
          <HtmlDrei 
            center 
            distanceFactor={10} 
            position={[0, 0.5, 0]}
          >
            <div 
              className={`player-badge-marker ${isSelected ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <div 
                className="player-badge-disc"
                style={{
                  background: player.position === 'GK'
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                    : `linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%), ${visual.primaryColor}`,
                  color: player.position === 'GK' ? '#0b1731' : visual.textContrastColor,
                  borderColor: isSelected || hovered ? '#ffffff' : visual.primaryColor,
                  boxShadow: isSelected || hovered 
                    ? `0 0 15px ${visual.accentColor}` 
                    : `0 4px 10px rgba(${primaryRgb}, 0.35)`,
                }}
              >
                {player.number}
              </div>
              {!isLimpia && (
                <div 
                  className="player-badge-name"
                  style={{
                    borderLeft: `2px solid ${player.position === 'GK' ? '#fbbf24' : visual.primaryColor}`,
                    ...(isSelected ? {
                      borderColor: 'var(--accent-cyan)',
                      color: 'var(--accent-cyan)',
                      boxShadow: '0 0 10px var(--gold-soft)',
                    } : {})
                  }}
                >
                  {isNombres ? `${player.number}. ${player.displayName}` : player.displayName}
                </div>
              )}
            </div>
          </HtmlDrei>
        )}

        {/* 2. Compact Player Card (Health / Stamina dashboard analytics) */}
        {showCompactCard && (
          <HtmlDrei 
            center 
            distanceFactor={11} 
            position={[0, 0.6, 0]}
          >
            <div className="player-compact-card" style={{ borderColor: playerColor }}>
              <div className="compact-header" style={{ background: `linear-gradient(90deg, ${playerColor} 0%, rgba(22, 28, 54, 0.4) 100%)` }}>
                <span className="compact-num">#{player.number}</span>
                <span className="compact-pos">{player.position}</span>
              </div>
              <div className="compact-name">{player.displayName}</div>
              <div className="compact-stamina-bar-container">
                <div 
                  className="compact-stamina-bar" 
                  style={{ 
                    width: `${player.stamina}%`,
                    background: player.stamina < 70 ? 'var(--color-neon-red)' : 'var(--accent-emerald)'
                  }}
                ></div>
              </div>
            </div>
          </HtmlDrei>
        )}

        {/* 3. Floating HUD detail card above Selected Player - Phase 3 */}
        {showFullCard && (
          <HtmlDrei 
            center 
            distanceFactor={9.5} 
            position={[0, 1.25, 0]}
          >
            <div className="player-detail-card pulse-glow-border" style={{ 
              borderColor: teamAccent,
              boxShadow: shadowGlow
            }}>
              <div className="detail-header" style={{ 
                borderBottom: `1px solid var(--border-subtle)`,
                background: `${visual.primaryColor}15`,
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <span className="detail-num" style={{ 
                    background: playerColor, 
                    color: player.position === 'GK' ? '#0b1731' : visual.textContrastColor,
                    fontWeight: 900,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.75rem'
                  }}>
                    #{player.number}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="detail-fullname" style={{ fontSize: '0.85rem', fontWeight: 800 }}>{player.name}</div>
                    <div className="detail-team-pos" style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
                      {visual.teamName} · {player.positionLabel}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(); // Toggle selection off
                    }}
                    className="detail-close-btn"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="detail-body" style={{ padding: '10px 12px' }}>
                <div className="detail-role-container">
                  <span className="detail-role-label">Rol Táctico</span>
                  <span className="detail-role-value">{player.tacticalRole}</span>
                </div>
                
                <div className="detail-role-container" style={{ marginTop: '6px' }}>
                  <span className="detail-role-label">Zona Táctica</span>
                  <span className="detail-role-value" style={{ color: teamAccent }}>{getTacticalZoneType(player)}</span>
                </div>
                
                {/* Premium Chips styling for metrics (3 metrics) */}
                <div className="detail-chips-container">
                  {/* Stamina Chip */}
                  <div className={`detail-chip stamina ${player.stamina < 70 ? 'low' : ''}`}>
                    🔋 {player.stamina}% Cond.
                  </div>
                  
                  {/* Influence Chip */}
                  <div className="detail-chip influence">
                    ⭐ {player.influenceScore} Infl.
                  </div>

                  {/* Risk Level Chip */}
                  <div className={`detail-chip risk ${player.riskLevel}`}>
                    🎯 {isHome ? 'Riesgo' : 'Riesgo rival'}: {player.riskLevel.toUpperCase()}
                  </div>
                </div>

                <div className="detail-insight-box">
                  <span className="insight-title" style={{ fontSize: '0.52rem', color: teamAccent, fontWeight: 800, textTransform: 'uppercase' }}>💡 ANALÍTICA IA</span>
                  <p className="insight-text" style={{ fontSize: '0.65rem', color: '#cbd5e1', lineHeight: '1.35', margin: 0 }}>
                    {player.notes.length > 65 ? player.notes.substring(0, 62) + '...' : player.notes}
                  </p>
                </div>
              </div>
            </div>
          </HtmlDrei>
        )}
      </group>
    </group>
  );
};
