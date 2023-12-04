import { Footer } from 'src/components/Footer';

import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';
import { Projects } from './sections/Projects';
import { Stack } from './sections/Stack';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, PerspectiveCamera } from '@react-three/drei';

function Model(props: any) {
  const groupRef = useRef();
  const { nodes, materials } = useGLTF('/darkpear.gltf');
  useFrame((state, delta) => ((groupRef as any).current.rotation.y += delta));
  console.log(nodes.Body);
  return (
    <group ref={groupRef} {...props} dispose={null}>
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
      <Canvas>
        <directionalLight position={[10, 10, 5]} intensity={9} />
        <Model />
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
