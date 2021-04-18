import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';
import { Projects } from './sections/Projects';

const HomeScreen = () => {
    return (
        <>
            <MainBanner />
            <AboutMe />
            <Jobs />
            <Projects />
        </>
    );
};

export { HomeScreen };
