import React from 'react';

// Pitch standard line markings (professional precise soccer markings)
export const PitchGeometry: React.FC = () => {
  return (
    <group position={[0, 0.21, 0]}>
      {/* Outer Border Lines (Consistent thick meshes instead of 1px wireframe) */}
      <mesh position={[-30, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <mesh position={[30, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0.005, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60.15, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0.005, 20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60.15, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Halfway Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Center Circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.85, 6.0, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Center Spot */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* --- LEFT END MARKINGS --- */}
      {/* Penalty Box Front (16.5m line) */}
      <mesh position={[-20, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      {/* Penalty Box Sides */}
      <mesh position={[-25, 0.005, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <mesh position={[-25, 0.005, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      
      {/* Goal Box Front (5.5m line) */}
      <mesh position={[-26.5, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      {/* Goal Box Sides */}
      <mesh position={[-28.25, 0.005, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <mesh position={[-28.25, 0.005, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Penalty Spot */}
      <mesh position={[-21, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Penalty Arc (D-Arc) */}
      <mesh position={[-21, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.9, 5.0, 32, 1, -Math.PI / 3.4, Math.PI / 1.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>


      {/* --- RIGHT END MARKINGS --- */}
      {/* Penalty Box Front (16.5m line) */}
      <mesh position={[20, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      {/* Penalty Box Sides */}
      <mesh position={[25, 0.005, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <mesh position={[25, 0.005, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Goal Box Front (5.5m line) */}
      <mesh position={[26.5, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      {/* Goal Box Sides */}
      <mesh position={[28.25, 0.005, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <mesh position={[28.25, 0.005, -5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 0.15]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Penalty Spot */}
      <mesh position={[21, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>

      {/* Penalty Arc (D-Arc) */}
      <mesh position={[21, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.9, 5.0, 32, 1, Math.PI - Math.PI / 3.4, Math.PI / 1.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
    </group>
  );
};
