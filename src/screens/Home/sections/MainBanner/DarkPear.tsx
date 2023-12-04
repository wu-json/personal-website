import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import { DirectionalLight } from 'three';
import {
  useGLTF,
  OrbitControls,
  OrbitControlsChangeEvent,
} from '@react-three/drei';

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
  const onOrbitControlsChanged = useCallback(
    (e: OrbitControlsChangeEvent | undefined) => {
      if (!e) return;
      const camera = e.target.object;
      if (directionalLightRef.current) {
        // This keeps the directional light in the same position with respect
        // to the camera.
        directionalLightRef.current.position.set(0, 1, 0);
        directionalLightRef.current.position.add(camera.position);
      }
    },
    [],
  );

  return (
    <Canvas style={{ height: 400 }}>
      <directionalLight
        position={[0, 0, 2]}
        intensity={2}
        ref={directionalLightRef}
      />
      <ambientLight intensity={0.4} />
      <Model />
      <OrbitControls enableZoom={false} onChange={onOrbitControlsChanged} />
    </Canvas>
  );
};
