import { Footer } from 'src/components/Footer';

import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';
import { Projects } from './sections/Projects';
import { Stack } from './sections/Stack';
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);
  useFrame((state, delta) => (ref.current.rotation.x += delta));
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={event => click(!clicked)}
      onPointerOver={event => hover(true)}
      onPointerOut={event => hover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  );
}

function Jason(props: ThreeElements['mesh']) {
  const gltf = useLoader(GLTFLoader, './darkpear.gltf');
  return <primitive object={gltf.scene} {...props} />;
}

const HomeScreen = () => {
  return (
    <>
      <div>
        <Canvas>
          <ambientLight intensity={0.1} />
          <Jason />
        </Canvas>
      </div>
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
