import { Footer } from 'src/components/Footer';

import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';
import { Projects } from './sections/Projects';
import { Stack } from './sections/Stack';

const HomeScreen = () => (
  <>
    <MainBanner />
    <AboutMe />
    <Jobs />
    <Projects />
    <Stack />
    <Footer />
  </>
);

export { HomeScreen };
