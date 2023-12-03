import { Footer } from 'src/components/Footer';

import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';
import { Projects } from './sections/Projects';
import { Stack } from './sections/Stack';
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';

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

const HomeScreen = () => {
  useEffect(() => {
    const element = document.getElementById('yoyo') as HTMLElement;
    if (element) {
      createRoot(document.getElementById('yoyo') as HTMLElement).render(
        <Canvas>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <Box position={[-1.2, 0, 0]} />
          <Box position={[1.2, 0, 0]} />
        </Canvas>,
      );
    }
  }, []);
  return (
    <>
      <div id='yoyo'></div>
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
