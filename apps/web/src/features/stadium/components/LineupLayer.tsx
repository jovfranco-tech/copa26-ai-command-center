import React, { useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html as HtmlDrei } from '@react-three/drei';
import * as THREE from 'three';
import { MATCH_LINEUPS, getTacticalZoneType } from '../data/lineups';
import type { Player } from '../data/lineups';

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

export const LineupLayer: React.FC<LineupLayerProps> = ({
  selectedPlayerId,
  onSelectPlayer,
  visualizationMode,
  showTacticalZones = true,
  mentalidad,
  ritmo,
  lineups = MATCH_LINEUPS
}) => {
  const homeColor = lineups.teams.home.color;

  const allPlayers = useMemo(() => {
    const baseList = [
      ...lineups.teams.home.players,
      ...lineups.teams.away.players
    ];
    if (mentalidad === 'ofensiva') {
      return baseList.map(p => {
        if (p.position === 'GK') return p;
        const shiftX = p.team === 'ARG' ? 4.5 : -4.5;
        return {
          ...p,
          x: p.x + shiftX
        };
      });
    }
    return baseList;
  }, [mentalidad, lineups.teams.home.players, lineups.teams.away.players]);

  // Canvas texture for Argentina players (Cyan/celeste)
  const argZoneTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(0, 242, 254, 1.0)');     // Neon cyan center
      gradient.addColorStop(0.4, 'rgba(0, 180, 254, 0.7)');    // Celeste middle
      gradient.addColorStop(0.8, 'rgba(116, 172, 223, 0.2)');  // Soft light blue outer
      gradient.addColorStop(1.0, 'rgba(116, 172, 223, 0)');    // Fade out
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Canvas texture for France players (Blue/violet with red accent)
  const fraZoneTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(37, 99, 235, 1.0)');     // Royal blue center
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.6)');   // Violet mid-ring
      gradient.addColorStop(0.85, 'rgba(255, 77, 109, 0.35)'); // Coral red ring accent
      gradient.addColorStop(1.0, 'rgba(255, 77, 109, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Canvas texture for Argentina GK (Warm amber yellow)
  const argGkZoneTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(251, 191, 36, 1.0)');   // Amber yellow center
      gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.5)');  // Warm gold mid
      gradient.addColorStop(1.0, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Canvas texture for France GK (Emerald green)
  const fraGkZoneTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 1.0)');   // Emerald center
      gradient.addColorStop(0.5, 'rgba(5, 150, 105, 0.5)');   // Deep green mid
      gradient.addColorStop(1.0, 'rgba(5, 150, 105, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null;
    return allPlayers.find(p => p.id === selectedPlayerId) || null;
  }, [selectedPlayerId, allPlayers]);

  // Compute closest opponents (up to 3) within 12 meters for the selected player (Phase 2 & 5)
  const closestOpponentIds = useMemo(() => {
    if (!selectedPlayer) return [];
    return allPlayers
      .filter(p => p.team !== selectedPlayer.team)
      .map(p => {
        const dx = p.x - selectedPlayer.x;
        const dz = p.z - selectedPlayer.z;
        return { id: p.id, dist: Math.sqrt(dx * dx + dz * dz) };
      })
      .filter(p => p.dist < 12)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(p => p.id);
  }, [selectedPlayer, allPlayers]);

  // Compute active passing lane vectors
  const activePassingLanes = useMemo(() => {
    if (!selectedPlayer) return [];
    const targets = PASS_LINKS[selectedPlayer.id] || [];
    return targets.map(targetId => {
      const targetPlayer = allPlayers.find(p => p.id === targetId);
      if (!targetPlayer) return null;
      return {
        from: [selectedPlayer.x, selectedPlayer.z] as [number, number],
        to: [targetPlayer.x, targetPlayer.z] as [number, number],
        color: selectedPlayer.team === 'ARG' ? 'var(--accent-cyan)' : 'var(--color-neon-red)',
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
          ? (player.team === 'ARG' ? argGkZoneTexture : fraGkZoneTexture)
          : (player.team === 'ARG' ? argZoneTexture : fraZoneTexture);

        return (
          <PlayerMarker3D
            key={player.id}
            player={player}
            isSelected={isSelected}
            onSelect={() => onSelectPlayer(selectedPlayerId === player.id ? null : player)}
            visualizationMode={visualizationMode}
            homeColor={homeColor}
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
  homeColor: string;
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
  homeColor,
  showInfluenceZone,
  influenceRadius,
  influenceOpacity,
  zoneTexture,
  ritmo
}) => {
  const [hovered, setHovered] = useState(false);
  const teamColor = player.team === 'ARG' ? homeColor : '#2563eb'; // Vibrant royal blue for France to improve contrast

  // Colors for Goalkeepers
  const playerColor = useMemo(() => {
    if (player.position === 'GK') {
      return player.team === 'ARG' ? '#fbbf24' : '#10b981'; // Warm Amber for ARG GK, Emerald for FRA GK
    }
    return teamColor;
  }, [player, teamColor]);

  // Accent and shadows for selected player detail card
  const teamAccent = useMemo(() => {
    if (player.position === 'GK') {
      return player.team === 'ARG' ? '#fbbf24' : '#10b981'; // Yellow/Amber for ARG GK, Emerald/Green for FRA GK
    }
    return player.team === 'ARG' ? 'var(--accent-cyan)' : '#ff4d6d';
  }, [player]);

  const shadowGlow = useMemo(() => {
    const colorHex = player.position === 'GK'
      ? (player.team === 'ARG' ? '251, 191, 36' : '16, 185, 129')
      : (player.team === 'ARG' ? '0, 242, 254' : '255, 77, 109');
    return `0 12px 32px rgba(${colorHex}, 0.22), 0 0 15px rgba(${colorHex}, 0.1)`;
  }, [player]);

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
      const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
      floatingGroupRef.current.scale.set(nextScale, nextScale, nextScale);
      
      const floatOffset = (isSelected || hovered) 
        ? Math.sin(elapsed * 3.5 * speedMultiplier) * 0.05 
        : 0;
      floatingGroupRef.current.position.y = floatOffset;
    }
  });

  // Badge mapping class
  const badgeClass = useMemo(() => {
    if (player.team === 'ARG') {
      return player.position === 'GK' ? 'team-arg-gk' : 'team-arg';
    } else {
      return player.position === 'GK' ? 'team-fra-gk' : 'team-fra';
    }
  }, [player]);

  // Visual modes flags
  const isLimpia = visualizationMode === 'limpia';
  const isNombres = visualizationMode === 'nombres';
  const isCompactas = visualizationMode === 'compactas';
  const isSeleccionar = visualizationMode === 'seleccionar';

  const showBadge = !isCompactas && !(isSelected && isSeleccionar);
  const showCompactCard = isCompactas && !isSelected;
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
            color={isSelected ? 'var(--accent-cyan)' : (player.team === 'ARG' ? '#00f2fe' : '#ff4d6d')} 
            roughness={0.1}
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
              className={`player-badge-marker ${badgeClass} ${isSelected ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <div className="player-badge-disc">
                {player.number}
              </div>
              {!isLimpia && (
                <div className="player-badge-name">
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
                background: player.team === 'ARG' ? 'rgba(0, 242, 254, 0.06)' : 'rgba(255, 77, 109, 0.04)',
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <span className="detail-num" style={{ 
                    background: playerColor, 
                    color: player.position === 'GK' || player.team === 'ARG' ? '#0b1731' : '#ffffff',
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
                      {player.team === 'ARG' ? 'Argentina' : 'Francia'} · {player.positionLabel}
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
                    🎯 {player.team === 'ARG' ? 'Riesgo' : 'Riesgo rival'}: {player.riskLevel.toUpperCase()}
                  </div>
                </div>

                <div className="detail-insight-box">
                  <span className="insight-title" style={{ fontSize: '0.52rem', color: teamAccent, fontWeight: 800, textTransform: 'uppercase' }}>💡 ANALÍTICA IA</span>
                  <p className="insight-text" style={{ fontSize: '0.65rem', color: '#cbd5e1', lineHeight: '1.35', margin: 0 }}>
                    {player.id === 'arg-ss' 
                      ? 'Atrae marcas interiores y libera el carril derecho para progresiones ofensivas.' 
                      : player.id === 'fra-lw' 
                      ? 'Ataca la espalda del lateral y acelera transiciones verticales.'
                      : player.notes.length > 65 ? player.notes.substring(0, 62) + '...' : player.notes}
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
