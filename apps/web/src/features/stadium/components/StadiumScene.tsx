import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Match } from '../data/matchData';
import * as THREE from 'three';
import { LineupLayer } from './LineupLayer';
import { PitchGeometry } from './PitchGeometry';
import { StandsGeometry } from './StandsGeometry';
import { type Player, MATCH_LINEUPS } from '../data/lineups';

// Note: Standard import for Drei
import { OrbitControls as OrbitControlsDrei, Html as HtmlDrei, Sparkles as SparklesDrei } from '@react-three/drei';

// Seedable pseudo-random number generator for React render purity compliance
const createPureRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

interface StadiumSceneContentProps {
  match: Match;
  reduceEffects: boolean;
  activeZone: string;
  onZoneClick: (zone: 'field' | 'stands' | 'screens' | 'lights') => void;
  cameraView: 'general' | 'transmision' | 'tactica' | 'porteria' | 'alineaciones';
  cameraResetTrigger: number;
  selectedPlayerId: string | null;
  onSelectPlayer: (player: Player | null) => void;
  visualizationMode: 'nombres' | 'compactas' | 'seleccionar' | 'limpia';
  showTacticalZones?: boolean;
  mentalidad?: 'equilibrada' | 'ofensiva';
  ritmo?: 'moderado' | 'alto';
  lineups?: typeof MATCH_LINEUPS;
}

