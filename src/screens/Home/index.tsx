import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';
import { Projects } from './sections/Projects';
import { Stack } from './sections/Stack';

const HomeScreen = () => {
    return (
        <>
            <MainBanner />
            <AboutMe />
            <Jobs />
            <Projects />
            <Stack />
        </>
    );
};

export { HomeScreen };
