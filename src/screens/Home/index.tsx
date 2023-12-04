import { Footer } from 'src/components/Footer';

import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';
import { Projects } from './sections/Projects';
import { Stack } from './sections/Stack';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  Environment,
  PerspectiveCamera,
  OrbitControls,
} from '@react-three/drei';
import { PointLight } from 'three';

function Model(props: any) {
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
}

useGLTF.preload('/darkpear.gltf');

const HomeScreen = () => {
  return (
    <>
      <Canvas style={{ height: 400 }}>
        <directionalLight position={[0, 0, 2]} intensity={2} />
        <ambientLight intensity={0.4} />
        <Model />
        <OrbitControls enableZoom={false} />
      </Canvas>
      <MainBanner />
      <AboutMe />
      <Jobs />
      <Projects />
      <Stack />
      <Footer />
    </>
  );
};

export { HomeScreen };
