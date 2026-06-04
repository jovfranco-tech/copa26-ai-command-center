import * as THREE from 'three';
import { Sparkles as SparklesDrei } from '@react-three/drei';

interface StandRing {
  radius: number;
  height: number;
  y: number;
  color: string;
}

interface StandsGeometryProps {
  standRings: StandRing[];
  standsTexture: THREE.Texture;
  homeColor: string;
  homeStandsColor: string;
  awayStandsColor: string;
  activeZone: string;
  reduceEffects: boolean;
}

export function StandsGeometry({
  standRings,
  standsTexture,
  homeColor,
  homeStandsColor,
  awayStandsColor,
  activeZone,
  reduceEffects,
}: StandsGeometryProps) {
  return (
    <group>
      {/* 3 Concentric Stand Rings */}
      {standRings.map((ring, idx) => (
        <mesh
          key={idx}
          position={[0, ring.y, 0]}
          receiveShadow={!reduceEffects}
          castShadow={!reduceEffects}
        >
          <cylinderGeometry
            args={[ring.radius + 1.5, ring.radius, ring.height, 40, 1, true]}
          />
          <meshStandardMaterial
            map={standsTexture}
            color={activeZone === 'stands' ? 'var(--accent-cyan)' : ring.color}
            roughness={0.7}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
            wireframe={activeZone === 'stands'}
          />
        </mesh>
      ))}

      {/* Glowing roof ring girder */}
      <mesh position={[0, 9, 0]}>
        <torusGeometry args={[44, 0.8, 8, 48]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.2}
          emissive={activeZone === 'stands' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.01)'}
          emissiveIntensity={1}
        />
      </mesh>

      {/* Techumbre elíptica / Canopy (Phase 4) */}
      <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[38, 46, 64]} />
        <meshStandardMaterial
          color="#111625"
          roughness={0.3}
          metalness={0.8}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Central Spotlight Array - 32 Focos perimetrales (Phase 4) */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        const rx = 37.8 * Math.cos(angle);
        const rz = 37.8 * Math.sin(angle);
        return (
          <mesh key={`spotlight-${i}`} position={[rx, 9.6, rz]}>
            <sphereGeometry args={[0.3, 12, 12]} />
            <meshBasicMaterial color="#e0f2fe" />
          </mesh>
        );
      })}

      {/* 16 Columnas estructurales de soporte (Phase 4) */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const rx = 46.1 * Math.cos(angle);
        const rz = 46.1 * Math.sin(angle);
        return (
          <mesh key={`column-${i}`} position={[rx, 4.5, rz]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.8, 13, 1.2]} />
            <meshStandardMaterial
              color="#1e293b"
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>
        );
      })}

      {/* Glowing neon roof ring */}
      <mesh position={[0, 9.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[43.5, 43.7, 64]} />
        <meshBasicMaterial
          color="var(--accent-cyan)"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing neon bottom perimeter ring (Sync with Home Team Color) */}
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[35.2, 35.4, 64]} />
        <meshBasicMaterial
          color={homeColor}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Stadium Outer Facade Bowl Shell */}
      <mesh position={[0, 4.5, 0]}>
        <cylinderGeometry args={[46, 45, 13, 48, 1, true]} />
        <meshStandardMaterial
          color="#0b0f19"
          roughness={0.8}
          metalness={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Seating Crowd Glowing Sparkles (consolidated: 2 instances instead of 4) */}
      {!reduceEffects && (
        <>
          <SparklesDrei
            count={250}
            scale={[40, 5, 30]}
            position={[0, 7, -12]}
            size={1.1}
            speed={0.35}
            color={homeStandsColor}
            opacity={0.6}
          />
          <SparklesDrei
            count={250}
            scale={[40, 5, 30]}
            position={[0, 7, 12]}
            size={1.1}
            speed={0.35}
            color={awayStandsColor}
            opacity={0.6}
          />
        </>
      )}

      {/* 12 Concrete Stand Dividers (Aisles) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const rx = 39 * Math.cos(angle);
        const rz = 39 * Math.sin(angle);
        return (
          <mesh
            key={`divider-${i}`}
            position={[rx, 3.0, rz]}
            rotation={[0, -angle, 0]}
            castShadow={!reduceEffects}
            receiveShadow={!reduceEffects}
          >
            <boxGeometry args={[0.4, 6.1, 8.2]} />
            <meshStandardMaterial color="#080c16" roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}
