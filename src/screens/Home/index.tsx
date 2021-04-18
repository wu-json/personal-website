import { AboutMe } from './sections/AboutMe';
import { Jobs } from './sections/Jobs';
import { MainBanner } from './sections/MainBanner';

const HomeScreen = () => {
    return (
        <>
            <MainBanner />
            <AboutMe />
            <Jobs />
        </>
    );
};

export { HomeScreen };
