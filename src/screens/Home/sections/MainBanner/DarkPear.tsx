import {
  useGLTF,
  OrbitControls,
  OrbitControlsChangeEvent,
} from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import { DirectionalLight, Group } from 'three';
import { Mesh } from 'three';

const getGeometry = (model: unknown) => {
  if (model instanceof Mesh) {
    return model.geometry;
  }
  return undefined;
};

const Model = () => {
  const groupRef = useRef<Group>(null);
  const { nodes, materials } = useGLTF('/darkpear.gltf');

  useFrame((_state, delta) => {
    if (groupRef?.current) {
      groupRef.current.rotation.y += delta;
    }
  });

  return (
    <group ref={groupRef} dispose={null} scale={1.2}>
      <mesh
        castShadow
        receiveShadow
        geometry={getGeometry(nodes.Body)}
        material={materials['Pear Body Material']}
        position={[0.058, -0.951, -0.282]}
        scale={1.247}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={getGeometry(nodes.Leaf)}
        material={materials['Material.002']}
        position={[0, 0, 3.229]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={getGeometry(nodes.Stem)}
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
        // to the camera. This is necessary otherwise rotating the pear ends up
        // making the model super dark.
        directionalLightRef.current.position.set(0, 1, 0);
        directionalLightRef.current.position.add(camera.position);
      }
    },
    [],
  );

  return (
    <Canvas style={{ width: '100%', height: '100%' }}>
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