// A sub-component inside Canvas so we can use useFrame and useThree hooks safely
const StadiumSceneContent: React.FC<StadiumSceneContentProps> = ({
  match,
  reduceEffects,
  activeZone,
  onZoneClick,
  cameraView,
  cameraResetTrigger,
  selectedPlayerId: selectedPlayerId,
  onSelectPlayer: onSelectPlayer,
  visualizationMode: visualizationMode,
  showTacticalZones = true,
  mentalidad,
  ritmo,
  lineups = MATCH_LINEUPS
}) => {
  const { homeColor, awayColor, homeStandsColor, awayStandsColor } = match.teams;
  const weather = match.weather;
  const timeOfDay = match.timeOfDay;

  // Detect mobile to disable expensive Html-in-canvas jumbotrons
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
  }, []);

  // Procedural grass strips texture generated on-the-fly
  const grassTexture = useMemo(() => {
    const random = createPureRandom(12345);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const stripeCount = 24; // Finer stripes
      const stripeHeight = canvas.height / stripeCount;
      for (let i = 0; i < stripeCount; i++) {
        // Clearer, cleaner green grass colors (premium turf greens)
        // Alternating shades for clean visual appeal
        ctx.fillStyle = i % 2 === 0 ? '#296a32' : '#317f3c'; 
        ctx.fillRect(0, i * stripeHeight, canvas.width, stripeHeight);
        
        // Very subtle blade variations with low contrast to avoid noise
        ctx.fillStyle = i % 2 === 0 ? '#23592a' : '#2a6d33';
        for (let j = 0; j < 80; j++) { // Fewer blade specs for reduced noise
          const rx = random() * canvas.width;
          const ry = i * stripeHeight + random() * stripeHeight;
          const rw = 1 + random() * 0.8;
          const rh = 1.5 + random() * 1.5;
          ctx.fillRect(rx, ry, rw, rh);
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  // Procedural seating rows texture generated on-the-fly (dynamic seat rows & spectators)
  const standsTexture = useMemo(() => {
    const random = createPureRandom(54321);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Base dark slate stadium color
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 64, 256);
      
      const rowCount = 32;
      const rowHeight = canvas.height / rowCount;
      for (let i = 0; i < rowCount; i++) {
        // Alternating seat row highlights and shadows
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, i * rowHeight, canvas.width, rowHeight - 1);
        
        // Add tiny colored dots to simulate spectators/seats
        for (let j = 2; j < canvas.width; j += 6) {
          if (random() > 0.3) {
            const rand = random();
            ctx.fillStyle = rand < 0.2 ? '#00f2fe' : rand < 0.4 ? '#f97316' : 'rgba(255,255,255,0.15)';
            ctx.fillRect(j + random() * 2, i * rowHeight + 1, 1.5, 1.5);
          }
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 2);
    return texture;
  }, []);

  // Procedural LED Ribbon text texture generated on-the-fly
  const ribbonTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark slate background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 1024, 32);
      
      // Neon green and cyan glowing rectangles/blocks
      ctx.fillStyle = '#00f2fe';
      for (let x = 10; x < 1024; x += 256) {
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(x, 8, 8, 16);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x + 12, 8, 8, 16);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(x + 24, 8, 8, 16);
        
        // Generic Spanish text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('LABORATORIO DE ESTADIO 3D • ANALISIS TACTICO • COMMAND CENTER', x + 40, 20);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1); // Repeat it around the stadium
    return texture;
  }, []);

  // Procedural soccer ball texture with pentagon pattern
  const ballTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // White base
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      // Draw pentagon pattern (simplified — evenly spaced black pentagons)
      ctx.fillStyle = '#1a1a1a';
      const drawPentagon = (cx: number, cy: number, r: number) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      };
      // Center pentagon
      drawPentagon(64, 64, 18);
      // Surrounding pentagons
      drawPentagon(64, 20, 12);
      drawPentagon(64, 108, 12);
      drawPentagon(20, 44, 12);
      drawPentagon(108, 44, 12);
      drawPentagon(20, 84, 12);
      drawPentagon(108, 84, 12);
      // Seam lines
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(64, 20); ctx.lineTo(64, 46);
      ctx.moveTo(64, 82); ctx.lineTo(64, 108);
      ctx.moveTo(20, 44); ctx.lineTo(46, 56);
      ctx.moveTo(82, 56); ctx.lineTo(108, 44);
      ctx.moveTo(20, 84); ctx.lineTo(46, 72);
      ctx.moveTo(82, 72); ctx.lineTo(108, 84);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // References for light cones / spinning elements
  const weatherParticlesRef = useRef<THREE.Points>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const trophyRef = useRef<THREE.Group>(null);
  const ballVelocityRef = useRef({ x: 0.03, z: 0.02 });

  // Camera Presets Vector Lookup Table (Perfect interior coordinates)
  const presets = useMemo(() => ({
    alineaciones: { pos: new THREE.Vector3(0, 28, 48), target: new THREE.Vector3(0, 0, 0) }, // Vista Alineaciones elevated 3/4
    general: { pos: new THREE.Vector3(0, 34, 56), target: new THREE.Vector3(0, 0, 0) }, // Vista Estadio panoramic
    transmision: { pos: new THREE.Vector3(24, 18, 30), target: new THREE.Vector3(0, 0, 0) }, // Oblique TV angle
    tactica: { pos: new THREE.Vector3(0, 42, 6), target: new THREE.Vector3(0, 0, 0) }, // High vertical tactical board
    porteria: { pos: new THREE.Vector3(-36, 10, 0), target: new THREE.Vector3(-10, 1, 0) } // High behind-the-net spidercam
  }), []);

  // References for transition tracking
  const lastViewRef = useRef(cameraView);
  const lastResetTriggerRef = useRef(cameraResetTrigger);
  const transitionStartTimeRef = useRef(0);

  // useThree hooks to query active state
  const { controls } = useThree();

  // Animate elements and lerp camera view presets
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    
    // Detect camera view or reset changes
    let startTransition = false;
    if (lastViewRef.current !== cameraView) {
      lastViewRef.current = cameraView;
      startTransition = true;
    }
    if (lastResetTriggerRef.current !== cameraResetTrigger) {
      lastResetTriggerRef.current = cameraResetTrigger;
      startTransition = true;
    }

    if (startTransition) {
      transitionStartTimeRef.current = elapsed;
    }

    // Smooth camera viewport preset LERPs for 1.5 seconds only, releasing controls after
    const elapsedSinceChange = elapsed - transitionStartTimeRef.current;
    if (elapsedSinceChange < 1.5) {
      const activePreset = presets[cameraView] || presets.general;
      state.camera.position.lerp(activePreset.pos, 0.08); // Responsive transition sweep

      // Lerp OrbitControls target if active
      const activeControls = controls as { target?: THREE.Vector3; update?: () => void } | undefined;
      if (activeControls && activeControls.target) {
        activeControls.target.lerp(activePreset.target, 0.08);
        activeControls.update?.();
      }
    }

    // Slowly spin weather particle systems
    if (weatherParticlesRef.current) {
      weatherParticlesRef.current.rotation.y = elapsed * 0.02;
      if (weather === 'rain') {
        const positions = weatherParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 0.6; // Rain speed
          if (positions[i] < -2) positions[i] = 40;
        }
        weatherParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Slowly rotate trophy in pre-match
    if (trophyRef.current) {
      trophyRef.current.rotation.y += 0.005;
    }

    // Animate soccer ball rolling on pitch
    if (ballRef.current) {
      const bv = ballVelocityRef.current;
      ballRef.current.position.x += bv.x;
      ballRef.current.position.z += bv.z;
      // Rotate ball based on movement direction
      ballRef.current.rotation.z -= bv.x * 0.4;
      ballRef.current.rotation.x -= bv.z * 0.4;
      // Bounce off pitch boundaries with slight randomness
      if (ballRef.current.position.x > 29 || ballRef.current.position.x < -29) {
        bv.x *= -1;
        bv.z += (Math.random() - 0.5) * 0.01;
      }
      if (ballRef.current.position.z > 19 || ballRef.current.position.z < -19) {
        bv.z *= -1;
        bv.x += (Math.random() - 0.5) * 0.01;
      }
      // Clamp speed to prevent runaway acceleration
      bv.x = Math.max(-0.06, Math.min(0.06, bv.x));
      bv.z = Math.max(-0.06, Math.min(0.06, bv.z));
    }
  });

  // Calculate environmental lighting parameters based on Time of Day
  const lighting = useMemo(() => {
    switch (timeOfDay) {
      case 'day':
        return {
          ambientIntensity: 0.82, // Higher ambient for a bright daytime feel
          ambientColor: '#e2e8f0', // Clean cool-white ambient light
          dirColor: '#ffffff', // Pure white sunlight
          dirIntensity: 1.5, // Stronger direct sunlight
          dirPosition: [15, 45, 10] as [number, number, number], // High noon sunlight direction
          fogColor: '#384d66', // Premium daytime slate blue-gray background fog
          fogDensity: weather === 'fog' ? 0.022 : 0.0012, // Lower density in clear weather so stadium is visible
          domeColor: '#384d66', // Luminous daytime slate blue-gray dome
        };
      case 'sunset':
        return {
          ambientIntensity: 0.55,
          ambientColor: '#ffedd5', // Warm light glow
          dirColor: '#ffedd5',
          dirIntensity: 1.3,
          dirPosition: [40, 15, -10] as [number, number, number],
          fogColor: '#3c1e08',
          fogDensity: weather === 'fog' ? 0.028 : 0.005,
          domeColor: '#2d1a10', // Warm amber-black sunset dome
        };
      case 'night':
      default:
        return {
          ambientIntensity: 0.52, // Raised to 0.52 for optimal player/text legibility
          ambientColor: '#3a5180', // Lighter, richer slate blue to brighten scene
          dirColor: '#f0f9ff', // Crisper white light
          dirIntensity: 1.35, // Raised from 1.1 for higher player/grass highlights
          dirPosition: [10, 30, 5] as [number, number, number], // Slightly angled for dimensionality
          fogColor: '#060a1f', // Midnight blue instead of dark grey #030712
          fogDensity: weather === 'fog' ? 0.025 : 0.003,
          domeColor: '#060a1f', // Dark nocturnal dome
        };
    }
  }, [timeOfDay, weather]);

  // Procedural custom weather particles
  const rainPoints = useMemo(() => {
    const random = createPureRandom(98765);
    const count = reduceEffects ? 200 : 1500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * 100;
      positions[i * 3 + 1] = random() * 40;
      positions[i * 3 + 2] = (random() - 0.5) * 80;
    }
    return positions;
  }, [reduceEffects]);

  // Stand spectator seat colors
  const standRings = useMemo(() => {
    return [
      { radius: 35, height: 1.5, y: 0.8, color: homeStandsColor },
      { radius: 39, height: 3.5, y: 1.8, color: 'rgba(255,255,255,0.06)' },
      { radius: 43, height: 6.0, y: 3.0, color: awayStandsColor }
    ];
  }, [homeStandsColor, awayStandsColor]);

  return (
    <>
      {/* Giant Environmental Sky Dome Sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[70, 32, 32]} />
        <meshBasicMaterial color={lighting.domeColor} side={THREE.BackSide} />
      </mesh>

      {/* Dynamic Fog */}
      <fogExp2 attach="fog" args={[lighting.fogColor, lighting.fogDensity]} />
      <color attach="background" args={[lighting.fogColor]} />

      {/* Global Lighting */}
      <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      
      <directionalLight
        color={lighting.dirColor}
        intensity={lighting.dirIntensity}
        position={lighting.dirPosition}
        castShadow={!reduceEffects}
        shadow-mapSize={[1024, 1024]}
      />

      {/* Floodlights in 4 Corners */}
      <group onClick={(e) => { e.stopPropagation(); onZoneClick('lights'); }}>
        <CornerFloodlight position={[-38, 0, -26]} color={homeColor} beamTarget={[0, 0, 0]} isActive={activeZone === 'lights'} timeOfDay={timeOfDay} />
        <CornerFloodlight position={[38, 0, -26]} color={awayColor} beamTarget={[0, 0, 0]} isActive={activeZone === 'lights'} timeOfDay={timeOfDay} />
        <CornerFloodlight position={[-38, 0, 26]} color={awayColor} beamTarget={[0, 0, 0]} isActive={activeZone === 'lights'} timeOfDay={timeOfDay} />
        <CornerFloodlight position={[38, 0, 26]} color={homeColor} beamTarget={[0, 0, 0]} isActive={activeZone === 'lights'} timeOfDay={timeOfDay} />
      </group>

      {/* THE FIELD / PITCH */}
      <group 
        position={[0, 0, 0]} 
        onClick={(e) => { e.stopPropagation(); onZoneClick('field'); }}
      >
        {/* Main grass turf */}
        <mesh receiveShadow={!reduceEffects}>
          <boxGeometry args={[66, 0.4, 46]} />
          <meshStandardMaterial 
            map={grassTexture}
            roughness={0.85} 
            metalness={0.05}
            emissive="#06321a" // Rich deep forest green glow
            emissiveIntensity={0.22}
          />
        </mesh>

        {/* Outline boundary glow */}
        {activeZone === 'field' && (
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[66.5, 0.42, 46.5]} />
            <meshBasicMaterial color="var(--accent-cyan)" wireframe transparent opacity={0.6} />
          </mesh>
        )}

        {/* Football Field Pitch Line Markings */}
        <PitchGeometry />

        {match.status === 'pre-match' ? (
          <group ref={trophyRef}>
            {/* Golden trophy at center */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.2, 0.5, 8]} />
              <meshStandardMaterial color="#c9a24b" roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.9, 0]} castShadow>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="#c9a24b" roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Base */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.3, 0.15, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} />
            </mesh>
          </group>
        ) : (
          <group>
            {/* Animated Soccer Ball */}
            <mesh ref={ballRef} position={[0, 0.22, 0]} castShadow>
              <sphereGeometry args={[0.22, 24, 24]} />
              <meshStandardMaterial map={ballTexture} roughness={0.4} metalness={0.05} />
            </mesh>
            {/* Ball shadow */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.18, 16]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.18} />
            </mesh>
          </group>
        )}

        {/* 3D Goals */}
        <SoccerGoal position={[-30, 0.2, 0]} facing="inward-right" />
        <SoccerGoal position={[30, 0.2, 0]} facing="inward-left" />

        {/* Dynamic Lineup Layer showing Argentina vs France players */}
        <LineupLayer
          selectedPlayerId={selectedPlayerId}
          onSelectPlayer={onSelectPlayer}
          visualizationMode={visualizationMode}
          showTacticalZones={showTacticalZones}
          mentalidad={mentalidad}
          ritmo={ritmo}
          lineups={lineups}
        />
      </group>

      {/* STADIUM STANDS / SEATING BOWL (Elliptical layout) */}
      <group 
        scale={[1.38, 1.0, 1.0]}
        onClick={(e) => { e.stopPropagation(); onZoneClick('stands'); }}
      >
        <StandsGeometry
          standRings={standRings}
          standsTexture={standsTexture}
          homeColor={homeColor}
          homeStandsColor={homeStandsColor}
          awayStandsColor={awayStandsColor}
          activeZone={activeZone}
          reduceEffects={reduceEffects}
        />

        {/* Scrolling LED Ribbon Board */}
        <mesh position={[0, 3.65, 0]}>
          <cylinderGeometry args={[40.6, 40.6, 0.35, 64, 1, true]} />
          <meshStandardMaterial 
            map={ribbonTexture} 
            side={THREE.DoubleSide}
            roughness={0.1}
            metalness={0.8}
            emissive="#ffffff"
            emissiveMap={ribbonTexture}
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>

      {/* GIANT MATCH SCREENS (Sideline Jumbotrons - Fully integrated) */}
      <group 
        onClick={(e) => { e.stopPropagation(); onZoneClick('screens'); }}
      >
        {/* --- LEFT SIDE JUMBOTRON --- */}
        <group position={[0, 7.5, -43.2]} rotation={[0, 0, 0]}>
          {/* Heavy frame behind screen */}
          <mesh position={[0, 0, -0.2]} castShadow>
            <boxGeometry args={[22.6, 7.1, 1.2]} />
            <meshStandardMaterial color="#0b0f19" metalness={0.8} roughness={0.3} />
          </mesh>

          <mesh castShadow>
            <boxGeometry args={[22, 6.5, 0.4]} />
            <meshStandardMaterial color="#070a14" roughness={0.15} />
            
            {!reduceEffects && !isMobile && (
            <HtmlDrei 
              transform 
              distanceFactor={12} 
              position={[0, 0, 0.21]}
              occlude
            >
              <div className="glass-panel pulse-glow-border" style={{ 
                width: '195px', 
                height: '75px', 
                padding: '6px', 
                fontSize: '8px', 
                color: '#fff',
                background: 'rgba(7, 9, 19, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                border: activeZone === 'screens' ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '6px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2px' }}>
                  <span>{match.stadiumName}</span>
                  <span style={{ color: 'var(--accent-cyan)', animation: 'pulse-slow 1.5s infinite' }}>EN VIVO</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '3px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: homeColor }}>{match.teams.homeShort}</div>
                    <div style={{ fontSize: '14px', fontWeight: '900' }}>{match.score.home}</div>
                  </div>
                  <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>vs</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: awayColor }}>{match.teams.awayShort}</div>
                    <div style={{ fontSize: '14px', fontWeight: '900' }}>{match.score.away}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '5.5px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '1px' }}>
                  Modo de Prototipo Táctico
                </div>
              </div>
            </HtmlDrei>
            )}
          </mesh>
        </group>

        {/* --- RIGHT SIDE JUMBOTRON --- */}
        <group position={[0, 7.5, 43.2]} rotation={[0, Math.PI, 0]}>
          {/* Heavy frame behind screen */}
          <mesh position={[0, 0, -0.2]} castShadow>
            <boxGeometry args={[22.6, 7.1, 1.2]} />
            <meshStandardMaterial color="#0b0f19" metalness={0.8} roughness={0.3} />
          </mesh>

          <mesh castShadow>
            <boxGeometry args={[22, 6.5, 0.4]} />
            <meshStandardMaterial color="#070a14" roughness={0.15} />

            {!reduceEffects && !isMobile && (
            <HtmlDrei 
              transform 
              distanceFactor={12} 
              position={[0, 0, 0.21]}
              occlude
            >
              <div className="glass-panel" style={{ 
                width: '195px', 
                height: '75px', 
                padding: '6px', 
                fontSize: '7.5px', 
                color: '#fff',
                background: 'rgba(7, 9, 19, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                border: activeZone === 'screens' ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '6px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2px' }}>
                  <span>ANÁLISIS DE PARTIDO IA</span>
                  <span style={{ color: 'var(--accent-emerald)' }}>ACTIVO</span>
                </div>
                <div style={{ margin: '3px 0', fontSize: '6px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px' }}>
                    <span>Certeza de Predicción:</span>
                    <strong style={{ color: '#fff' }}>{match.analytics.confidence}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px' }}>
                    <span>Riesgo Táctico:</span>
                    <strong style={{ color: 'var(--accent-orange)' }}>{match.analytics.tacticalRisk}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Clima del Terreno:</span>
                    <strong style={{ color: '#fff' }}>
                      {weather === 'clear' ? 'Despejado' : weather === 'rain' ? 'Lluvia' : weather === 'snow' ? 'Nieve' : 'Niebla'}
                    </strong>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '6px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                  RADAR ESPACIAL CONECTADO
                </div>
              </div>
            </HtmlDrei>
            )}
          </mesh>
        </group>
      </group>

      {/* WEATHER EFFECTS */}
      {weather === 'rain' && (
        <points ref={weatherParticlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[rainPoints, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#93c5fd"
            size={0.12}
            transparent
            opacity={0.4}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      )}

      {weather === 'snow' && (
        <points ref={weatherParticlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[rainPoints, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ffffff"
            size={0.25}
            transparent
            opacity={0.6}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      )}

      {/* Elegant atmospheric specs for fog/warm sun */}
      {!reduceEffects && (weather === 'clear' || weather === 'fog') && (
        <SparklesDrei
          count={weather === 'fog' ? 400 : 100}
          scale={[80, 20, 50]}
          size={1.5}
          speed={0.3}
          opacity={weather === 'fog' ? 0.35 : 0.15}
          color={lighting.dirColor}
        />
      )}
    </>
  );
};

// Corner Floodlight Assembly Sub-component
interface CornerFloodlightProps {
  position: [number, number, number];
  color: string;
  beamTarget: [number, number, number];
  isActive: boolean;
  timeOfDay: 'day' | 'sunset' | 'night';
}

const CornerFloodlight: React.FC<CornerFloodlightProps> = ({ position, color, beamTarget, isActive, timeOfDay }) => {
  const [x, y, z] = position;
  
  return (
    <group position={[x, y, z]}>
      {/* Light Tower Stand */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.4, 15, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>

      {/* Light Array Head Frame */}
      <mesh position={[0, 7.5, 0]}>
        <boxGeometry args={[1.5, 1.0, 1.5]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Glowing Bulbs */}
      <mesh position={[0, 7.5, 0.4]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial
          color={isActive ? '#00f2fe' : timeOfDay === 'night' ? '#ffffff' : '#ffeedd'}
          emissive={timeOfDay === 'night' ? '#ffffff' : '#000000'}
          emissiveIntensity={timeOfDay === 'night' ? 2.0 : 0}
        />
      </mesh>

      {/* Bloom glow sphere around bulb (night only) */}
      {timeOfDay === 'night' && (
        <mesh position={[0, 7.5, 0.4]}>
          <sphereGeometry args={[1.2, 12, 12]} />
          <meshBasicMaterial color="#ffffee" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}

      {/* SpotLight projecting onto the field */}
      <spotLight
        position={[0, 7.5, 0]}
        target-position={beamTarget}
        intensity={3.8}
        distance={60}
        angle={Math.PI / 6}
        penumbra={0.6}
        color={color}
        castShadow
      />

      {/* Volumetric Beam Effect */}
      {!isActive && (
        <mesh position={[0, 3.5, 0]} rotation={[Math.PI / 10, 0, 0]}>
          <cylinderGeometry args={[0.6, 6.0, 8.0, 16, 1, true]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.06} 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

// SoccerGoal procedural grounded component with high-fidelity net textures
interface SoccerGoalProps {
  position: [number, number, number];
  facing: 'inward-right' | 'inward-left';
}

const SoccerGoal: React.FC<SoccerGoalProps> = ({ position, facing }) => {
  const [x, y, z] = position;
  const isFacingRight = facing === 'inward-right';
  const netDirection = isFacingRight ? -1 : 1;
  const postThickness = 0.12; // Thicker posts for maximum legibility
  const goalHeight = 3.2;
  const goalWidth = 8.0;
  const goalDepth = 2.4;

  // Procedural square soccer grid texture for the net
  const netTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      
      // Draw grid lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      
      // Border
      ctx.strokeRect(0, 0, 64, 64);
      
      // Inner grid lines
      ctx.beginPath();
      for (let i = 8; i < 64; i += 8) {
        ctx.moveTo(i, 0); ctx.lineTo(i, 64);
        ctx.moveTo(0, i); ctx.lineTo(64, i);
      }
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 8); // Denser, more realistic grid repeating
    return texture;
  }, []);

  return (
    <group position={[x, y, z]}>
      {/* Left Post */}
      <mesh position={[0, goalHeight / 2, -goalWidth / 2]} castShadow>
        <cylinderGeometry args={[postThickness, postThickness, goalHeight, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </mesh>

      {/* Right Post */}
      <mesh position={[0, goalHeight / 2, goalWidth / 2]} castShadow>
        <cylinderGeometry args={[postThickness, postThickness, goalHeight, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </mesh>

      {/* Crossbar */}
      <mesh position={[0, goalHeight, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[postThickness, postThickness, goalWidth, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
      </mesh>

      {/* Realistic Net (Square-grid procedural canvas mapped) */}
      <mesh position={[netDirection * goalDepth / 2, goalHeight / 2, 0]}>
        <boxGeometry args={[goalDepth, goalHeight, goalWidth]} />
        <meshStandardMaterial 
          map={netTexture}
          transparent 
          opacity={0.35}
          roughness={0.9}
          metalness={0.1}
          side={THREE.DoubleSide} 
          depthWrite={false}
        />
      </mesh>
      
      {/* Ground Support Bars */}
      {/* Left ground bar */}
      <mesh position={[netDirection * goalDepth / 2, 0.05, -goalWidth / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, goalDepth, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.05} />
      </mesh>
      {/* Right ground bar */}
      <mesh position={[netDirection * goalDepth / 2, 0.05, goalWidth / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, goalDepth, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.05} />
      </mesh>
      {/* Back ground bar */}
      <mesh position={[netDirection * goalDepth, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, goalWidth, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* Symmetrical Rear Goal Frame support bars */}
      <mesh position={[netDirection * goalDepth, goalHeight / 2, -goalWidth / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, goalHeight, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[netDirection * goalDepth, goalHeight / 2, goalWidth / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, goalHeight, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
      <mesh position={[netDirection * goalDepth, goalHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, goalWidth, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>
    </group>
  );
};



// Main Export Component exposing the Canvas and Controls
export const StadiumScene: React.FC<StadiumSceneContentProps> = (props) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 26, 44], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <StadiumSceneContent {...props} />
        
        {/* Controls mapping allowing navigation */}
        <OrbitControlsDrei
          makeDefault
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
          panSpeed={0.5}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0.15}
          minDistance={8}
          maxDistance={65}
          enablePan={true}
          maxAzimuthAngle={Infinity}
          minAzimuthAngle={-Infinity}
          target={[0, 0, 0]}
        />
      </Canvas>


      {/* Legend for Tactical Zones in Spanish */}
      {props.showTacticalZones && (
        <div 
          style={{ 
            position: 'absolute', 
            bottom: '14px', 
            left: '16px', 
            background: 'rgba(7, 9, 19, 0.75)', 
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px', 
            padding: '8px 12px',
            fontSize: '0.7rem',
            pointerEvents: 'none',
            color: 'var(--text-secondary)',
            zIndex: 10,
            maxWidth: '220px',
            lineHeight: '1.3'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: 'bold', color: '#fff' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-violet) 100%)' }}></span>
            Zonas de influencia
          </div>
          <div style={{ marginBottom: '6px' }}>
            Representan cobertura, presión o amenaza espacial del jugador seleccionado.
          </div>
          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', fontStyle: 'italic' }}>
            *Las zonas son simuladas para análisis táctico del prototipo.
          </div>
        </div>
      )}
    </div>
  );
};
