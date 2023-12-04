import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DirectionalLight } from 'three';
import { useGLTF, OrbitControls } from '@react-three/drei';

const Model = (props: any) => {
  const groupRef = useRef();
  const { nodes, materials } = useGLTF('/darkpear.gltf');
  useFrame((state, delta) => ((groupRef as any).current.rotation.y += delta));
  return (
    <group ref={groupRef} {...props} dispose={null} scale={1}>
      <mesh
        castShadow
        receiveShadow
        geometry={(nodes.Body as any).geometry}
        material={materials['Pear Body Material']}
        position={[0.058, -0.951, -0.282]}
        scale={1.247}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={(nodes.Leaf as any).geometry}
        material={materials['Material.002']}
        position={[0, 0, 3.229]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={(nodes.Stem as any).geometry}
        material={materials['Material.002']}
        position={[0.058, -0.951, -0.282]}
        scale={1.247}
      />
    </group>
  );
};

export const DarkPear = () => {
  const directionalLightRef = useRef<DirectionalLight>(null);
  return (
    <Canvas style={{ height: 400 }}>
      <directionalLight
        position={[0, 0, 2]}
        intensity={2}
        ref={directionalLightRef}
      />
      <ambientLight intensity={0.4} />
      <Model />
      <OrbitControls
        enableZoom={false}
        onChange={e => {
          if (!e) return;
          const camera = e.target.object;

          if (directionalLightRef.current) {
            // This sets the point light to a location above your camera
            // Note that this position is in world space, not relative to
            // the camera
            directionalLightRef.current.position.set(0, 1, 0);
            directionalLightRef.current.position.add(camera.position);
          }
        }}
      />
    </Canvas>
  );
};
