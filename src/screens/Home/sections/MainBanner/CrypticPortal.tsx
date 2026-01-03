import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Mesh } from 'three';

const CrypticGeometry = () => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Slow rotation on multiple axes
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.2;

      // Breathing animation - subtle scale pulsing
      const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.05 + 1.0;
      meshRef.current.scale.setScalar(breathe);
    }
  });

  const handleClick = () => {
    window.location.href = 'https://github.com/wu-json';
  };

  return (
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <octahedronGeometry args={[2, 0]} />
      <meshStandardMaterial
        color={hovered ? "#c0c0c0" : "#404040"}
        metalness={0.9}
        roughness={0.1}
        emissive={hovered ? "#808080" : "#202020"}
        emissiveIntensity={hovered ? 0.6 : 0.3}
      />
    </mesh>
  );
};

export const CrypticPortal = () => (
  <Canvas style={{ width: '100%', height: '100%', cursor: 'pointer' }}>
    <ambientLight intensity={0.5} />
    <directionalLight position={[5, 5, 5]} intensity={3} />
    <pointLight position={[0, 0, 10]} intensity={1.5} />
    <spotLight position={[0, 10, 0]} intensity={2} angle={0.3} penumbra={1} />
    <CrypticGeometry />
  </Canvas>
);
